---
sidebar_position: 7
title: "ADR 0007: Deployment, CI/CD & Hosting"
---

# ADR 0007: Deployment, CI/CD & Hosting

## Submitters

* _[Your name]_ (Is Thai Cacao Capstone Team)

## Change Log

* [approved](/docs/plans/architecture-session-notes#deploy-ops) 2026-07-27 — CI/CD tooling only
* [pending](/docs/plans/architecture-session-notes#open-items) — hosting target for the chatbot service (and possibly the existing Go/Kotlin backends)

## Referenced Use Case(s)

* All EPICs — this affects where every new and existing service actually runs.

## Context

The existing system has no CI/CD at all (`X-1` in the Phase 0 register — nothing builds, tests, or validates any of the four codebases automatically). A new chatbot service adds a fifth codebase that needs the same treatment. Separately, the original plan assumed the new chatbot service would deploy onto "the existing 3-VM AWS setup" the old team was running — that assumption turned out to be false: **there is no AWS account being handed over from the old team.** The database is unaffected (the team already independently runs it on their own NeonDB account), but where the Go backend, Kotlin backend, and the new chatbot service actually run is now a genuinely open question — possibly affecting the *existing* backends' hosting too, not just the new service.

## Proposed Design

**Services/modules impacted:** potentially all five repos, depending on how the hosting question resolves — if the *existing* Go/Kotlin hosting also turns out to be tied to the old team's AWS account, this isn't scoped to just the new chatbot service.

**New services/modules:** none — this ADR is about where things run, not what runs.

**Model/DTO impact:** none.

**API impact:** none.

**Config/devops impact:** the entire point of this ADR. GitHub Actions pipelines (lint → type-check → test → build → deploy) are confirmed as the CI/CD tool; the deploy target those pipelines push to is unresolved.

## Considerations

**CI/CD tool — GitHub Actions (chosen, confirmed already in use by the team).** A teammate already uses GitHub Actions elsewhere; the new chatbot repo mirrors the same pipeline pattern rather than introducing a second CI tool. Low-risk, no real alternative considered given it's already a team-familiar tool.

**Hosting target — originally assumed: the existing 3-VM AWS setup (invalidated).** This was the working assumption until the team confirmed there is no AWS account being handed over from the old team. Marking this **pending** rather than guessing a replacement — the right next step is confirming with the team and the old team what, if anything, is available, not picking a new host unilaterally.

**How resolved:** CI/CD tool confirmed with the team (GitHub Actions). Hosting explicitly **not resolved** — flagged 🔴 critical, then corrected to ⏳ pending once the team confirmed they're actively chasing an answer (not stalled, just not yet decided).

## Decision

Agreed so far:
* **CI/CD: GitHub Actions**, same pipeline shape (lint → type-check → test → build → deploy) applied to the new chatbot repo as well as the existing four.
* Feature flags: environment-variable based, per-service — no shared feature-flag mechanism across services.

**Not yet decided — this is the open item:**
* Where the chatbot service (and possibly the existing Go/Kotlin backends) actually gets hosted, now that the AWS handover assumption is invalidated.
* Whether the *existing* system's current hosting is even confirmed to be under the new team's control going forward — this needs a direct answer, not an assumption, before any deploy-target decision can be made.

Caveats: this ADR intentionally stays open rather than picking a placeholder host, because guessing here risks designing deploy configuration (secrets, networking, DNS) around a target that turns out to be wrong.

Unsatisfied requirements: a real hosting decision. Action item on record: the team is raising this directly with the old team; no timeline given as of 2026-07-27.

## Other Related ADRs

* [ADR 0003 — Chatbot Service Stack](/docs/adr/chatbot-service-stack) - the service whose hosting target is blocked by this decision

## References

* [Architecture Review recap — Part 4.7 & Part 5](/docs/plans/architecture-session-notes#deploy-ops)
* [Phase 0 Weak-Point Register — X-1](/docs/phase-0)
