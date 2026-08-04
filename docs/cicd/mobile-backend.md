---
title: mobile-backend
---

# mobile-backend CI/CD

Stack: Go (Gin), go.mod-based module. Workflows live in `mobile-backend/.github/workflows/`.

## CI (`ci.yml`)

- **Triggers:** push and pull_request on all branches (`**`).
- **Concurrency:** cancels in-progress runs for the same branch/ref.
- **Permissions:** `contents: read`.

**Jobs (run in parallel):**

1. **lint** — `golangci-lint` via `golangci-lint-action@v6`, Go 1.26, installed from source (`install-mode: goinstall`) so the linter matches the runner's Go toolchain. `only-new-issues: true` so pre-existing lint debt in `internal/handlers/*_test.go` (intentional panic-recover smoke tests) doesn't fail the build.
2. **test** — `go mod verify` → `go vet ./...` → `go build ./...` → `go test -race -coverprofile=coverage.out -covermode=atomic ./... -v`, then prints a coverage summary (total + per-package) and uploads `coverage.out` as an artifact (`coverage-report`, 14-day retention). Also sets up Node 24, though the JS stub test invocation is currently commented out.

## CD (`cd.yml`)

- **Triggers:** push on all branches, tags matching `v*`, and manual `workflow_dispatch`.
- **Concurrency:** same cancel-in-progress-per-ref pattern as CI.
- **Permissions:** `contents: read`, `packages: write`.

**Jobs:**

1. **test** — re-runs the same vet/build/race-test sequence as CI before allowing a deploy, uploads coverage as `cd-coverage-report`.
2. **build-and-push** (needs `test`) — logs into GHCR (`ghcr.io`) using `GITHUB_TOKEN`, derives tags via `docker/metadata-action@v5` (branch ref, tag ref, sha, and `latest` on the default branch), then builds and pushes the image from the repo's `Dockerfile` with `docker/build-push-action@v6`.

## Notes

- CD runs on every branch push (not just main), so every push builds/tests; only the image push step is gated by passing `test`.
- No explicit deploy-to-environment step — this pipeline stops at publishing the container image to GHCR.
