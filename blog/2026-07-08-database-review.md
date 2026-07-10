---
slug: database-review
title: "Database review completed — 5 critical issues found"
authors: [team]
tags: [database, review]
---

A full review of the handed-over database (65 tables, 8 schemas, seed data, and the live dump) was completed today.

**Headline findings:**

- 🔴 `other.sql` is truncated — the repo cannot rebuild the DB from scratch ([C1](/docs/critical-issues#c1))
- 🔴 `response.task_log_id` links responses to tasks by convention only — no FK, and no `task_log` table exists ([C2](/docs/critical-issues#c2))
- 🔴 Zero UNIQUE constraints anywhere — duplicate usernames are possible ([C3](/docs/critical-issues#c3))
- 🔴 `geo_id` columns aren't linked to `storage.geo` ([D2](/docs/critical-issues#d2))
- 🔴 No migration tool — the root cause of the drift ([O1](/docs/critical-issues#o1))

The good news: the farm → batch traceability chain is fully FK-enforced, seed data cross-checks clean, and conventions are consistent. No data corruption was found.

Full write-ups: [Database Review](/docs/database/db-review) · [Fix Decisions](/docs/database/fix-decisions) · live tracker on [Critical Issues](/docs/critical-issues).
