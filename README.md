# TrendPilot

Research agent for a company in Taraz. It searches public web pages, opens them, and files bets. There is no UI in this repo on purpose.

The agent uses the xAI login already stored by Pi on this PC (`grok-4.7` plus live web search). It does not email or message anyone.

## Run one company

```bash
uv run trendpilot run examples/company.json
uv run trendpilot run examples/company.json --question "One local bet only."
```

Trace lines go to stderr. Findings JSON goes to stdout. On Windows, pass `--out findings.json` if the console still mangles Cyrillic.

`examples/last-run.json` is one real captured run, not a template.

```bash
uv run trendpilot profiles
uv run trendpilot serve
```

`serve` listens on `http://127.0.0.1:8787`.

- `GET /health`
- `POST /research` with `{"company": {...}, "question": "optional"}`
- Response is newline-delimited JSON events. The last event has `"kind": "done"` and `payload.findings`.

If Pi is not logged in to xAI, set `XAI_API_KEY`. Optional model override: `TRENDPILOT_MODEL`.

## Contract for a separate UI

Do not reimplement the agent. Call `trendpilot.run` or `POST /research`.

Company fields: `name`, `industry`, `size` (`micro|small|mid|large`), `city`, `offer`, `customer`, `channel`, `constraint`, `competitors`, `language` (`Russian|Kazakh|English`).

Findings:

```json
{
  "headline": "",
  "market_read": "",
  "bets": [
    {
      "title": "",
      "status": "act | watch | not_local | unknown | do_nothing",
      "claim": "",
      "evidence": [{ "url": "", "what_it_shows": "" }],
      "relevance": "",
      "cost": "",
      "benefit": "",
      "test": "",
      "kill_line": ""
    }
  ]
}
```

Event kinds while it works: `status`, `search`, `fetch`, `findings`, `note`, `error`, `done`.

Demo profiles are fictional. They are not clients.
