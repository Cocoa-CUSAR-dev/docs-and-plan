---
title: web-app
---

# web-app CI/CD

Stack: Next.js + pnpm. Workflows live in `web-app/.github/workflows/`.

## CI (`ci.yml`)

- **Triggers:** push and pull_request on all branches (`**`).
- **Concurrency:** cancels in-progress runs for the same branch/ref.

**Jobs:**

1. **lint** — pnpm (via `pnpm/action-setup@v4`), Node 24 with pnpm cache, `pnpm install --frozen-lockfile`, then `pnpm run qc:lint` (ESLint) and `pnpm run qc:format` (Prettier check).
2. **test** (needs `lint`) — Playwright end-to-end tests: install deps, `pnpm build` (Next.js production build), `pnpm exec playwright install --with-deps chromium`, `pnpm exec playwright test`. On failure, uploads `playwright-report/` as an artifact (7-day retention).

## CD (`cd.yml`)

- **Triggers:** push on all branches, manual `workflow_dispatch`.
- **Concurrency:** cancels in-progress runs for the same branch/ref.

**Job: `build-and-push-image`**
- `permissions: contents: read, packages: write`
- Docker Buildx setup, login to GHCR with `GITHUB_TOKEN`
- `docker/metadata-action@v5` tags: branch ref, sha, `latest` on default branch
- `docker/build-push-action@v6` builds from `./Dockerfile` and pushes, with GHA cache (`cache-from`/`cache-to: type=gha`)

## Notes

- CD has no explicit `test`/build-verification job of its own (unlike mobile-backend's CD) — it relies on CI having already run lint/Playwright on the same push; there's no `needs`/gate linking the two workflows, so a broken build could in theory still be pushed as an image if CI is still running or was skipped.
- Uses GHA-native Docker layer caching (`type=gha`), differing from mobile-backend's CD which doesn't cache Docker layers.
