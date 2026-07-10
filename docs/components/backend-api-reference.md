---
sidebar_position: 2.5
title: Web Backend API Reference
---

# Web Backend API Reference

:::info[Team analysis document]
Endpoint inventory of the Kotlin backend, contributed by the team (2026-07-10). Original: 📄 **[Download (PDF)](/files/audits/researcher-api-reference.pdf)**. Live Swagger UI is available when the server runs — see [Web Backend](/docs/components/backend-web#api-reference).
:::

All routes are mounted under the context path **`/api/v1`**. Controllers live in `src/main/kotlin/com/cocoa/web/controller/`.

"Required authority" is the Spring Security `@PreAuthorize` permission string. **"none declared" means the endpoint is reachable by any authenticated user** (protected only by the global JWT filter) — see the warning at the bottom.

## Authentication — `/auth`

| Method | Path | Required authority | Function |
|---|---|---|---|
| GET | `/auth/me` | `read:profile:own` | Returns the logged-in user's profile |
| POST | `/auth/register` | public | Self-registration for a new user |
| POST | `/auth/login` | public | Authenticates credentials, sets JWT as an HTTP cookie |
| GET | `/auth/logout` | authenticated | Clears the JWT cookie |
| PATCH | `/auth/reset-password` | `update:profile:own` | Updates password, clears the current session cookie |

## Admin — `/admin`

| Method | Path | Required authority | Function |
|---|---|---|---|
| POST | `/admin/users` | `create:user:any` | Creates a researcher account with a forced password-reset flag |

## Researchers — `/researchers`

| Method | Path | Required authority | Function |
|---|---|---|---|
| POST | `/researchers/register` | `create:researcher:own` | Links a researcher profile (name, org) to the calling user |
| GET | `/researchers` | `read:researcher:all` | Lists/searches researchers with query filters |
| GET | `/researchers/me` | `read:researcher:own` | Returns the caller's own researcher profile + roles |
| GET | `/researchers/{userId}` | `read:researcher:all` | Gets a specific researcher by ID |
| PATCH | `/researchers/{userId}` | `update:researcher:own` | Updates a researcher profile (code also enforces self-only) |
| DELETE | `/researchers/{userId}` | `delete:researcher:any` | Deletes a researcher profile |

## Forms — `/forms`

| Method | Path | Required authority | Function |
|---|---|---|---|
| GET | `/forms` | `read:form:all` | Lists all available data-collection forms |
| GET | `/forms/{formId}` | `read:form:all` | Gets the structure/schema of one form |
| PUT | `/forms/{formId}/edit` | `update:form:all` | Updates a form's configuration |

## Tasks — `/tasks`

| Method | Path | Required authority | Function |
|---|---|---|---|
| GET | `/tasks` | ⚠️ none declared | Lists all tasks (form-filling assignments) |
| GET | `/tasks/{taskId}` | ⚠️ none declared | Gets a single task's details |
| GET | `/tasks/{taskId}/responses` | ⚠️ none declared | Lists submitted form responses for a task |
| GET | `/tasks/{taskId}/responses/{responseId}` | ⚠️ none declared | Gets one specific form response |

## Analytics — `/analytics`

All require `read:report:all` and take a date-range filter (`from`/`to`, validated `from ≤ to`).

| Method | Path | Function |
|---|---|---|
| GET | `/analytics/harvest/time-series/sum` | Cumulative harvest volume over time |
| GET | `/analytics/harvest/time-series/delta` | Month-over-month change in harvest volume |
| GET | `/analytics/harvest/time-series/average` | Average harvest amount per month |
| GET | `/analytics/harvest/time-series/frequency` | Count of harvest records per month |
| GET | `/analytics/harvest/summary/total` | Total harvest quantity in range |
| GET | `/analytics/harvest/summary/count` | Total number of harvest records in range |
| GET | `/analytics/users/time-series/sum` | Cumulative user growth over time |
| GET | `/analytics/users/time-series/delta` | Monthly change in user count |
| GET | `/analytics/users/summary/count` | Total user count in range |

## Spatial Analytics — `/analytics/harvest/spatial`

All require `read:report:all`. POST because each call carries a **GeoJSON polygon body** (the map-drawn area) plus `from`/`to`/`gradeCode` query params.

| Method | Path | Function |
|---|---|---|
| POST | `/time-series/delta` | Monthly harvest change within the drawn area |
| POST | `/time-series/sum` | Cumulative harvest within the drawn area |
| POST | `/time-series/average` | Monthly average harvest weight within the area |
| POST | `/time-series/frequency` | Monthly event count within the area |
| POST | `/summary/total` | Total harvest weight within the area |
| POST | `/summary/count` | Total event count within the area |

## Reports — `/reports`

| Method | Path | Required authority | Function |
|---|---|---|---|
| GET | `/reports/raw-data/download?sheets=FARM,HARVEST` | ⚠️ none declared | Generates and streams an `.xlsx` (Apache POI) with the requested raw-data sheets; defaults to all sheets |

## Test/Debug

| Method | Path | Required authority | Function |
|---|---|---|---|
| GET | `/public/test` | public | Sanity check, returns a static string |
| GET | `/test` | authenticated | Sanity check that JWT auth works |

:::warning[The ⚠️ rows are open security findings]
Tasks, task responses, and the bulk raw-data export declare **no authority requirement** — any authenticated user can read anyone's form responses and export the whole dataset. Tracked as [BE-2 and BE-3 in the Weak-Point Register](/docs/phase-0#2-kotlin-web-backend-researcher-side) (audit findings M5/M6).
:::
