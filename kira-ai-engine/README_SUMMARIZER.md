Usage
-----

1. Ensure environment variables are set (example `.env`):

   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   HF_TOKEN=<your_hf_token>

2. Install dependencies (from `kira-ai-engine`):

```bash
pip install -r requirements.txt
```

3. Run the summarizer for a company UUID:

```bash
python summarizer.py <company-uuid> --limit 10
```

The script will print an Indonesian summary of recent asset aggregates.

Notes
-----
- The script reads aggregated maintenance records from `asset_prediction_history`.
- Adjust the prompt in `summarizer.py` if you want different output style or language.
