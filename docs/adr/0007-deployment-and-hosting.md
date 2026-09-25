---
sidebar_position: 7
title: "ADR 0007: Deployment, CI/CD & Hosting"
---

# ADR 0007: Deployment, CI/CD & Hosting

## Submitters

* _[Your name]_ (Is Thai Cacao Capstone Team)

## Change Log

* [approved](/docs/plans/architecture-session-notes#deploy-ops) 2026-07-27 — CI/CD tooling only
* **resolved 2026-09-25 — hosting target confirmed: Render.** mobile-backend, web-backend, web-app, and chatbot are all deployed on Render. This entry replaces the earlier "pending" status below, which was stale (the team had already settled on Render before this doc was corrected).
* ~~[pending](/docs/plans/architecture-session-notes#open-items) — hosting target for the chatbot service (and possibly the existing Go/Kotlin backends)~~ superseded by the entry above.

## Referenced Use Case(s)

* All EPICs — this affects where every new and existing service actually runs.

## Context

The existing system has no CI/CD at all (`X-1` in the Phase 0 register — nothing builds, tests, or validates any of the four codebases automatically). A new chatbot service adds a fifth codebase that needs the same treatment. Separately, the original plan assumed the new chatbot service would deploy onto "the existing 3-VM AWS setup" the old team was running — that assumption turned out to be false: **there is no AWS account being handed over from the old team.** The database is unaffected (the team already independently runs it on their own NeonDB account).

**Update 2026-09-25:** the hosting question below is resolved — the team moved to **Render** for the deployed backend/web services. `mobile-backend` and `web-backend` were the first two confirmed there (`mobile-backend/render.yaml`, and `web-backend`'s CD workflow is gated on Render's own "Auto-Deploy: After CI Checks Pass" setting); `web-app` and `chatbot` are now deployed there too. `mobile-app` is a client (ships as APK/iOS builds, not a hosted service) and `database` stays on the team's own NeonDB account, so neither is part of this hosting decision. The rest of this document is kept as-is below for historical context on how the decision was reached; see the Decision section for the current state.

## Proposed Design

**Services/modules impacted:** potentially all five repos, depending on how the hosting question resolves — if the *existing* Go/Kotlin hosting also turns out to be tied to the old team's AWS account, this isn't scoped to just the new chatbot service.

**New services/modules:** none — this ADR is about where things run, not what runs.

**Model/DTO impact:** none.

**API impact:** none.

**Config/devops impact:** the entire point of this ADR. GitHub Actions pipelines (lint → type-check → test → build → deploy) are confirmed as the CI/CD tool; the deploy target those pipelines push to is unresolved.

## Considerations

**CI/CD tool — GitHub Actions (chosen, confirmed already in use by the team).** A teammate already uses GitHub Actions elsewhere; the new chatbot repo mirrors the same pipeline pattern rather than introducing a second CI tool. Low-risk, no real alternative considered given it's already a team-familiar tool.

**Hosting target — originally assumed: the existing 3-VM AWS setup (invalidated), now resolved: Render.** The AWS assumption was invalidated when the team confirmed there was no AWS account being handed over from the old team. The team subsequently settled on **Render** — `mobile-backend` and `web-backend` were deployed there first, followed by `web-app` and `chatbot`.

**How resolved:** CI/CD tool confirmed with the team (GitHub Actions). Hosting was flagged 🔴 critical, then ⏳ pending while the team chased an answer, and is now ✅ **resolved: Render**, confirmed by all four hosted services being live there as of 2026-09-25.

## Decision

Agreed:
* **CI/CD: GitHub Actions**, same pipeline shape (lint → type-check → test → build → deploy) applied to the new chatbot repo as well as the existing four.
* Feature flags: environment-variable based, per-service — no shared feature-flag mechanism across services.
* **Hosting: Render**, for every deployed backend/web service — `mobile-backend`, `web-backend`, `web-app`, and `chatbot`. `mobile-app` ships as client builds (APK/iOS), not a hosted service, so it isn't part of this decision. `database` stays on the team's own NeonDB account, unaffected.

**Open follow-ups (tracked separately, not blocking this ADR):**
* `web-app` and `chatbot` are deployed via Render's dashboard configuration rather than a committed `render.yaml` (unlike `mobile-backend`) — moving them to IaC for consistency is a nice-to-have, not required.
* Environment separation (dev/staging/prod) on Render and TLS coverage verification are tracked under `X-6d` and `X-6e`/`X-6f` respectively, not part of this ADR's original scope.

Caveats: none remaining for the hosting question itself — see the open follow-ups above for adjacent, non-blocking work.

## Other Related ADRs

* [ADR 0003 — Chatbot Service Stack](/docs/adr/chatbot-service-stack) - the service whose hosting target is blocked by this decision

## References

* [Architecture Review recap — Part 4.7 & Part 5](/docs/plans/architecture-session-notes#deploy-ops)
* [Phase 0 Weak-Point Register — X-1](/docs/phase-0)
