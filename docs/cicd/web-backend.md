---
title: web-backend
---

# web-backend CI/CD

Stack: Kotlin/Spring (Gradle, jOOQ), JDK 21. Workflows live in `web-backend/.github/workflows/`. **No `cd.yml` exists in this repo** — only CI is defined.

## CI (`ci.yml`)

- **Triggers:** push and pull_request on all branches (`**`).
- **No concurrency group defined.**

**Jobs:**

1. **lint** — JDK 21 (Temurin) + Gradle setup (`gradle/actions/setup-gradle@v4`, read-only cache off `main`), `./gradlew ktlintCheck --no-daemon`.
2. **test** — spins up a `postgres:16-alpine` service container (db `cocoa_test`) for the jOOQ codegen (`generateJooq`) to run against; waits for Postgres readiness, loads `src/test/resources/ci-schema.sql` (a pared-down schema mirroring only what production code imports), then `./gradlew test --no-daemon`. Uploads test reports on failure.
3. **build** (needs `[lint, test]`) — repeats the same Postgres service + schema init, then `./gradlew build --no-daemon` (compile + test + jar), uploads `build/libs/cocoa.jar` as artifact `cocoa-jar` (ignored if missing).

## CD

Not present. This repo currently has no deployment/image-publishing workflow — the `build` job produces a jar artifact but nothing packages or ships it further (no Docker build/push, no GHCR step).

## Notes

- Postgres service setup and schema init are duplicated between `test` and `build` jobs rather than shared.
- This is the only repo among the six without a `cd.yml`, alongside `database` and `chatbot` (see their respective docs) — worth flagging if a deploy pipeline is expected for the backend service.
