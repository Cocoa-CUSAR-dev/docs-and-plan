---
sidebar_position: 3
title: Fix Roadmap (visual)
---

# DB Fix Roadmap

Visual summary of the suggested fix order from [Fix Decisions](/docs/database/fix-decisions). Original file: `cocoa_project_transfer/db_fix_roadmap.svg`.

![DB fix roadmap](/diagrams/db_fix_roadmap.svg)

**Suggested order:** C1 → C2 (FK only) → C3 → D2 → T1 → T3 — one afternoon, all non-breaking — then O1 (Flyway), then the 🟡 batch under Flyway. 🟢 items become documented decisions rather than debt.

Track progress on the [Critical Issues](/docs/critical-issues) page.
