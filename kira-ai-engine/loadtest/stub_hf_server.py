"""
Minimal stand-in for the HuggingFace Router chat-completions API
(https://router.huggingface.co/v1/chat/completions), used during load testing
so `/summarize` runs can exercise the full NLP pipeline without burning real
HF quota or being bottlenecked by a third-party service's latency.

Point the AI engine at this server via:
    HF_ROUTER_URL=http://localhost:8090/v1/chat/completions
    HF_TOKEN=dummy-token-for-loadtest

Two env vars shape its behavior so you can probe `summarize_company_assets`'s
retry/fallback loop under load:
    STUB_LLM_LATENCY_MS    artificial per-request delay, default 800
    STUB_LLM_FAILURE_RATE  0.0-1.0 chance a request gets a 503, default 0.0

Run with: uvicorn loadtest.stub_hf_server:app --port 8090
"""
import os
import random
import time

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="Stub HuggingFace Router")

LATENCY_MS = float(os.getenv("STUB_LLM_LATENCY_MS", "800"))
FAILURE_RATE = float(os.getenv("STUB_LLM_FAILURE_RATE", "0.0"))

_FAKE_SUMMARY = (
    "Sebagian besar aset terpantau dalam kondisi baik. Beberapa unit AC dan genset "
    "memerlukan perhatian dalam waktu dekat karena perkiraan sisa umur pakai yang menipis."
)


@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    time.sleep(LATENCY_MS / 1000.0)

    if random.random() < FAILURE_RATE:
        return JSONResponse(status_code=503, content={"error": "stub: simulated overload"})

    body = await request.json()
    model = body.get("model", "stub-model")
    return {
        "id": "stub-completion",
        "object": "chat.completion",
        "model": model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": _FAKE_SUMMARY},
                "finish_reason": "stop",
            }
        ],
    }


@app.get("/")
def health():
    return {"status": "ok", "latency_ms": LATENCY_MS, "failure_rate": FAILURE_RATE}
