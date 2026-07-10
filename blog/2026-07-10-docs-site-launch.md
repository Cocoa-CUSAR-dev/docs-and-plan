---
slug: docs-site-launch
title: "Docs site launched"
authors: [team]
tags: [docs]
---

This documentation site is now the team's knowledge base for the Cocoa Databank project. It consolidates the handover folder into:

- **[Project Overview](/docs/intro)** and **[Architecture](/docs/architecture/overview)** — start here if you're new
- **[Component pages](/docs/components/database)** — one per deliverable, adapted from the original READMEs (with known errors corrected)
- **[Database Deep Dive](/docs/database/db-review)** — the 2026-07-08 review and fix decisions, frozen as reference
- **[Critical Issues](/docs/critical-issues)** — the *living* tracker; update statuses there as fixes land
- **[Roadmap](/docs/plans/roadmap)** — phased plan starting with DB stabilization
- **[Archive](/docs/archive)** — every legacy report, manual, presentation, and dataset, hosted or indexed

**How to work with the site:** docs live in `cocoa-docs/docs/` as Markdown; run `npm start` inside `cocoa-docs/` to preview. Decisions and milestones get a short post in this log (`cocoa-docs/blog/`).
