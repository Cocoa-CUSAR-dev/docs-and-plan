---
title: chatbot
---

# chatbot CI/CD

Stack: Python (LINE chatbot service). Workflow lives in `chatbot/.github/workflows/`. **No `cd.yml` exists in this repo** — only CI is defined.

## CI (`ci.yml`)

- **Triggers:** push (all branches, unfiltered) and pull_request. Header comment notes the `test` job always runs the full suite under `tests/`, not path-filtered or limited to what changed.
- **No concurrency group defined.**

**Jobs (all Python 3.12, `pip install -e ".[dev]"`):**

1. **lint** — `ruff check src tests`, `ruff format --check src tests`.
2. **typecheck** — `mypy src`.
3. **test** — `pytest tests/ -v`, using dummy env vars (`DATABASE_URL`, `KOTLIN_BACKEND_URL`, `GO_BACKEND_URL`, `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`) since the tests only need `Settings()` to construct without error at import time — no real DB/LINE/LLM calls.
4. **build** (needs `[lint, typecheck, test]`) — `docker build -t cocoa-chatbot:${{ github.sha }} .` (build-only, no push).

## CD

Not present. The `build` job builds a local Docker image tagged with the commit SHA but doesn't push it anywhere (no registry login, no GHCR step) — so there's no actual deployment/publish step in this repo yet.

## Notes

- Like `web-backend` and `database`, this repo has CI but no CD workflow — three of the six repos currently lack a deploy/publish pipeline.
- `build` job silently discards the built image (no push), so it currently only serves as a "does the Dockerfile build" check rather than a real CD step.
