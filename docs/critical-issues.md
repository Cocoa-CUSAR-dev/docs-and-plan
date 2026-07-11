---
sidebar_position: 7
slug: /critical-issues
title: Critical Issues
---

# Critical Issues — Live Tracker

The known critical points that must be fixed, in priority order. **This page is the living tracker** — when you fix one, change its Status here, note the date, and write a short entry in the [Project Log](/log). The full technical background stays frozen in the [Database Review](/docs/database/db-review) and [Fix Decisions](/docs/database/fix-decisions).

For the complete cross-layer inventory (mobile app, both backends, infrastructure) with fix-or-accept decisions, see the [Phase 0 Weak-Point Register](/docs/phase-0) — this page tracks the **database** items in detail, plus the application-layer criticals below.

Status values: 🟥 **Open** · 🟨 **In progress** · ✅ **Fixed** · 📌 **Accepted** (deliberately not fixing — documented decision)

## Application-layer criticals (from the Phase 0 audits)

Highest-severity items outside the database — full detail in the [audit](/docs/phase-0/researcher-audit) and [register](/docs/phase-0):

| ID | Issue | Severity | Status | Owner | Fixed on |
|---|---|---|---|---|---|
| BE-2 (M5) | Any authenticated user can read anyone's task responses (no `@PreAuthorize`, no ownership check) | 🔴 P5 | 🟥 Open | — | — |
| BE-3 (M6) | Bulk raw-data export endpoint has no authorization at all | 🔴 P5 | 🟥 Open | — | — |
| BE-1 (M2) | Auth cookie not marked `Secure` | 🔴 P5 | 🟥 Open | — | — |
| FE-1 (M9–M11) | Web registration flow broken end-to-end (BFF route no-ops, button wired to nothing) | 🔴 P5 | 🟥 Open | — | — |
| APP-1 | Mobile backend URL hardcoded to a LAN IP over plain HTTP | 🔴 | 🟥 Open | — | — |

## Database summary

| ID | Issue | Severity | Effort | Status | Owner | Fixed on |
|---|---|---|---|---|---|---|
| [C1](#c1) | `other.sql` truncated — repo can't rebuild the DB | 🔴 Critical | 10 min | 🟥 Open | — | — |
| [C2](#c2) | `response.task_log_id` misnamed, no FK | 🔴 Critical | 1 min (FK) | 🟥 Open | — | — |
| [C3](#c3) | No UNIQUE on `username` / roles / permissions | 🔴 Critical | 30 min | 🟥 Open | — | — |
| [D2](#d2) | `geo_id` columns have no FK to `storage.geo` | 🔴 Critical | 5 min | 🟥 Open | — | — |
| [O1](#o1) | No migration tool (root cause of C1) | 🔴 Critical | 1 day | 🟥 Open | — | — |
| [R2](#r2) | Old READMEs document wrong role names | 🟠 High | 15 min | 🟥 Open | — | — |
| [C3b](#more) | Junction pair uniqueness | 🟡 Medium | 30 min | 🟥 Open | — | — |
| [C4](#more) | No secondary indexes (hot paths + GiST) | 🟡 Medium | 1 h | 🟥 Open | — | — |
| [T1](#more) | `farm_activity` varchar PK — fix while empty | 🟡 Medium | 5 min | 🟥 Open | — | — |
| [D1, D4, D6, T3, T4](#more) | Smaller integrity/hygiene fixes | 🟡 Medium | varies | 🟥 Open | — | — |
| [D3, D5a, D5b, T2, T6, T7](#accepted) | Reviewed, leaving is defensible | 🟢 Low | — | 📌 Accepted* | — | — |

\* "Accepted" for the 🟢 group still assumes the small guards recommended in [Fix Decisions](/docs/database/fix-decisions) (e.g. the composite-FK guard for D5a, index + `created_at` for D3) get done eventually.

---

## C1 — `other.sql` is broken; the repo cannot rebuild the database {#c1}

All four trigger functions in `database/other.sql` are truncated mid-body (bodies stop after the first `INSERT` branch — no `ELSIF`/`END IF`/`RETURN NEW`) — the file is **not valid SQL**. The complete versions exist only in `backup.sql` at the CAPSTONE root, next to the transfer folder — and that file is **UTF-16 encoded**, so convert it (`iconv -f UTF-16LE -t UTF-8`) before copying from it. Anyone doing first-time setup either gets a syntax error or skips the triggers, after which the `ref.*_constant` mirror tables silently stop syncing.

**Fix:** copy the full function bodies from `backup.sql` into `other.sql`. Zero risk — the live DB already has the full functions. Details: [Fix Decisions C1](/docs/database/fix-decisions#c1).

**Verify:** run `other.sql` against a scratch DB — it must apply cleanly; insert a row into `agriculture.farm` and confirm `ref.farm_constant` picks it up.

## C2 — `form.response.task_log_id`: misnamed column, no FK, no `task_log` table {#c2}

The column actually holds `form.task.task_id` values (verified against all 21 seed rows), but only by convention — there is no FK and no `task_log` table anywhere. This column links form answers (the core research output) to tasks; nothing stops a response pointing at a deleted or nonexistent task.

**Fix (now, zero risk):**

```sql
ALTER TABLE form.response
    ADD CONSTRAINT fk_response_task FOREIGN KEY (task_log_id) REFERENCES form.task(task_id);
```

Rename to `task_id` later, coordinated with a backend change + jOOQ regen. Details: [Fix Decisions C2](/docs/database/fix-decisions#c2).

## C3 — Zero UNIQUE constraints: duplicate usernames are possible {#c3}

`auth.user_account.username` is nullable and not unique (as are `password_hash`, `role.role_name`, `permission.permission_key`). Two concurrent registrations can race past any app-level check — login-by-username is ambiguous **by design**. This is a security bug, not style.

**Fix:**

```sql
ALTER TABLE auth.user_account
    ALTER COLUMN username SET NOT NULL,
    ALTER COLUMN password_hash SET NOT NULL,
    ADD CONSTRAINT uq_user_account_username UNIQUE (username);
ALTER TABLE auth.role ADD CONSTRAINT uq_role_name UNIQUE (role_name);
ALTER TABLE auth.permission ADD CONSTRAINT uq_permission_key UNIQUE (permission_key);
```

Data is currently clean, so this applies without deduping — the cheapest moment is now. Also fix `hub_collector` (no FK to `user_account` + a `gen_random_uuid()` PK default). Details: [Fix Decisions C3](/docs/database/fix-decisions#c3).

## D2 — `geo_id` columns unlinked to `storage.geo` {#d2}

`farm`, `hub`, and `processing_station` reference geometry rows with no FK. A dangling `geo_id` renders as "no map" with no error — for a *geographic* databank, that's silent data loss.

**Fix:** three one-line `ADD CONSTRAINT ... FOREIGN KEY` statements; seed data already passes. Details: [Fix Decisions D2](/docs/database/fix-decisions#d2).

## O1 — No migration tool {#o1}

Schema changes are manual SQL + "remember to update schema.sql". This process already produced C1 (a corrupted script) and will again. **Root cause issue — fixing this prevents the whole class.**

**Fix:** adopt **Flyway** (fits the existing Gradle + jOOQ stack; jOOQ codegen can run after migrate). Baseline the current schema as V1. Stopgap if there's no capacity: a CI job that spins up Postgres and runs the three SQL files, failing on error. Details: [Fix Decisions O1](/docs/database/fix-decisions#o1).

## R2 — Old READMEs document wrong role names {#r2}

`database/README.md` (and examples in it) say roles are `ADMIN`, `RESEARCHER`, `COLLECTOR`. The live database has lowercase `admin`, `researcher`, `farmer`, `hub_collector`, `processor`. Any code comparing role names against the README breaks.

**Fix:** correct the old README, and keep this docs site as the authoritative reference ([Database component page](/docs/components/database) already uses the correct names). While there, document the `ref.*_constant` mirror-table exception to the "higher normal forms" claim.

---

## Medium-priority batch {#more}

Do these under Flyway once O1 lands (each has a full write-up in [Fix Decisions](/docs/database/fix-decisions)):

- **C3b** — `UNIQUE (a, b)` on junction tables (`farmer_farm`, `plot_breed`, `harvest_collection`, `processor_processing_station`) so the same harvest can't be counted into a batch twice.
- **C4** — indexes on hot-path FKs + **GiST on `storage.geo.geom`** (spatial queries can't use an index at all today).
- **T1** — convert `farm_activity.farm_activity_id` from varchar to uuid **while the table is empty** (now-or-never economics).
- **D1** — drop `harvest.tree_id` unless tree-level tracking is actually planned.
- **D4** — consolidate the three disconnected grade representations onto `ref.grade_constant`.
- **D6** — decide per empty/unused table: wire up or drop (note: `processing_defect_constant` has seed data and clearly wants a missing `batch_defect` junction).
- **T3** — `NOT NULL` on `farm_economic_eval.farm_id` and `harvest.created_at/updated_at`.
- **T4** — CHECK constraints on status enums and quantities.

## Accepted (documented decisions, not debt) {#accepted}

- **D3** — polymorphic `storage.file` stays; add `(table_name, ref_id)` index + `created_at`.
- **D5a** — province/district/subdistrict triple stays; add the composite-FK guard.
- **D5b** — `ref.*_constant` mirrors stay (or become views); triggers must be restored first (C1).
- **T2** — `timestamp` vs `timestamptz`: leave; standardize new tables on `timestamptz`; convert during Flyway adoption.
- **T6** — no `ON DELETE` rules is deliberately RESTRICT-like (correct for traceability data); add CASCADE only on detail/junction tables.
- **T7** — `batch.origin` free-text: rename to `origin_note` or just never report on it.
