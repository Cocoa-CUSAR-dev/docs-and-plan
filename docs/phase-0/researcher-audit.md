---
sidebar_position: 2
title: Researcher-Side Code Audit
---

# Researcher-Side Code Quality Audit

:::info[Team analysis document]
Contributed by the team, 2026-07-10. Scope: the two researcher-side projects — the **Kotlin/Spring Boot backend** (jOOQ + PostgreSQL) and the **researcher-web-app** (Next.js 16 BFF + UI). The field side (Go server, Flutter app) is out of scope here.

This page indexes all **47 findings**. The full document — with the offending code, problem explanation, fix approach, and fixed-code example for every finding — is the source of truth:
📄 **[Download the full audit (DOCX, 47 findings with code)](/files/audits/researcher-code-quality-audit.docx)**
:::

Every finding lists a priority **0–5 (5 = highest)**. Totals: **47 findings — backend 24, frontend 23** (Performance 9 · Readability 11 · Structure 10 · Maintainability 17).

The critical ones (P4–P5) are tracked with decisions in the [Weak-Point Register](/docs/phase-0) (IDs BE-\*/FE-\*).

## Performance (9)

| # | P | Side | Finding | Where |
|---|---|---|---|---|
| P1 | 4 | Backend | Every authenticated request re-runs a 4-table JOIN with array aggregation to reload roles/permissions — no caching, no claims-based auth | `repository/UserRepository.kt` (via `security/JwtAuthenticationFilter.kt`) |
| P2 | 4 | Backend | `FormRepository.fetchRefChoices` re-introspects the entire database schema for every distinct option field | `repository/FormRepository.kt` |
| P3 | 3 | Backend | Excel export loads the entire table into memory and builds a fully in-memory workbook — no streaming, no row limits | `service/XlsxService.kt` |
| P4 | 3 | Backend | List endpoints return the full table with no pagination | `repository/ResearcherRepository.kt` (also Form, Task repos) |
| P5 | 2 | Backend | Pivoting question answers into a per-question table uses nested in-memory loops instead of SQL | `repository/FormResponseRepository.kt` |
| P6 | 3 | Frontend | Two full mapping stacks bundled; one library + two components only used in a dev-gated debug route | `package.json`, `components/map/*` |
| P7 | 3 | Frontend | Dashboard fires 6 unbatched network requests in parallel on every mount instead of 1 | `modules/dashboard/submodule/*` |
| P8 | 3 | Frontend | No request cancellation or caching when rapidly switching years — race condition + wasted requests | `MonthlyVerticalBarChartByYear.tsx` |
| P9 | 1 | Frontend | `SimpleMap` fully tears down and rebuilds the OpenLayers map on every center change | `components/map/SimpleMap.tsx` |

## Readability (11)

| # | P | Side | Finding | Where |
|---|---|---|---|---|
| R1 | 2 | Backend | Debug `print()` left in production analytics service | `service/HarvestAnalyticsService.kt` |
| R2 | 1 | Backend | Hardcoded grade list `listOf("A","B","C")` duplicated across two services | `HarvestAnalyticsService.kt`, `SpatialHarvestAnalyticsService.kt` |
| R3 | 2 | Backend | Stringly-typed mutable map with unsafe casts instead of a typed structure | `repository/LocationRepository.kt` |
| R4 | 1 | Backend | Fully-qualified class names used inline instead of imports | `exception/GlobalExceptionHandler.kt` |
| R5 | 0 | Backend | Duplicate import of the same table in the same file | `repository/FormRepository.kt` |
| R6 | 2 | Frontend | Copy-pasted "User" submodule keeps "Harvest" variable names | `DashboardUserSubmodule.tsx` |
| R7 | 2 | Frontend | Deeply-nested magic-string branching for column rendering | `FormEditTable.tsx` |
| R8 | 1 | Frontend | Dead/redundant branches in the "select all" checkbox handler (3 files) | `Dashboard*Submodule.tsx` |
| R9 | 2 | Frontend | Heavy prop drilling through the auth flow obscures data ownership | `modules/auth/*` |
| R10 | 2 | Frontend | Stray semicolon rendered as literal text inside a table cell | `components/table/FarmTable.tsx` |
| R11 | 1 | Frontend | Invalid CSS color value (hex/keyword typo) | `DashboardSidebar.tsx` |

## Structure (10)

| # | P | Side | Finding | Where |
|---|---|---|---|---|
| S1 | 3 | Backend | `FormResponseController` extends `BaseService`, not `BaseController` — a controller inheriting from the service layer | `controller/FormResponseController.kt` |
| S2 | 3 | Backend | Near-identical report-building logic duplicated wholesale between the two analytics services | `HarvestAnalyticsService.kt` / `SpatialHarvestAnalyticsService.kt` |
| S3 | 2 | Backend | Identical range-validation logic copy-pasted six times in one controller | `controller/AnalyticsController.kt` |
| S4 | 2 | Backend | `BaseRepository`'s entire body is dead, commented-out code | `base/BaseRepository.kt` |
| S5 | 2 | Backend | Duplicate, diverging entity-mapping logic — one live, one dead | `repository/UserRepository.kt` |
| S6 | 2 | Backend | Form logic coupled to an implicit DB naming convention instead of an explicit contract | `repository/FormRepository.kt` |
| S7 | 4 | Frontend | ~250 lines of fetch/chart-color/checkbox logic copy-pasted verbatim across 3 dashboard files | `modules/dashboard/**` |
| S8 | 4 | Frontend | Identical BFF proxy boilerplate copy-pasted into ~11 API route handlers | `app/api/v1/**/route.ts` |
| S9 | 2 | Frontend | `ClickableMap` duplicates ~80% of `UtilityMap` instead of being deleted | `components/map/*` |
| S10 | 3 | Frontend | `FormEditTable` mixes rendering, business rules, and modal state in one 434-line component | `FormEditTable.tsx` |

## Maintainability (17)

| # | P | Side | Finding | Where |
|---|---|---|---|---|
| M1 | 4 | Backend | **Zero automated tests** exist anywhere in the backend | `src/test/` does not exist |
| M2 | **5** | Backend | **Auth cookie not marked `Secure`** — the flag is commented out | `service/CookieService.kt` |
| M3 | 4 | Backend | Exception handler leaks raw exception messages to clients and never logs | `exception/GlobalExceptionHandler.kt` |
| M4 | 4 | Backend | Malformed/tampered JWT crashes the request (500) instead of returning 401 | `service/JwtTokenService.kt` |
| M5 | **5** | Backend | **No `@PreAuthorize` and no ownership check on task responses** — any authenticated user can read any user's responses | `FormResponseController.kt`, `TaskController.kt` |
| M6 | **5** | Backend | **Bulk raw-data export endpoint has no authorization check at all** | `controller/ReportController.kt` |
| M7 | 2 | Backend | Dead code and abandoned features scattered across the codebase | `PostgisGeometryBinding.kt` + 6 more files |
| M8 | 3 | Backend | "Already logged in" modeled as a generic `RuntimeException` → 500 | `AuthenticationController.kt` |
| M9 | **5** | Frontend | **Registration BFF route never calls the backend** — silently does nothing on valid input | `app/api/v1/register/route.ts` |
| M10 | **5** | Frontend | **Register button is wired to nothing** — `AuthForm`'s `onSubmit` is never passed | `AuthRegisterModule.tsx` |
| M11 | **5** | Frontend | `users` GET handler is an unimplemented stub with no return path | `app/api/v1/users/route.ts` |
| M12 | 4 | Frontend | Error-status check uses the `in` operator on an array, **breaking classification of every 5xx response** | `libs/fetchResponse.ts` |
| M13 | 2 | Frontend | Debug `console.log` statements in production render/business paths | `DashboardLayout.tsx` + 2 more |
| M14 | 3 | Frontend | Lorem-Ipsum placeholder shipped as the production Terms of Use users must accept | `AuthLoginModule.tsx` |
| M15 | 3 | Frontend | Only E2E tests exist, with hardcoded credentials and fragile selectors | `tests/*.spec.ts` |
| M16 | 2 | Frontend | A legitimate `0` count renders as an infinite loading spinner (falsy check) | `NumberSummaryCard.tsx` |
| M17 | 2 | Frontend | `BACKEND_URL` silently falls back to `localhost` instead of failing fast | `core/constants/apiConstants.ts` |

## Reading the results

Three clusters matter most for Phase 0's scalability question:

1. **Security before deployment (M2, M5, M6, M4):** the backend cannot go public as-is — session cookies are interceptable and two endpoint groups let any account read or export everyone's data.
2. **A whole feature is broken (M9 + M10 + M11):** self-registration doesn't work end-to-end. Three independent findings line up into one dead user flow — a sign there was no integration test to catch it (M1, M15).
3. **Growth-proportional costs (P1–P4, P7):** per-request auth queries, unpaginated lists, and in-memory exports all work at demo scale and degrade linearly (or worse) with data volume.

Decisions for each: [Weak-Point Register](/docs/phase-0).
