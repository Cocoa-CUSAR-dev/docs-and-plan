---
sidebar_position: 2
title: Fix Decisions
---

# DB Review — Fix Decisions (Leave vs Fix, Pros/Cons)

:::info[Snapshot document]
Companion to the [Database Review](/docs/database/db-review) (2026-07-08). For each finding: options, pros/cons, and a recommendation. Current status of each item lives in [Critical Issues](/docs/critical-issues).
:::

**Clarification up front:** every table HAS a primary key. The findings were about (a) no indexes *besides* the PK, (b) no UNIQUE constraints *besides* the PK, and (c) junction tables using surrogate PKs instead of composite PKs. None of the 65 tables is missing a PK.

Legend: 🔴 fix now · 🟡 fix when convenient · 🟢 leaving it is defensible

---

## C1. `other.sql` truncated (broken trigger functions) — 🔴 FIX {#c1}

**Option A — Restore full functions from `backup.sql` into `other.sql`.**
Pros: 10-minute fix; repo becomes rebuildable; zero risk to the live DB (it already has the full functions).
Cons: none.

**Option B — Leave it.**
Pros: nothing.
Cons: anyone rebuilding from `database/` gets a syntax error, or skips triggers and the `*_constant` mirrors silently stop syncing. Since you have no migration tool, these files are your only source of truth.

**Recommendation:** Option A, immediately. This is a documentation-integrity bug, not a design debate.

---

## C2. `response.task_log_id` — misnamed, no FK — 🔴 FIX (at least the FK) {#c2}

**Option A — Rename to `task_id` + add FK to `form.task`.**
Pros: schema tells the truth; DB blocks orphan responses; jOOQ regenerates clean names.
Cons: rename breaks existing backend queries — needs a coordinated code change + jOOQ regen; brief maintenance window.

**Option B — Add the FK only, keep the name.**
Pros: integrity enforced with zero code changes (seed data already passes, so it applies cleanly).
Cons: misleading name lives on; every new developer searches for a `task_log` table.

**Option C — Leave it.**
Pros: no work.
Cons: nothing stops a response pointing at a deleted/nonexistent task; the data linking forms to answers — the core research output — is protected only by app-code discipline.

**Recommendation:** B now (one statement, no risk), A when you next touch the backend. Do not leave as-is: this column is the backbone of your survey data.

---

## C3. No UNIQUE constraints — 🔴 FIX the identity ones, 🟡 the rest {#c3}

Split into two groups:

**Group 1 — identity/auth (`username`, `role_name`, `permission_key`)**

Fix: add UNIQUE (+ NOT NULL on `username`/`password_hash`).
Pros: duplicate logins become impossible at the DB level; login-by-username is currently ambiguous by design — that's a security bug, not style; also gives you a free index on `username`, speeding up login.
Cons: if duplicates ever get inserted before the fix, the ALTER fails and you must dedupe first (today the data is clean — cheapest moment to do it).
Leave-it case: none. An auth table where usernames aren't unique is broken even if the app checks — two concurrent registrations can race past an app-level check.
**Recommendation:** fix now.

**Group 2 — junction pair uniqueness (`farmer_farm`, `plot_breed`, `harvest_collection`, `processor_processing_station`)**

Option A — add `UNIQUE (col1, col2)` alongside the surrogate PK.
Pros: prevents double-links (same harvest counted into a batch twice = double-counted kg); non-breaking, keeps existing PK so no code change.
Cons: one more index per table (trivial at your scale).

Option B — replace surrogate PK with composite PK.
Pros: textbook-correct; one fewer column.
Cons: breaks jOOQ-generated code and any API exposing the surrogate ID; not worth the churn.

Option C — leave it.
Pros: no work; the mobile app may rely on single-column IDs for updates.
Cons: duplicate rows are silent data-quality poison for research analytics — hard to detect later.
**Recommendation:** Option A. All the protection, none of the breakage.

---

## C4. No secondary indexes — 🟡 FIX, but scoped to reality {#c4}

**Option A — Index every FK + GiST on `geo.geom` (script in DB_REVIEW §6 P2).**
Pros: joins stop being sequential scans; PostGIS spatial queries become usable; indexes are non-breaking and reversible.
Cons: each index slows writes slightly and takes disk; at your current data volume (dozens–hundreds of rows/table) you will feel no difference today.

**Option B — Index only the hot paths** (harvest/batch traceability joins, `question.section_id`, `response.user_id`, `file(table_name, ref_id)`, `geo` GiST).
Pros: 90% of the benefit, minimal clutter.
Cons: you'll revisit later as data grows.

**Option C — Leave it.**
Pros: honestly fine *today* — Postgres seq-scans small tables faster than index scans anyway.
Cons: this is a databank meant to accumulate years of records; performance decay is gradual and nobody notices until dashboards crawl. Retrofitting is easy but usually happens during a fire.

**Recommendation:** Option B now, A as data grows. The GiST index is the exception — add it regardless, spatial queries without it don't scale past trivial sizes.

---

## D1. `harvest.tree_id` — no `tree` table, all NULL — 🟡 DECIDE, then act {#d1}

**Option A — Drop the column.**
Pros: schema stops advertising a feature that doesn't exist; trivially cheap (column is 100% NULL).
Cons: if per-tree tracking is on the roadmap (it was likely planned for tree-level traceability), you'll re-add it later — also cheap.

**Option B — Implement `agriculture.tree` + FK.**
Pros: enables tree-level traceability, genuinely valuable for research.
Cons: real scope — mobile app UI, data collection burden on farmers.

**Option C — Leave it.**
Pros: keeps the option open with zero effort.
Cons: dead columns mislead every reader; no FK means if someone starts writing values, they're unvalidated garbage.

**Recommendation:** A unless the team confirms tree-tracking is planned this year; if planned, B properly. C is the worst of both.

---

## D2. `geo_id` columns with no FK to `storage.geo` — 🔴 FIX {#d2}

**Option A — Add the three FKs.**
Pros: one-liner each; seed data already passes; prevents orphan geometry references (a farm pointing to a deleted boundary polygon).
Cons: deleting a geo row now requires clearing references first — that's the point.

**Option B — Leave it.**
Pros: apps can delete geo rows freely.
Cons: farm boundaries are core data for a *geographic* supply-chain databank; a dangling `geo_id` renders silently as "no map" and nobody knows why.

**Recommendation:** A. No real trade-off exists.

---

## D3. `storage.file` polymorphic (`table_name` + `ref_id`) — 🟢 LEAVE the pattern, patch around it {#d3}

**Option A — Keep polymorphic, add `(table_name, ref_id)` index + `created_at` + app-level orphan cleanup.**
Pros: keeps one generic file store (the reason it was built); fixes the practical pain points.
Cons: referential integrity remains unenforceable at DB level — accepted trade-off.

**Option B — Split into per-domain file tables (`farm_file`, `batch_file`, ...) with real FKs.**
Pros: full integrity.
Cons: table explosion, upload code rewritten per domain, migration of existing rows. Heavy.

**Option C — Leave exactly as-is.**
Cons: unindexed lookups + no timestamps on an append-heavy table.

**Recommendation:** A. Polymorphic file stores are a standard, defensible pattern; just don't leave it unindexed and undated.

---

## D4. Three disconnected grade representations — 🟡 FIX by consolidation {#d4}

**Option A — Make `grade_constant.grade_name` UNIQUE, FK `harvest_grade_detail.grade_code` → it, drop empty `cocoa_bean_grade_constant`.**
Pros: one source of truth; typos ('a', 'A ') become impossible; seed data ('A','B','C') already matches, so it applies cleanly; keeps the readable code as the key (no uuid join needed for display).
Cons: adding a new grade now requires a lookup row first — again, that's the point.

**Option B — Leave it.**
Pros: flexibility to invent grades on the fly.
Cons: your ML grading dataset (A/B/C image classes) and the DB grades drift independently; analytics group by a free-text field.

**Recommendation:** A. This is also the cheapest moment — the FK will only get harder to add as ungoverned values accumulate.

---

## D5a. Province/district/subdistrict triple on 6 tables — 🟢 LEAVE, with a guard {#d5a}

**Option A — Leave the triple, add a composite-FK guard.**
Make `subdistrict_constant(subdistrict_id, district_id)` and `district_constant(district_id, province_id)` UNIQUE, then add composite FKs from the 6 tables. The triple stays (fast reads, no joins for the app's address dropdowns) but can no longer be internally inconsistent.
Pros: keeps app queries simple; closes the "farm in subdistrict X but province Y" hole; no app changes.
Cons: a handful of extra constraints; slightly unusual pattern (worth a README note).

**Option B — Normalize: keep only `subdistrict_id`, derive the rest via joins.**
Pros: textbook 3NF; impossible to be inconsistent.
Cons: every address query grows two joins; backend + mobile changes; jOOQ regen; for a capstone-scale system, cost exceeds benefit.

**Option C — Leave exactly as-is.**
Pros: zero work; the app UI (cascading dropdowns) probably keeps it consistent in practice.
Cons: "probably" — one direct SQL insert or app bug creates geographically impossible records that poison regional analytics.

**Recommendation:** A. It's the pragmatic middle: denormalized reads, enforced consistency. B only if you were rebuilding from scratch.

---

## D5b. `ref.*_constant` mirror tables + sync triggers — 🟢 LEAVE (but fix C1 first) {#d5b}

**Option A — Keep, restore triggers (C1), document as intentional denormalization.**
Pros: they exist to give the form engine / dropdowns a uniform "lookup" interface; triggers keep them honest; verified in sync today.
Cons: hidden write amplification; `ref` schema now depends on domain schemas (inverted dependency) — needs a README note so nobody "cleans it up".

**Option B — Drop mirrors, use views instead** (`CREATE VIEW ref.farm_constant AS SELECT farm_id, farm_name FROM agriculture.farm`).
Pros: zero drift risk forever, no triggers to break; same read interface.
Cons: jOOQ treats views slightly differently; any code inserting into the mirrors breaks.

**Recommendation:** B is architecturally cleaner and worth it *if* nothing writes to the mirrors directly (likely true — triggers do the writing). If unsure, A. Either way fix C1 first so the current mechanism isn't broken on rebuild.

---

## D6. Empty/unused tables (`location_type_constant`, `cocoa_bean_grade_constant`, `fertilizer_application_stage_constant`, `question_visibility`; `processing_defect_constant` seeded but unreferenced) — 🟡 DECIDE per table {#d6}

**Fix (drop):** less noise, honest schema. Cheap: they're empty.
**Fix (wire up):** `processing_defect_constant` is the interesting one — it has real seed data (4 defects) and clearly wants a `batch_defect` junction that was never built. If defect tracking matters to the research, build the junction.
**Leave:** harmless placeholders, someone may have plans.
**Recommendation:** ask the team, then either wire up or drop within one release. Placeholder tables with no owner rot. `question_visibility.role` — if kept, FK it to `auth.role`.

---

## T1. `farm_activity.farm_activity_id` is varchar (only non-uuid PK) — 🟡 FIX NOW or accept forever {#t1}

**Fix (convert to uuid):** the table AND its two junction children are empty — the conversion is three ALTERs with zero data risk. This is a now-or-never economy: once activity data starts flowing, converting requires mapping every reference.
**Leave:** works fine functionally; jOOQ just types it String.
**Recommendation:** fix while the tables are empty. The cost asymmetry (5 minutes now vs migration project later) decides it.

---

## T2. `timestamp` vs `timestamptz` inconsistency — 🟢 LEAVE (until a migration tool exists) {#t2}

**Fix:** convert all to timestamptz. Pros: correct across DST/timezone edge cases, safe if servers/users ever span zones. Cons: touches nearly every table; subtle app-behavior changes; risky without migration tooling and tests.
**Leave:** all data is Thailand (UTC+7, no DST) — the failure modes mostly can't trigger.
**Recommendation:** leave for now; standardize on timestamptz for all *new* tables, and fold the conversion into the Flyway adoption (O1) when it happens.

---

## T3. Nullability inconsistencies — 🟡 FIX the meaningful ones {#t3}

Fix now (data already complies, one ALTER each): `farm_economic_eval.farm_id` NOT NULL; `harvest.created_at/updated_at` NOT NULL.
Leave: address-field nullability differences between actor types (collectors/processors may legitimately lack full addresses); `birthdate` vs `birth_date` naming — annoying, but renaming breaks code for cosmetic gain. Note it in conventions doc instead.

---

## T4. No CHECK constraints on statuses/quantities — 🟡 FIX cheaply {#t4}

**Fix:** CHECKs on status enums (`assignment.status`, `task.task_type`, `file.status`), `quantity_kg >= 0`, `ends_at > started_at` on fermentation/drying.
Pros: one line each; catches app bugs at the last line of defense; self-documents valid values.
Cons: adding a new status later requires an ALTER — mild friction, and honestly a feature (forces the change to be deliberate).
**Recommendation:** add for statuses and quantities. Skip exotic ones. Verify seed values pass first (they do for `assignment`; check `response.status` values before constraining it).

---

## T6. No ON DELETE rules on any FK — 🟢 LEAVE mostly, with two exceptions {#t6}

**Leave (default NO ACTION = RESTRICT-ish):** for a traceability databank this is arguably *correct* — you should not be able to delete a farm that has harvest history. Accidental CASCADE is far more dangerous here than manual cleanup.
**Fix selectively:** `ON DELETE CASCADE` makes sense only for pure detail rows: `harvest_grade_detail`, junction tables (`farm_activity_chemical`, etc.), `question_visibility`. 
**Recommendation:** keep NO ACTION as the policy, add CASCADE only on the composite-PK detail/junction tables. Document the policy.

---

## T7. `batch.origin` free-text — 🟢 LEAVE, demote {#t7}

Origin is already derivable via `harvest_collection → harvest → farm`. The column is redundant, but it may serve as a human-entered label for batches with no linked harvest (bought-in beans?).
**Fix:** drop it, or rename to `origin_note` to signal it's informal.
**Leave:** harmless as long as nobody treats it as authoritative.
**Recommendation:** rename to `origin_note` (or just document it); don't build reports on it.

---

## O1. No migration tool — 🔴 FIX (root cause of C1) {#o1}

**Option A — Adopt Flyway.**
Pros: fits the existing Gradle + jOOQ stack natively (flyway-gradle-plugin; jOOQ codegen can run after migrate); `schema.sql`/`other.sql` drift becomes structurally impossible; every change is reviewable history. C1 would have been caught on first run.
Cons: initial setup (~a day): baseline the current schema as V1, team learns the workflow.

**Option B — Keep manual scripts, add a CI check** that spins up Postgres, runs the three files, and fails on error.
Pros: catches broken files (would have caught C1) without changing workflow.
Cons: still no change history, still manual apply, drift between environments remains possible.

**Option C — Leave it.**
Cons: you already have one corrupted script; the process that produced it is unchanged.

**Recommendation:** A for the project's future; B as the 1-hour stopgap if the team is near handover and won't adopt tooling.

---

## Summary table

| # | Issue | Verdict | Effort | Breaks code? |
|---|-------|---------|--------|--------------|
| C1 | other.sql truncated | 🔴 Fix now | 10 min | No |
| C2 | task_log_id no FK | 🔴 FK now, rename later | 1 min / later | No / Yes |
| C3 | username etc. not unique | 🔴 Fix now | 30 min | No |
| C3b | junction pair uniqueness | 🟡 UNIQUE alongside PK | 30 min | No |
| C4 | no secondary indexes | 🟡 hot paths + GiST now | 1 h | No |
| D1 | tree_id dead column | 🟡 drop or implement | 5 min / project | No |
| D2 | geo_id no FK | 🔴 Fix now | 5 min | No |
| D3 | polymorphic file | 🟢 keep, index + created_at | 15 min | No |
| D4 | grade chaos | 🟡 consolidate on grade_constant | 30 min | No |
| D5a | address triple | 🟢 keep + composite-FK guard | 1 h | No |
| D5b | mirror tables | 🟢 keep (or views) | 0 / half day | No / maybe |
| D6 | unused tables | 🟡 decide per table | varies | No |
| T1 | varchar PK | 🟡 convert while empty | 5 min | jOOQ regen |
| T2 | timestamp types | 🟢 leave, new tables tz | 0 | — |
| T3 | nullability | 🟡 two ALTERs | 5 min | No |
| T4 | no CHECKs | 🟡 statuses + quantities | 30 min | No |
| T6 | no ON DELETE | 🟢 keep policy, CASCADE details | 30 min | No |
| T7 | batch.origin | 🟢 rename/document | 5 min | Minor |
| O1 | no migrations | 🔴 Flyway (or CI check) | 1 day / 1 h | No |

**Suggested order:** C1 → C2(FK) → C3 → D2 → T1 → T3 (one afternoon, all non-breaking) → then O1 → then the 🟡 batch under Flyway → treat 🟢 items as documented decisions rather than debt.
