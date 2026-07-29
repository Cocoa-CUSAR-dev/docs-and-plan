---
sidebar_position: 1
title: "ADR 0001: Old↔New Integration Seam"
---

# ADR 0001: Old↔New Integration Seam

## Submitters

* _[Your name]_ (Is Thai Cacao Capstone Team)

## Change Log

* [approved](/docs/plans/architecture-session-notes#seam) 2026-07-27

## Referenced Use Case(s)

* [EPIC 2 — LINE OA AI Chatbot](/docs/plans/architecture-session-notes#backlog-check)
* [US2-1 — Guided conversational form filling](/docs/plans/architecture-session-notes#backlog-check)

## Context

The new chatbot channel is additive — it must submit farmer answers into the *existing* form pipeline (`form.task`, `form.task_form`, `form.section`, `form.question`, `form.response`) rather than build a parallel one. Before deciding how, the review verified what that pipeline actually does today, and found it doesn't match its own documentation:

* The final report (§4.1.3) claims researchers can push new questionnaires to the mobile app "without changing core source code." In reality the Flutter app reads form field definitions from a **bundled `assets/schema.json`** (`lib/bloc/dynamic/dynamic.dart:68-69,88-89`), not from the live `form.section`/`form.question` tables — editing a form via the web app has zero effect on the phone.
* Kotlin's `web-backend` has no form-creation endpoint at all — `FormController` only exposes `GET /forms`, `GET /forms/{formId}`, and `PUT /forms/{formId}/edit`. There is no `POST` anywhere for forms, sections, or questions.
* `internal/handlers/form_handler.go:64-112` (`SubmitTask`, Go `mobile-backend`) — the function meant to "dissect" a generic task submission into the 10 domain tables (`collection.harvest`, `processing.batch`, etc.) — is a `switch` statement whose every branch is a `fmt.Println(...)` log line. No `INSERT` into any domain table exists anywhere in the Go codebase for this path.
* Go's JWT carries only `user_id` — no roles (`auth_handler.go:92` even has a comment acknowledging the gap: *"send userID AND roles too, so Middleware can check permission"*). Kotlin, by contrast, has a real working `@PreAuthorize` permission system.
* Kotlin's `FormController.getForm → FormService.getFormDetail → FormRepository.fetchForm/buildSections/fetchRefChoices` (`GET /forms/{formId}`) is the one place in the whole system that already correctly assembles a form with resolved reference-data choices.

So the question wasn't just "how does the chatbot call the backend" — it was "which backend actually has working logic to call, and what's broken underneath it."

## Proposed Design

**Services/modules impacted:**
* `web-backend` (Kotlin) — `FormController`/`FormService`/`FormRepository` gain a caller that isn't the researcher web app; auth model must accept chatbot-originated, farmer-scoped calls.
* `mobile-backend` (Go) — `SubmitTask()` becomes the real write path and needs its dissection logic implemented for real (currently a stub); JWT gains roles; `form.response.task_log_id` needs its FK.

**New services/modules:** the chatbot service itself (Python/FastAPI — see [ADR 0003](/docs/adr/chatbot-service-stack)) as the new caller of both existing backends: reads via Kotlin's `GET /forms/{formId}`, writes via Go's `POST /tasks`.

**Model/DTO impact:** none to the existing `GET /forms/{formId}` response shape — reused as-is. `POST /tasks`'s payload shape needs confirming against what the chatbot can actually collect via slot-filling.

**API impact:** no new endpoints on Kotlin for this decision (reuses `GET /forms/{formId}`). Go's existing `POST /tasks` becomes load-bearing for a second client (previously only the Flutter app called it) — its dissection logic can no longer be a stub once the chatbot depends on it producing real domain rows.

**Config/devops impact:** Kotlin needs a new trust boundary/auth path for service-to-service or farmer-on-behalf-of calls from the chatbot service, not just researcher browser sessions.

## Considerations

**Option A (chosen) — reuse Kotlin's `GET /forms/{formId}` for reads, Go's `POST /tasks` for writes.** Avoids re-implementing form assembly (`fetchRefChoices` and friends) a second time in Go or in the new Python service. Cost: `SubmitTask()`'s dissection stub is now a hard blocker rather than a pre-existing weak point that could wait.

**Option B (rejected) — build a parallel read/write path directly in the new chatbot service against the shared database.** Would duplicate `fetchRefChoices`'s reference-data resolution logic a third time (Go already duplicates it once relative to Kotlin — `GO-1`, split-brain data access). Rejected: multiplies the exact problem the review flagged as the single biggest cross-repo risk.

**Option C (rejected) — build the write path fresh in Go, ignoring the existing stub.** Considered because the stub needed fixing either way. Rejected only in the sense that "fresh" isn't right — the fix is to *finish* `SubmitTask()`, not bypass it, since Go's routing/validation/auth wrapping around it is otherwise sound.

**How resolved:** confirmed directly with the team — reuse over rebuild, accepting that this promotes several pre-existing weak points (Go's dissection stub, missing FK, missing JWT roles) from "nice to fix" to "must fix before the chatbot can write anything real."

## Decision

Agreed implementation:
* Chatbot service calls Kotlin's `GET /forms/{formId}` to read form structure — no new Kotlin read endpoint.
* Chatbot service calls Go's `POST /tasks` to write farmer answers — Go's `SubmitTask()` dissection logic must be implemented for real before this is safe to depend on (currently logs only).
* Must-fix set required for this seam to be trustworthy: `form.response.task_log_id` FK (no existing register ID — tracked as `DB-2`), Go JWT roles (`GO-2`), a new farmer-identity mapping table (net-new, see [ADR 0002](/docs/adr/line-identity-linking)).
* Nice-to-fix while this code is open anyway: Go service layer (`GO-7`), Kotlin's `fetchRefChoices` performance (`BE-5` — reprioritized upward, since chatbot conversation starts will call it far more often than the researcher web app ever did), Go's cookie security, Go pagination (`GO-6`).

Caveats / deferred: whether Kotlin's auth model change (accepting farmer-scoped, chatbot-originated calls) is a shared service account, a scoped service-to-service token, or something else is **not yet decided** — flagged as follow-on design work once implementation starts.

Unsatisfied requirements: none for this decision itself; it depends on [ADR 0005](/docs/adr/data-model-changes) (the FK fix) and the dissection-logic fix landing before the chatbot can go live end-to-end.

## Other Related ADRs

* [ADR 0002 — LINE Identity Linking](/docs/adr/line-identity-linking) - depends on this seam for how the chatbot authenticates its calls
* [ADR 0003 — Chatbot Service Stack](/docs/adr/chatbot-service-stack) - the new service that is the caller on this seam
* [ADR 0005 — Data Model Changes](/docs/adr/data-model-changes) - carries the FK fix this decision depends on

## References

* [Architecture Review recap — Part 1 & Part 4.1](/docs/plans/architecture-session-notes#seam)
* [Phase 0 Weak-Point Register](/docs/phase-0)
* [Critical Issues tracker](/docs/critical-issues)
