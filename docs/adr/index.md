---
sidebar_position: 1
slug: /adr
title: Architecture Decision Records
---

# Architecture Decision Records

Formal, one-per-decision records for the architecture work behind the LINE OA chatbot / app modernization / Knowledge Base / Computer Vision plan. Each follows the same template (Submitters, Change Log, Referenced Use Case(s), Context, Proposed Design, Considerations, Decision, Other Related ADRs, References) so any decision can be read on its own, without the rest of the project's history.

For the story of how these were reached — the old-system audit, the constraints it created, and the reasoning behind each choice — read the **[Architecture Review recap](/docs/plans/architecture-session-notes)** first. This index is the reference; that page is the narrative.

Change Log status values: **pending** · **approved** · **amended** · **deprecated**.

| # | Decision | Status |
|---|---|---|
| [0001](/docs/adr/old-new-integration-seam) | Old↔new integration seam — where the chatbot plugs into the existing system | ✅ approved |
| [0002](/docs/adr/line-identity-linking) | LINE identity linking & farmer registration | ✅ approved |
| [0003](/docs/adr/chatbot-service-stack) | Chatbot service technology stack | ✅ approved |
| [0004](/docs/adr/llm-extraction-approach) | LLM extraction approach & Graceful Degradation | ✅ approved, amended 2026-07-27 (diary extraction scope deferred) |
| [0005](/docs/adr/data-model-changes) | Data model changes & migration ownership | ✅ approved |
| [0006](/docs/adr/reminder-delivery) | Reminder delivery & scheduling | ✅ approved |
| [0007](/docs/adr/deployment-and-hosting) | Deployment, CI/CD & hosting | ⏳ pending |
| [0008](/docs/adr/knowledge-base-approach) | Knowledge Base approach (Phase II) | ⏳ pending |
| [0009](/docs/adr/computer-vision-direction) | Computer Vision technology direction (Phase II) | ⏳ pending |

:::tip[Keeping these current]
When a **pending** item gets decided, update that ADR's Change Log (new status + date), fill in its Decision section, and flip its row above. Don't edit history in place — if a decided ADR needs to change later, add an **amended** Change Log entry rather than rewriting the original Decision section.
:::
