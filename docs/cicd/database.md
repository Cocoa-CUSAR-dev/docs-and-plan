---
title: database
---

# database CI/CD

Stack: SQL migrations (Flyway), PostGIS. Workflow lives in `database/.github/workflows/`. **Naming differs from the other repos**: there is no `ci.yml`/`cd.yml` — instead a single workflow, `migrate-check.yml`.

## `migrate-check.yml` ("Verify migrations")

- **Triggers:** pull_request and push to `main`, both scoped to `paths: migrations/**` only (doesn't run on unrelated changes).

**Job: `migrate-check`**
- Spins up a `postgis/postgis:17-3.5` service container (db `cocoa_test`, user/password `test`).
- Runs the **full** Flyway migration chain (V1, V2, ...) from scratch against a brand-new database using `flyway/flyway:10-alpine` in Docker (`--network host`, mounting `migrations/` into `/flyway/sql`) — not just the migrations changed in the PR.
- Comment in the file notes this is specifically designed to catch the class of bug where a migration file is truncated/corrupted and the schema can't be rebuilt from scratch (referenced as issue "DB-1").

## CD

None. No deployment workflow exists for the database repo — migrations are presumably applied out-of-band (e.g., manually or via another service's deploy step) rather than through GitHub Actions here.

## Notes

- This is the only one of the six repos where the CI workflow is path-filtered rather than running on every push/PR.
- No `ci.yml`/`cd.yml` naming convention here — flagged in case the CI/CD docs structure expects consistent filenames across repos.
