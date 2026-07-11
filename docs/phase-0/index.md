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

Decision values: 🔧 **Fix (Phase I)** · 📌 **Accept & document** · ⏳ **Undecided** · ✅ **Done**

---

## 1. Database

Full detail and SQL for each item live in the [Critical Issues tracker](/docs/critical-issues) — summarized here so this register is complete.

| ID | Weak point | Why it blocks scaling | Severity | Decision |
|---|---|---|---|---|
| DB-1 ([C1](/docs/critical-issues#c1)) | `other.sql` truncated — repo can't rebuild the DB | New environments (staging, prod deploy in Phase I) can't be provisioned reliably | 🔴 | 🔧 Fix (Phase I) |
| DB-2 ([C2](/docs/critical-issues#c2)) | `response.task_log_id` — no FK, misnamed | Research data integrity depends on app discipline; LLM-driven ingestion (Phase II) multiplies the risk | 🔴 | 🔧 Fix (Phase I) |
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
| BE-2 (M5) | `FormResponseController`/`TaskController` have **no `@PreAuthorize` and no ownership check** — any authenticated user can read anyone's task responses | Real farmers' survey data exposed to every account; unacceptable in production | 🔴 P5 | 🔧 Fix (Phase I) |
| BE-3 (M6) | Bulk raw-data export endpoint has **no authorization at all** | Whole-database exfiltration by any logged-in user | 🔴 P5 | 🔧 Fix (Phase I) |
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

---

## Verdict: is the base scalable for what actually reuses it?

**The architecture's *shape* is right; its *integrity and process* are not.** Phase 0's scalability question only applies where later work **reuses the existing layers** — Phase I's real deployment, growing data volume, and Phase II's LINE OA channel (which writes into the *existing* form pipeline). Phase III (Computer Vision + Knowledge Base) is **out of scope for this verdict**: it introduces entirely new data that arrives later and will be designed in its own phase — it isn't fair to grade today's system against data it was never asked to hold.

| What reuses the base | What it requires | Ready today? |
|---|---|---|
| **Real deployment (Phase I)** | Rebuildable environments, secure transport/sessions, observability, CI | ❌ Not yet — DB-1/DB-6, BE-1, APP-1/APP-2, X-1/X-2 |
| **Growing data volume (any phase)** | Indexed joins/spatial queries, deduplicated identities, paginated APIs | ❌ Not yet — DB-3, DB-5, BE-9, GO-6 |
| **LINE OA + LLM form entry (Phase II)** | A third client channel writing form responses through a clean, validated submission API with a server-owned form schema | ⚠️ Partially — the dynamic-form engine exists, but the response link is convention-only (DB-2), the schema is client-bundled on mobile (APP-4), and submission logic lives in two backends (X-3) |
| **Computer Vision + Knowledge Base (Phase III)** | Mostly **new** data and infrastructure, assessed when that phase is designed | ➖ Not judged in Phase 0. Known touchpoints with the base are small and already tracked: `storage.file` hygiene (DB-8) and a single grade vocabulary (DB-7) would ease it, but neither is a Phase 0 blocker |

**Conclusion for Phase 0:** the system *can* be made scalable without a rewrite — the domain model, multi-schema design, BFF pattern, and dynamic-form engine are sound foundations. But the 🔧 items above (security holes, integrity constraints, environment/config hygiene, CI) are prerequisites, not nice-to-haves, and belong at the start of Phase I. The 🏗️ big architectural question to resolve as a team is **GO-1/X-3**: whether to consolidate the two backends' data access (shared contract, or one backend owning writes) before adding the Phase II ingestion channel.

:::tip[How to use this register]
When the team decides an item's fate, change its Decision cell (🔧 / 📌 / ✅), and if it's non-obvious, write a short [Project Log](/log) entry with the reasoning. Items decided "fix" should appear in the [Roadmap](/docs/plans/roadmap) phase plan.
:::
