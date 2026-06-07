# Load/stress testing — kira-ai-engine

Targets `/predict` and `/summarize` (the NLP-generate pipeline). Locust drives
HTTP load against a real running AI engine; the only thing mocked is the
HuggingFace Router LLM call, via a small local stub server — this keeps runs
deterministic, free, and not bottlenecked by a third party's latency, while
still exercising the *real* DB query, NLP pipeline, prompt-building, and
retry/fallback logic end to end.

## 1. Setup

### a. Start the stub HF Router

```
kira-ai-engine\venv\Scripts\python.exe -m uvicorn loadtest.stub_hf_server:app --port 8090
```

Optional env vars to shape its behavior:

| Var | Default | Effect |
|---|---|---|
| `STUB_LLM_LATENCY_MS` | `800` | Artificial per-request delay (simulates real LLM latency) |
| `STUB_LLM_FAILURE_RATE` | `0.0` | Probability (0.0-1.0) a request gets a 503 — use this to provoke the 4-candidate fallback under load |

### b. Start the AI engine pointed at the stub

```
set HF_ROUTER_URL=http://localhost:8090/v1/chat/completions
set HF_TOKEN=dummy-token-for-loadtest
set DATABASE_URL=<your seeded test Postgres URL>
kira-ai-engine\venv\Scripts\python.exe -m uvicorn app:app --port 8000
```

`HF_ROUTER_URL` is read at import time in `summarizer.py` (defaults to the
real router URL — overriding it here doesn't touch production behavior).

### c. Seed the database

Reuse the existing seed: `npx prisma db seed` from `kira-backend/` (or
`npm run --prefix kira-backend db:seed` if that script exists). The locustfile
defaults to the seed's main company id
(`c0a80101-1234-4567-89ab-cdef12345678` — see `seed.ts`'s `mainCompanyId`).
**Don't mock `fetch_asset_aggregates`** for these runs — DB query latency is
part of the realistic `/summarize` critical path you want to measure.

### d. Run Locust

```
kira-ai-engine\venv\Scripts\python.exe -m locust -f loadtest/locustfile.py --host http://localhost:8000
```

Open http://localhost:8089, configure user count / spawn rate, and start.

## 2. Scenarios (`locustfile.py`)

- **`PredictUser`** (weight 3, wait 1-3s): POSTs `/predict` with a handful of
  representative `AssetInput` payloads (varied brand/category/historical-maintenance
  figures so nothing is trivially identical). Fails on 503/4xx or a missing
  `predicted_rul`.
- **`SummarizeUser`** (weight 1, wait 3-8s — "generate" is a heavier, sparser
  action): POSTs `/summarize` against the seeded company, mostly with default
  params and occasionally varying `limit` (1/10/50) to see how row count affects
  latency. Uses a **270s client timeout** — comfortably above the documented
  worst case of 4 candidates x 60s timeout = ~240s.
- **`SummarizeBurstUser`** (weight 0 by default — opt in by editing its `weight`):
  fires `/summarize` back-to-back with little wait, to stress the 4-candidate
  retry loop under concurrency. Useful for a dedicated "what happens if many
  generate requests land at once" run, separate from the steady-state baseline.

## 3. Metrics to watch

| Metric | What to look for |
|---|---|
| p50/p95/p99 `/predict` | Should stay low — single-row sklearn `.predict()` is CPU-bound and cheap |
| p50/p95/p99 `/summarize` | Dominated by DB query + LLM round-trip(s); the metric most likely to blow up |
| Error rate | `/predict` should be ~0%; for `/summarize`, distinguish "graceful fallback" (200 with a rule-based summary) from actual 5xx |
| **Fallback-trigger rate** | % of `/summarize` 200s whose `summary` matches `_rule_based_summary` markers (`"terpantau baik"`, `"di bawah 365 hari"`, `"Tidak ada data aset untuk diringkas"` — see `_FALLBACK_MARKERS` in the locustfile). Both `SummarizeUser` and `SummarizeBurstUser` mark these as `success()` (they're a graceful degradation, not a failure) — eyeball the response bodies or add a custom Locust stat to count them, since a high rate at low `STUB_LLM_FAILURE_RATE` would indicate a real engine-side problem |
| **Cross-endpoint interference** | `summarize_company_assets`/`fetch_asset_aggregates` run synchronously inside `async def summarize` — they can starve the event loop. **Run `PredictUser` and `SummarizeUser` concurrently and watch whether `/predict` p95 degrades** when `/summarize` is under load. If it does, that's evidence `run_in_threadpool` (the pattern already used for the retrain job in `app.py`) is needed here too |
| DB connections | `fetch_asset_aggregates` opens a fresh `psycopg2.connect()` per call (no pooling) — watch Postgres `pg_stat_activity` / `max_connections` under sustained `/summarize` load |

## 4. Suggested run progression

1. **Smoke** — 1-5 users, spawn rate 1/s, ~2 minutes. Just confirm the harness,
   stub server, and seeded DB are wired up correctly.
2. **Baseline** — 10-20 users (the default 3:1 predict:summarize weighting
   approximates this), spawn rate 2/s, 5-10 minutes. Record p95/error-rate as
   your reference numbers.
3. **Stress ramp** — step up 20 → 50 → 100 users, watch for the latency/error
   inflection point — that's the practical capacity ceiling.
4. **Soak** (optional, later) — ~20 users for 30-60 minutes, watching for DB
   connection leaks or memory growth.

Record the stub's `STUB_LLM_LATENCY_MS`/`STUB_LLM_FAILURE_RATE` and the user
counts/durations alongside whatever numbers you collect, so runs stay
reproducible and comparable over time.
