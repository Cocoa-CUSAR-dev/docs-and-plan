---
sidebar_position: 8
title: "ADR 0008: Knowledge Base Approach (Phase II)"
---

# ADR 0008: Knowledge Base Approach (Phase II)

## Submitters

* _[Your name]_ (Is Thai Cacao Capstone Team)

## Change Log

* [pending](/docs/plans/architecture-session-notes#knowledge-base) 2026-07-27 — search approach and authoring location only; read-path integration explicitly deferred

## Referenced Use Case(s)

* [EPIC 6 — Knowledge Base (Phase II)](/docs/plans/architecture-session-notes#backlog-check)

## Context

Knowledge Base is Phase II, gated-scope work (Dec 2026 – Apr 2027, strictly after Phase I, never in parallel). This session touched it only enough to avoid closing off Phase I decisions that would make Phase II harder — full design was deliberately not done now, since KB "is Phase II work after all" per the team's own framing this session.

An earlier draft of this session's notes proposed a simplification — letting the chatbot read `kb.*` tables directly, bypassing Kotlin, on the reasoning that KB has one writer (researchers) and many readers (farmers via chatbot). That proposal was **walked back** as premature for a Phase I architecture session and explicitly re-flagged for a dedicated Phase II design pass instead.

## Proposed Design

**Services/modules impacted:** `web-backend` (Kotlin) / `web-app` (Next.js) for authoring — not yet touched by any Phase I work, so no conflict.

**New services/modules:** none decided yet — the read-path (whether the chatbot proxies through Kotlin or reads `kb.*` directly) is exactly the open question.

**Model/DTO impact:** new tables `KnowledgeCard`, `Category`, `Tag` are already named in the `database` repo's own plan for Phase II — not designed further here.

**API impact:** not decided — depends on the read-path question.

**Config/devops impact:** none assessed yet.

## Considerations

**Search approach for MVP — keyword/category (chosen for now) vs. vector/RAG search (deferred).** Keyword/category search is enough to ship a first version; vector/RAG is real additional infrastructure (embeddings, a vector store) that isn't justified until there's evidence keyword search falls short. Deferred, not rejected.

**Authoring location — inside the existing Next.js `web-app` (chosen).** Researchers already have accounts and a UI there; no reason to stand up a separate authoring surface.

**Read-path — chatbot reads `kb.*` directly (proposed, then walked back) vs. chatbot proxies through Kotlin (not yet decided either) vs. genuinely undecided (current status).** The direct-read proposal was reasonable on its own technical merits (single-writer/many-reader shape) but was correctly identified as **out of scope to decide in a Phase I session** — Phase II hasn't been designed yet, and deciding this one piece of it early risks locking in an architecture around assumptions Phase II's own design pass hasn't tested.

**How resolved:** the team explicitly asked for this to be flagged and parked, not resolved — respected here rather than over-deciding.

## Decision

Ratified now, narrowly:
* Search for MVP: keyword/category, not vector/RAG.
* Authoring: inside the existing Next.js `web-app`, no new authoring surface.

**Explicitly deferred to a dedicated Phase II design pass** (~Sprint 11 per the current roadmap):
* Whether the chatbot's read path goes through Kotlin or reads `kb.*` directly.
* The full `KnowledgeCard`/`Category`/`Tag` schema shape.
* Any KB-specific API surface.

Caveats: this ADR should be revisited (via an **amended** Change Log entry, not a rewrite) once that Phase II design pass happens — don't let the two narrow decisions above quietly expand to cover the read-path question without a real discussion.

Unsatisfied requirements: the read-path decision itself, and everything downstream of it.

## Other Related ADRs

* None yet — this is intentionally light until the Phase II design pass.

## References

* [Architecture Review recap — Part 4.8](/docs/plans/architecture-session-notes#knowledge-base)
* [Architecture Review recap — Part 3, backlog check](/docs/plans/architecture-session-notes#backlog-check)
