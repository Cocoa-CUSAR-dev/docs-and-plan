---
sidebar_position: 1
slug: /phase-0
title: Weak-Point Register
---

# Phase 0 — Can the Existing System Scale?

Phase 0 of this capstone analyzes the system we inherited: **is it able to scale, and can the existing layers handle what will reuse them** — Phase I's real deployment and Phase II's LINE OA + LLM entry, which writes into the existing form pipeline? (Phase III's Computer Vision + Knowledge Base is entirely new data arriving later, so it's not part of this verdict — see the note at the bottom.) This page is the consolidated register of **every weak point found**, across all layers. Each item gets a decision — fix in Phase I, accept and document, or decide later — recorded in the Decision column as the team works through them.

**Sources feeding this register:**

| Analysis | Scope | Date |
|---|---|---|
| [Database Review](/docs/database/db-review) + [Fix Decisions](/docs/database/fix-decisions) | PostgreSQL schema, seed, triggers | 2026-07-08 |
| [Researcher-Side Code Quality Audit](/docs/phase-0/researcher-audit) (47 findings) | Kotlin backend + Next.js web app | 2026-07-10 |
| [Flutter App Technical Analysis](/docs/phase-0/flutter-analysis) | Mobile app | 2026-07-10 |
| [Go Server Walkthrough](/docs/phase-0/go-server-walkthrough) | Mobile backend (Gin + GORM) | 2026-07-10 |
| Chatbot pathway audit (live-tested against real chatbot + Go + Kotlin + DB) | LINE OA guided-flow submission pipeline (Phase II) | 2026-08-09 |

Decision values: 🔧 **Fix (Phase I)** · 📌 **Accept & document** · ⏳ **Undecided** · ✅ **Done**

Separately from weak points (bugs/gaps in the code), the **final report itself** makes several claims that don't hold up against the code — see the **[Documented Claims vs. Code Reality](/docs/phase-0/false-claims-register)** register.

---

## 1. Database

Full detail and SQL for each item live in the [Critical Issues tracker](/docs/critical-issues) — summarized here so this register is complete.

| ID | Weak point | Why it blocks scaling | Severity | Decision |
|---|---|---|---|---|
| DB-1 ([C1](/docs/critical-issues#c1)) | `other.sql` truncated — repo can't rebuild the DB | New environments (staging, prod deploy in Phase I) can't be provisioned reliably | 🔴 | 🔧 Fix (Phase I) |
| DB-2 ([C2](/docs/critical-issues#c2)) | `response.task_log_id` — no FK, misnamed | Research data integrity depends on app discipline; LLM-driven ingestion (Phase II) multiplies the risk | 🔴 | ✅ Done — a real `fk_response_task` FK on `task_log_id` (and `fk_response_task_form` on `task_form_id`) already exists in the shared dev DB, confirmed 2026-08-09 while deleting phantom tasks (delete failed against it as expected of a real FK). This register hadn't been updated since the 2026-07-08 review; `database/migrations/V2__db2_response_task_fk.sql` is presumably the fix — the column is still misnamed (`task_log_id`, not `task_id`), just not unlinked anymore |
| DB-3 ([C3](/docs/critical-issues#c3)) | Zero UNIQUE constraints (usernames, roles, junctions) | Duplicate identities and double-counted harvests poison analytics as data volume grows | 🔴 | 🔧 Fix (Phase I) |
| DB-4 ([D2](/docs/critical-issues#d2)) | `geo_id` columns unlinked to `storage.geo` | Orphaned geometry = silent map failures at scale | 🔴 | 🔧 Fix (Phase I) |
| DB-5 ([C4](/docs/critical-issues#more)) | Zero secondary indexes, no GiST on geometry | Every join and every spatial query is a sequential scan — degrades linearly with data growth; this is *the* textbook scaling blocker | 🟠 | 🔧 Fix (Phase I) |
| DB-6 ([O1](/docs/critical-issues#o1)) | No migration tool | Schema drift already happened once; multi-environment deployment (Phase I) is unmanageable without it | 🔴 | 🔧 Fix (Phase I) |
| DB-7 ([D4](/docs/critical-issues#more)) | Three disconnected grade representations | Free-text grades fragment reporting as records accumulate; one typo creates a phantom grade (also eases Phase III later) | 🟠 | ⏳ Undecided |
| DB-8 ([D3](/docs/critical-issues#accepted)) | Polymorphic `storage.file`: unindexed, no `created_at` | File lookups are unindexed scans on an append-heavy table; grows with normal document/photo uploads | 🟡 | ⏳ Undecided |
| DB-9 ([T2/T4/T6…](/docs/critical-issues#accepted)) | Hygiene batch (timestamps, CHECKs, ON DELETE) | Low individual impact | 🟢 | 📌 Accept & document |

## 2. Kotlin Web Backend (researcher side)

From the [Researcher-Side Code Quality Audit](/docs/phase-0/researcher-audit) — IDs reference its findings.

| ID | Weak point | Why it blocks scaling | Severity | Decision |
|---|---|---|---|---|
| BE-1 (M2) | Auth cookie not marked `Secure` (commented out) | Session token can leak over plain HTTP once deployed publicly (Phase I) | 🔴 P5 | 🔧 Fix (Phase I) |
| BE-2 (M5) | ~~`FormResponseController`/`TaskController` had no `@PreAuthorize` and no ownership check~~ — **fixed**: both endpoints now require `read:task:all`/`read:response:all`, seeded and granted only to `researcher` by `database/migrations/V11__task_response_read_permissions.sql`; confirmed live against the DB that `farmer`/`hub_collector`/`processor` hold none of the `read:*:all` authorities | Real farmers' survey data exposed to every account; unacceptable in production | 🔴 P5 | ✅ Done |
| BE-3 (M6) | ~~Bulk raw-data export endpoint had no authorization at all~~ — **fixed**: `ReportController` now requires `read:report:all`, confirmed live in the DB as granted only to `researcher` (no migration file found seeding it, but the grant is live) | Whole-database exfiltration by any logged-in user | 🔴 P5 | ✅ Done |
| BE-4 (P1) | Every request re-runs a 4-table JOIN to reload roles/permissions | Per-request DB load scales with traffic; caching/claims fix it | 🟠 P4 | ⏳ Undecided |
| BE-5 (P2) | `fetchRefChoices` re-introspects the whole DB schema per option field | Form rendering slows as schema grows | 🟠 P4 | ⏳ Undecided |
| BE-6 (M1) | **Zero automated tests** | Refactoring (Phase I's core activity!) without a safety net | 🟠 P4 | 🔧 Fix (Phase I) |
| BE-7 (M3) | Exception handler leaks raw exception messages, logs nothing | No observability in production; internals exposed to clients | 🟠 P4 | 🔧 Fix (Phase I) |
| BE-8 (M4) | Malformed JWT crashes the request (500) instead of 401 | Trivial unauthenticated way to spam server errors | 🟠 P4 | 🔧 Fix (Phase I) |
| BE-9 (P3/P4) | Excel export loads entire tables into memory; list endpoints have no pagination | Memory blow-up is proportional to data volume — works today, falls over at scale | 🟠 P3 | ⏳ Undecided |
| BE-10 (S1–S6) | Structure debt: controller extending service, duplicated analytics services, dead `BaseRepository`, convention-coupled form logic | Slows every future change; refactor targets for Phase I | 🟡 P2–3 | ⏳ Undecided |

## 3. Researcher Web App (Next.js)

| ID | Weak point | Why it blocks scaling | Severity | Decision |
|---|---|---|---|---|
| FE-1 (M9+M10+M11) | **Registration flow is not implemented end-to-end**: the BFF register route never calls the backend, the register button is wired to nothing, `users` route is a stub | Users cannot self-register at all — feature is silently broken | 🔴 P5 | 🔧 Fix (Phase I) |
| FE-2 (M12) | Error-status check misclassifies **every 5xx response** (JS `in` operator on an array) | Backend failures surface as success paths; debugging production becomes guesswork | 🟠 P4 | 🔧 Fix (Phase I) |
| FE-3 (S8) | BFF proxy boilerplate copy-pasted into ~11 API routes | Every cross-cutting change (auth header, tracing, LINE OA channel in Phase II) must be edited 11 times | 🟠 P4 | ⏳ Undecided |
| FE-4 (S7) | ~250 lines of dashboard fetch/chart logic duplicated across 3 files | Same as FE-3 — change amplification | 🟠 P4 | ⏳ Undecided |
| FE-5 (P6) | Two full mapping stacks bundled (one only used in a debug route) | Bundle weight for every user, forever | 🟡 P3 | ⏳ Undecided |
| FE-6 (P7/P8) | Dashboard fires 6 unbatched requests per mount; no request cancellation on filter changes | Multiplies backend load (see BE-4) as user count grows | 🟡 P3 | ⏳ Undecided |
| FE-7 (M14) | Lorem-Ipsum shipped as the production Terms of Use | Legal/credibility problem on real deployment | 🟡 P3 | 🔧 Fix (Phase I) |
| FE-8 (M15) | Only E2E tests, with hardcoded credentials and fragile selectors | Same refactoring-safety problem as BE-6 | 🟡 P3 | ⏳ Undecided |
| FE-9 (M17) | `BACKEND_URL` silently falls back to `localhost` | Misconfigured deploys fail confusingly instead of loudly | 🟡 P2 | 🔧 Fix (Phase I) |

## 4. Go Mobile Backend

From the [Go Server Walkthrough](/docs/phase-0/go-server-walkthrough) and code review.

| ID | Weak point | Why it blocks scaling | Severity | Decision |
|---|---|---|---|---|
| GO-1 | **Split-brain data access:** Go uses GORM while Kotlin uses jOOQ against the same DB — two ORMs, two model definitions, zero shared contract | Every schema change must be re-implemented twice and can silently diverge; this is the single biggest architectural risk for Phases II–III, which add *more* writers (LINE OA, CV) | 🔴 | ⏳ Undecided |
| GO-2 | JWT carries only `user_id` — no roles; endpoints rely on profile-existence rather than role checks | Authorization model diverges from the Kotlin side's permission system; auditing access is impossible | 🟠 | ⏳ Undecided |
| GO-3 | JWT delivered as a cookie to a mobile app; no refresh-token flow | Awkward on mobile HTTP clients; long-lived static tokens are the likely workaround → security risk | 🟠 | ⏳ Undecided |
| GO-4 | No automated tests (only `go fmt` / `go vet`) | Same refactoring-safety problem | 🟠 | ⏳ Undecided |
| GO-5 | Port 8080 hardcoded in `main.go` (`r.Run(":8080")`); no health-check endpoint beyond `/public/test` | Deployment/monitoring readiness for Phase I | 🟡 | ⏳ Undecided |
| GO-7 | No service layer despite the README's "Clean Architecture" claim — business logic sits inside the handlers | Handler files grow unboundedly; logic can't be reused by a future ingestion channel (Phase II) | 🟡 | ⏳ Undecided |
| GO-6 | List endpoints (`/harvests`, `/batches`, `/tasks`) return unpaginated results | Same growth problem as BE-9 | 🟡 | ⏳ Undecided |

## 5. Flutter Mobile App

From the [Flutter App Technical Analysis](/docs/phase-0/flutter-analysis).

| ID | Weak point | Why it blocks scaling | Severity | Decision |
|---|---|---|---|---|
| APP-1 | Backend URL **hardcoded to a LAN IP** (`http://192.168.10.188:8080`) in `service_provider.dart` | App cannot be shipped without a code change per environment; no flavor/env config despite the white-label goal | 🔴 | 🔧 Fix (Phase I) |
| APP-2 | Plain HTTP, no TLS; session cookie + cached data stored **unencrypted in SharedPreferences** | Farmer PII and credentials exposed on device and on the wire | 🔴 | 🔧 Fix (Phase I) |
| APP-3 | No automated tests at all | Refactoring safety | 🟠 | ⏳ Undecided |
| APP-4 | Dynamic form schema is a **bundled asset** (`assets/schema.json`), not server-driven | Every form change requires an app release — defeats the dynamic-form design and blocks Phase II's fast-iterating LLM forms | 🟠 | ⏳ Undecided |
| APP-5 | Offline sync conflict resolution is timestamp-only; no versioning or merge strategy | Concurrent edits (farmer + hub staff) silently lose data as user count grows | 🟡 | ⏳ Undecided |
| APP-6 | Mock-mode remnants and commented mock data in `DynamicApiService` | Noise + risk of shipping mock paths | 🟢 | 📌 Accept & document |

## 6. Cross-Cutting / Infrastructure

| ID | Weak point | Why it blocks scaling | Severity | Decision |
|---|---|---|---|---|
| X-1 | **No CI/CD**: nothing builds, tests, or validates any of the four codebases automatically | Phase I's deployment goal needs a pipeline; C1-style corruption goes undetected | 🔴 | 🔧 Fix (Phase I) |
| X-2 | No monitoring, structured logging, or error tracking anywhere (BE-7 is one symptom) | A deployed system (Phase I) that can't be observed can't be operated | 🟠 | 🔧 Fix (Phase I) |
| X-3 | Domain logic (auth, farm/harvest/batch rules) implemented independently in both backends | Business-rule drift between mobile and web sides; Phase II adds a third writer (LINE OA) | 🟠 | ⏳ Undecided |
| X-4 | Seed data reuses one bcrypt hash for all users | Dangerous if seed ever touches production | 🟡 | 🔧 Fix (Phase I) |
| X-5 | No API versioning on the Go side (Kotlin has `/api/v1`) | Mobile clients in the field can't be force-updated; breaking changes need versioned routes | 🟡 | ⏳ Undecided |

## 7. Chatbot / LINE OA Pathway (Phase II)

Live-tested end to end on 2026-08-09: a correctly HMAC-signed synthetic webhook payload was driven through the real `/line/webhook` route (not the dev test router) — start → answer each question → confirm — with the actual chatbot, Go, and Kotlin services running against the real dev DB, verifying state after every hop. Findings below are either directly observed in that run or confirmed via `information_schema` cross-referenced against every `form.question.field_name` actually in use.

| ID | Weak point | Why it matters | Severity | Decision |
|---|---|---|---|---|
| CB-1 | `confirm_conversation` told the farmer "บันทึกข้อมูลเรียบร้อยแล้ว" (saved) **unconditionally** — `submit_task`'s exception was caught, logged, and swallowed; the conversation was still marked `COMPLETED` even when Go's write failed outright | Confirmed live: a submission that hit a NOT NULL violation on Go's side left **zero** rows anywhere (no `form.response`, no domain row) while the farmer was told it succeeded. Silent, undetectable data loss — the worst failure mode for a databank | 🔴 | ✅ Done — 2026-08-09. On failure the conversation now stays `AWAITING_CONFIRMATION` (not `COMPLETED`) and the confirm button is re-attached so tapping it again retries the same submission; farmer sees an honest "ไม่สามารถบันทึกข้อมูลได้" message instead |
| CB-2 | `farm_pest_disease_record` (one of Go's 5 "supported" dissection handlers) was structurally broken: destination table requires `farm_id` (`NOT NULL`, no default), but no form using this handler ever asked a `farm_id`/`plot_id` question | Every real submission through this handler failed Go's INSERT — live-verified before the fix: table had 0 rows despite the handler being marked supported | 🔴 | ✅ Done — 2026-08-09. Added a mandatory `farm_id` OPTION question to all 11 real (non-phantom) instances + the `mock_forms.sql` template. Re-verified live end-to-end: a real row now lands in `agriculture.farm_pest_disease_record` |
| CB-3 | `harvest` handler requires `hub_id` (`NOT NULL`, no default); no form using this handler ever asked for it | Same failure class as CB-2 | 🔴 | ✅ Done — 2026-08-09. Added a mandatory `hub_id` OPTION question to both real instances + the seed template. Flagged for a later product decision: should this be asked every time, or auto-filled from the farmer's own account if a farmer is always tied to one fixed hub? |
| CB-4 | `batch` handler requires `processing_station_id` (`NOT NULL`, no default); the only form field offered instead was `district_id`, which isn't a column on `processing.batch` at all | Guaranteed failure, and even the offered field was silently dropped by Go's column allowlist rather than erroring loudly | 🔴 | ✅ Done — 2026-08-09. Removed `district_id` (was never connected to anything real), added a mandatory `processing_station_id` OPTION question to the one real instance |
| CB-5 | Inconsistent `_id` vs `_code` field-naming, 3 cases found — **not all the same fix**, verified via each column's actual FK constraint: (a) `processing_record`'s `weather_condition_code` → real FK is `weather_condition_id → ref.weather_condition_constant(weather_condition_id)`, a clean surrogate-key match, just needed a rename; (b) `harvest_grade_detail`'s `grade_code` → real FK is `grade_code → ref.grade_constant(grade_name)`, a **natural-key** relationship (the text itself is the key, no UUID involved) that Kotlin's `_id`-suffix convention can't resolve at all; (c) `drying_batch`'s `drying_facility_type_code` → real ref table is `ref.drying_facility_constant` (no "_type"), but Kotlin derives the table name as `drying_facility_type_constant` from an `_id`-suffixed field, which doesn't exist — renaming alone would still leave choice-resolution broken | (a) was silently dropping a real (if optional) field on every processing_record submission. (b) and (c) need real backend work, not a data fix — a naive rename would look fixed but still silently fail | 🟠 | (a) ✅ Done — 2026-08-09, renamed to `weather_condition_id`. (b)/(c) ⏳ Logged for later — need either a Kotlin-side special case per field, or a schema change (e.g. add a UUID surrogate key to `grade_constant` for (b)) |
| CB-6 | 5 of 10 handlers (`farm_activity_fertilizer`, `farm_activity_chemical`, `harvest_grade_detail`, `fermentation_batch`, `drying_batch`) are child rows needing a parent ID (`farm_activity_id`/`harvest_id`/`batch_id`) the chat flow has no way to supply yet — Go has no dissection logic for them at all. Underlying shape, explained plainly: none of these 5 describe a new event — each is an *extra detail attached to something already logged* (a fertilizer/chemical application detail belongs to an existing `farm_activity`; a grading detail belongs to an existing `harvest`; a fermentation/drying detail belongs to an existing processing `batch`) | Cross-checked against real `form.question` data: `fermentation_batch`'s non-parent fields are otherwise fully covered and ready the moment parent-resolution exists; `farm_activity_fertilizer`/`farm_activity_chemical` are too; the other 2 also carry CB-5's naming issue | 🟡 | ⏳ Logged for later, proposed design below — team decided not to build this now |
| CB-7 | Seed-data completeness gap: this system mints a **unique `form_id` per task instance** (not a shared template) — confirmed by checking `farm_activity`'s 12 task instances, each with its own distinct `form_id`. Most had their own `form.section`/`form.question` rows seeded correctly, but 21 across every handler had none at all ("phantom" forms with zero questions) | A farmer picking one of the un-seeded task instances was silently routed straight to confirmation with nothing to answer | 🟡 | ✅ Done — 2026-08-09. All 21 phantom tasks deleted (including 11 `chat.conversation` + associated answer rows from real prior test interactions against them, at the team's explicit request), along with their stale `form.response` rows. Replaced with 3 clearly-labeled `(E2E test)` tasks for the 3 newly-fixed handlers (CB-2/3/4), built to exercise exactly the fields that were fixed |
| CB-8 | `src/line/router.py`'s `webhook()` had a leftover debug `print(f"Events: {events}")` running synchronously in the request path, which crashed with `UnicodeEncodeError` on Windows whenever an event contained Thai text — a 500 back to LINE, so the farmer's message was never processed at all | Live-caught during this audit — likely explains some of the "nothing happens" behavior seen in earlier local Windows testing | 🟢 | ✅ Done — removed 2026-08-09 |
| CB-9 | Field-type coverage: only VARCHAR/OPTION/BOOLEAN are wired into the guided flow. DATE/DATETIME (LINE has a native `DatetimePickerAction`, confirmed available in the installed SDK), GEODATA (LINE has native location-sharing; `LocationMessageContent` handling already stubbed but unimplemented; needs a `storage.geo` row + link, which Go's dissection can't do yet — single-table flat insert only), FLOAT/INT (likely a quick win — same free-text-with-validation fix pattern already used for BOOLEAN, re-ask on unparseable input, rather than a deferred item), and photo upload (`ImageMessageContent` already received, currently just logged; needs a `storage.file` row) are all unhandled today | Roadmap input for what's genuinely next vs. what needs bigger backend work first | 🟡 | ⏳ Undecided — team's own call on sequencing, already consciously scoped out of Sprint 1 |
| CB-10 | `chat.conversation` and `chat.conversation_answer` have no `created_at`/`updated_at` columns at all | No way to know when a conversation happened without cross-referencing `form.response.submitted_at`, which only exists if the submission succeeded (see CB-1 — most didn't, before today's fix) | 🟢 | 📌 Accept & document, or add the columns |
| CB-11 | `start_conversation` has no idempotency/dedup check — a farmer (or a retry) can start the same task multiple times; live-observed 2-3 pre-existing `COMPLETED` conversations for the same farmer+task pair | Risk of duplicate domain rows for the same real-world event now that CB-1/2/3/4 are fixed and submissions actually succeed | 🟡 | ⏳ Undecided — team's own call, deliberately not this sprint's work |
| CB-12 | No concurrency control on a conversation's `current_question_id`: two webhook events for the same conversation arriving close together (e.g. LINE's own delivery retry, or a farmer double-tapping) can both read the same "current question" before either writes back, producing two answer rows for one question and neither correctly advancing the other's state | Caught live during CB-2's fix verification — firing two answers ~2s apart raced and both landed against the same question. A human typing on LINE normally has enough natural delay to avoid this, but LINE's own retry-on-slow-response behavior (noted elsewhere in this codebase) makes it a real, not just theoretical, risk | 🟡 | ⏳ Logged for later — needs either a per-conversation lock/mutex, or an optimistic-concurrency check (e.g. only accept an answer if `current_question_id` still matches what the farmer was shown) |

**Proposed design for CB-6** (not built, logged for whenever the team picks it up): before asking the real questions on one of the 5 child-row forms, the chat flow would first show the farmer a tappable list of their own recent matching entries — "which farm activity was this fertilizer for?" — reusing the same picker mechanism already used for choosing a task (`temp_task_picker`-style, but querying the farmer's own recently-*completed* entries of the right parent type instead of pending tasks). Once picked, that ID becomes the hidden parent link carried alongside the rest of the answer payload. On the Go side this needs one new dissection path per parent-type group: insert as a detail row linked to the chosen parent ID (instead of a brand-new independent row), plus a check that the picked parent entry actually belongs to the farmer — the same kind of ownership check `SubmitTaskForUser` already does via `chat.conversation`.

---

## Verdict: is the base scalable for what actually reuses it?

**The architecture's *shape* is right; its *integrity and process* are not.** Phase 0's scalability question only applies where later work **reuses the existing layers** — Phase I's real deployment, growing data volume, and Phase II's LINE OA channel (which writes into the *existing* form pipeline). Phase III (Computer Vision + Knowledge Base) is **out of scope for this verdict**: it introduces entirely new data that arrives later and will be designed in its own phase — it isn't fair to grade today's system against data it was never asked to hold.

| What reuses the base | What it requires | Ready today? |
|---|---|---|
| **Real deployment (Phase I)** | Rebuildable environments, secure transport/sessions, observability, CI | ❌ Not yet — DB-1/DB-6, BE-1, APP-1/APP-2, X-1/X-2 |
| **Growing data volume (any phase)** | Indexed joins/spatial queries, deduplicated identities, paginated APIs | ❌ Not yet — DB-3, DB-5, BE-9, GO-6 |
| **LINE OA + LLM form entry (Phase II)** | A third client channel writing form responses through a clean, validated submission API with a server-owned form schema | ⚠️ Partially — the response link now has a real FK (DB-2, confirmed fixed), but the schema is client-bundled on mobile (APP-4), submission logic lives in two backends (X-3), and the chatbot's own pathway has its own list of gaps — see [section 7](#7-chatbot--line-oa-pathway-phase-ii) |
| **Computer Vision + Knowledge Base (Phase III)** | Mostly **new** data and infrastructure, assessed when that phase is designed | ➖ Not judged in Phase 0. Known touchpoints with the base are small and already tracked: `storage.file` hygiene (DB-8) and a single grade vocabulary (DB-7) would ease it, but neither is a Phase 0 blocker |

**Conclusion for Phase 0:** the system *can* be made scalable without a rewrite — the domain model, multi-schema design, BFF pattern, and dynamic-form engine are sound foundations. But the 🔧 items above (security holes, integrity constraints, environment/config hygiene, CI) are prerequisites, not nice-to-haves, and belong at the start of Phase I. The 🏗️ big architectural question to resolve as a team is **GO-1/X-3**: whether to consolidate the two backends' data access (shared contract, or one backend owning writes) before adding the Phase II ingestion channel.

:::tip[How to use this register]
When the team decides an item's fate, change its Decision cell (🔧 / 📌 / ✅), and if it's non-obvious, write a short [Project Log](/log) entry with the reasoning. Items decided "fix" are sized and ordered in the **[Fix Dependency Map & Sprint Sizing](/docs/plans/fix-dependencies)** page.
:::
