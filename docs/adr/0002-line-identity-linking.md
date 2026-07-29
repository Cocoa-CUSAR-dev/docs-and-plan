---
sidebar_position: 2
title: "ADR 0002: LINE Identity Linking & Farmer Registration"
---

# ADR 0002: LINE Identity Linking & Farmer Registration

## Submitters

* _[Your name]_ (Is Thai Cacao Capstone Team)

## Change Log

* [approved](/docs/plans/architecture-session-notes#identity-line) 2026-07-27

## Referenced Use Case(s)

* [EPIC 1 — Registration & LINE Auth](/docs/plans/architecture-session-notes#backlog-check)
* [EPIC 3 — SSO between LINE OA and the web platform](/docs/plans/architecture-session-notes#backlog-check)

## Context

Existing farmers already have an `auth.user_account` row created through the web/mobile registration flow. The chatbot channel needs a way to answer "which existing account is this LINE user" — and a way to register brand-new farmers who start entirely inside LINE, with no prior account.

Checked directly against the code: the final report (§4.1.4) describes SMS OTP verification during registration. `Register()` (`auth_handler.go:111`) has zero verification logic — no OTP is sent or checked anywhere in the Go codebase. This is another documented-but-never-built gap, meaning the linking mechanism has to be designed as genuinely new work, not wired on top of existing verification infrastructure.

Also relevant: `DB-3`, the database review's finding that `auth.user_account` has no UNIQUE constraint — the new `line_user_id` column must not repeat that mistake.

## Proposed Design

**Services/modules impacted:** `mobile-backend` (Go) — reuses existing `RegisterFarmerProfile`/`Register` logic as the registration path for LINE-originated new users, rather than a parallel account system. Chatbot service owns the linking-code issue/verify flow.

**New services/modules:** none beyond the chatbot service itself; linking-code generation/verification is a feature within it.

**Model/DTO impact:** two new tables — `auth.line_identity` (one row per linked LINE account, `line_user_id UNIQUE NOT NULL`) and `auth.line_link_code` (short-lived pairing codes). See [ADR 0005](/docs/adr/data-model-changes) for the full shape.

**API impact:** new chatbot-service-internal endpoints for issuing/verifying a pairing code; no changes to Kotlin's or Go's existing public APIs for this decision.

**Config/devops impact:** none beyond what [ADR 0003](/docs/adr/chatbot-service-stack) already covers for the chatbot service's deployment.

## Considerations

**Option A (rejected) — in-app "Connect LINE" OAuth flow**, initiated from inside the Flutter app. Rejected: real SDK/screen work added to an app already carrying the modernization refactor, and it only reaches farmers who already have the app open — a mismatch for the project's own field-testing findings (Chiang Mai persona skews low digital literacy, unfamiliar with OAuth consent screens).

**Option B (rejected) — "Login with LINE" as a standalone flow**, i.e. LINE becomes a first-class login method directly. Rejected: relocates the same core problem rather than solving it — the system still doesn't know which existing account a first-time LINE login corresponds to, so an explicit linking step is unavoidable either way.

**Option C (chosen) — verification/pairing code, no deep link.** The app (or a researcher, at registration time) shows the farmer a short-lived numeric code; the farmer sends it as a plain LINE text message; the chatbot verifies it against `auth.line_link_code` and creates the `auth.line_identity` row. Smaller Flutter footprint (a screen showing a code, nothing more), and matches a pattern the target users are more likely to already know (Discord phone-linking, smart-TV pairing, several Thai banking apps).

**How resolved:** decided directly with the team — Option C, with the OTP-absence finding logged as a reason the linking-code path is genuinely new work rather than something to bolt onto existing verification.

## Decision

Agreed implementation:
* Existing farmers: app displays a pairing code (`auth.line_link_code`, expiring), farmer sends it in LINE, chatbot verifies and writes `auth.line_identity`.
* New farmers with no prior account: registration happens entirely inside LINE, reusing Go's existing `RegisterFarmerProfile`/`Register` logic — the chatbot is a new front door onto the same account creation, not a parallel account system. `password_hash` stays `NULL` for LINE-only accounts.
* `auth.line_identity.line_user_id` is `UNIQUE NOT NULL` from the start — applying the `DB-3` lesson (no uniqueness anywhere in `auth.user_account`) to new tables from day one.

Caveats: this **revises** `DB-3`'s originally suggested fix for `auth.user_account.password_hash` — "make it `NOT NULL`" is wrong as written now that LINE-only accounts legitimately have no password. Correct fix going forward: keep it nullable, and enforce "password OR a linked LINE identity exists" as a `CHECK`/application-level invariant instead.

Deferred: exact pairing-code expiry duration and retry/rate-limiting behavior are implementation details, not yet decided.

Unsatisfied requirements: none blocking; depends on [ADR 0005](/docs/adr/data-model-changes) landing the two new tables before this can be built.

## Other Related ADRs

* [ADR 0001 — Old↔New Integration Seam](/docs/adr/old-new-integration-seam) - this linking mechanism is how chatbot calls across that seam get attributed to a real farmer account
* [ADR 0005 — Data Model Changes](/docs/adr/data-model-changes) - owns the `auth.line_identity` / `auth.line_link_code` table definitions

## References

* [Architecture Review recap — Part 4.2](/docs/plans/architecture-session-notes#identity-line)
* [LINE Messaging API — Overview](https://developers.line.biz/en/docs/messaging-api/overview/)
* [Critical Issues tracker — DB-3](/docs/critical-issues)
