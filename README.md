This is a Next.js stock tracker for SEC 13F filings and congressional trades.

## Environment

- `SEC_USER_AGENT` is required for SEC requests.
- `ENABLE_AI_ANALYSIS=false` disables the Ollama-backed AI panel.
- Set `ENABLE_AI_ANALYSIS=true` later to re-enable it.

```bash
export SEC_USER_AGENT="stock-tracker/1.0 (your-email@example.com)"
export ENABLE_AI_ANALYSIS=false
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Railway note

If you deployed an Ollama service on Railway, disabling the feature flag in the app stops the UI and API from using it, but the separate Ollama service can still consume RAM and incur cost while running. Scale that service down or remove it in Railway to actually stop the memory spend.

## Re-enable later

```bash
export ENABLE_AI_ANALYSIS=true
```
