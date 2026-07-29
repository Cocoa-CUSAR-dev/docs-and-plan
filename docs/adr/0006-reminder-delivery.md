---
sidebar_position: 6
title: "ADR 0006: Reminder Delivery & Scheduling"
---

# ADR 0006: Reminder Delivery & Scheduling

## Submitters

* _[Your name]_ (Is Thai Cacao Capstone Team)

## Change Log

* [approved](/docs/plans/architecture-session-notes#reminders) 2026-07-27

## Referenced Use Case(s)

* [EPIC 4 — Reminders & To-do](/docs/plans/architecture-session-notes#backlog-check)

## Context

Reminders need a scheduled push to farmers on a cadence tied to a task (e.g. "log today's harvest"), delivered via LINE. The risk register already carries a mitigation for reminders that never got turned into real backlog scope — the rich-menu-to-do fallback (for farmers who don't act on a push) exists only as a sentence in the risk register, not a committed task under EPIC 4. This was confirmed directly with the team as a gap to flag, not to design further here.

## Proposed Design

**Services/modules impacted:** the chatbot service ([ADR 0003](/docs/adr/chatbot-service-stack)) — APScheduler drives the periodic reminder check; LINE push/multicast delivers it.

**New services/modules:** none beyond the chatbot service.

**Model/DTO impact:** `notify.reminder_schedule` (cadence per task) and `notify.reminder_log` (delivery record, including a `channel` value reserved for the rich-menu fallback) — full shape in [ADR 0005](/docs/adr/data-model-changes).

**API impact:** none new beyond what the chatbot service already exposes for LINE push delivery.

**Config/devops impact:** none beyond APScheduler already covered in [ADR 0003](/docs/adr/chatbot-service-stack).

## Considerations

The main design question was where scheduling logic lives and how it avoids double-sends. **APScheduler-driven periodic check (chosen)**, consistent with the LLM-retry job's own mechanism ([ADR 0004](/docs/adr/llm-extraction-approach)) — one scheduling tool for both jobs, not two.

**Idempotency key — `notify.reminder_log` itself (chosen) vs. APScheduler's in-memory job state (rejected).** APScheduler's own in-memory state doesn't survive a process restart; if the periodic check used that as its source of truth for "already sent today," a restart would risk duplicate sends. Checking against the persisted `notify.reminder_log` table instead survives restarts and matches how the rest of the system already treats the database as the durable source of truth.

**Rich-menu-to-do fallback — not designed here (flagged, not decided).** Considered folding a full fallback-channel design into this ADR; correctly deferred since it isn't committed backlog scope yet. `notify.reminder_log.channel` already reserves a value for it so adding it later doesn't require a schema change.

**How resolved:** decided directly with the team — APScheduler-driven, log-table-idempotent; fallback flagged as an action item for the team to add to the backlog, not designed now.

## Decision

Agreed implementation:
* APScheduler runs the periodic reminder check (same mechanism as the LLM-retry job).
* The check's idempotency source of truth is `notify.reminder_log`, not APScheduler's in-memory state — this must hold even across a service restart.
* Delivery channel for MVP: LINE push/multicast only.

Caveats: reminders sent via LINE push are a **costed** send (outside any reply-token window by definition, since they're proactive) — cost/volume implications are not yet modeled.

Deferred: the rich-menu-to-do fallback channel itself — no story exists for it yet under EPIC 4.

Unsatisfied requirements: a real backlog task for the fallback channel needs to be added by the team; this ADR doesn't create it.

## Other Related ADRs

* [ADR 0003 — Chatbot Service Stack](/docs/adr/chatbot-service-stack) - owns the APScheduler mechanism this reuses
* [ADR 0004 — LLM Extraction Approach](/docs/adr/llm-extraction-approach) - the other consumer of the same scheduling mechanism
* [ADR 0005 — Data Model Changes](/docs/adr/data-model-changes) - owns the `notify.*` table definitions

## References

* [Architecture Review recap — Part 4.6](/docs/plans/architecture-session-notes#reminders)
* [LINE Messaging API — push/multicast messages](https://developers.line.biz/en/docs/messaging-api/sending-messages/)
* [APScheduler](https://apscheduler.readthedocs.io/)
