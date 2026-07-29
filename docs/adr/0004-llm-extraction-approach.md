---
sidebar_position: 4
title: "ADR 0004: LLM Extraction Approach & Graceful Degradation"
---

# ADR 0004: LLM Extraction Approach & Graceful Degradation

## Submitters

* _[Your name]_ (Is Thai Cacao Capstone Team)

## Change Log

* [approved](/docs/plans/architecture-session-notes#llm-extraction) 2026-07-27 — core approach and provider abstraction
* [pending](/docs/plans/architecture-session-notes#llm-extraction) — diary extraction (US2-6/7/8) itself, deferred pending real Thai-language test data
* [amended](/docs/architecture/target-architecture#state-machine) 2026-07-27 — corrected the guided-flow trigger condition (was wrongly conflating "partial extraction" with "LLM failure") and made the LLM↔guided switch bidirectional and interruptible mid-loop, not a one-way handoff

## Referenced Use Case(s)

* [US2-1 — Guided conversational form filling](/docs/plans/architecture-session-notes#backlog-check)
* [US2-6/7/8 — Diary/free-text extraction and researcher review](/docs/plans/architecture-session-notes#backlog-check)
* Risk register: *"LLM cost/latency"* — [Roadmap (Engineering)](/docs/plans/architecture-session-notes#backlog-check)

## Context

The chatbot's core pitch is that a farmer can describe what happened in free text instead of answering a rigid wizard. That requires an LLM call to turn free text into the same slots the guided flow already collects (`question.is_mandatory` already defines what's required — this is the natural mapping point, not a new concept). Two real constraints shape this: no GPU budget for self-hosting, and Thai-language extraction quality for agronomy text is genuinely unknown until real field data exists — this can't be judged from a vendor spec sheet.

The project's own risk register (Roadmap workbook) already independently names LLM cost/latency as a risk, with mitigation *"cap usage, cache, allow manual fallback; treat as enhancement not hard dependency"* — this decision operationalizes that same instinct into an actual mechanism.

## Proposed Design

**Services/modules impacted:** the chatbot service ([ADR 0003](/docs/adr/chatbot-service-stack)) — LLM calls, slot-filling logic, and the guided-flow fallback all live here as one engine, not two.

**New services/modules:** none beyond the chatbot service; the "LLM path" and "guided path" are two entry points into the same slot-filling logic, not separate systems.

**Model/DTO impact:** `chat_conversation_answer.source` column (`guided_flow` / `llm_extracted`) — see [ADR 0005](/docs/adr/data-model-changes) — makes "researcher reviews AI-extracted fields" (US2-8) checkable later without a redesign. A thin LLM-retry queue table shape is noted but left minimal since diary extraction itself is deferred.

**API impact:** none external; internal to the chatbot service's own conversation-handling logic.

**Config/devops impact:** the model/provider is a config string (LiteLLM), not a code change — switching providers or models requires no redeploy beyond a config update.

## Considerations

**Hosted API (chosen) vs. self-hosting a model (rejected).** No GPU budget or ops capacity for self-hosting on a 4-person student team; rejected outright, not a close call.

**LiteLLM (chosen) vs. LangChain (rejected) for provider abstraction.** LiteLLM gives a unified interface across 100+ providers where switching models is a `model=` string change, with structured/JSON-mode output supported consistently across providers — exactly the surface this needs. LangChain was rejected as more machinery than required: its chains/agents/memory abstractions solve problems ("multi-step agentic reasoning," "long conversational memory management") this use case doesn't have. The requirement here is narrow — "call an LLM against a fixed schema" — and LiteLLM matches that narrowness directly.

**PII boundary (agreed):** only the free-text needed for extraction is sent to the LLM provider — never full farmer PII (name, contact info, location beyond what a specific form question asks for).

**Diary extraction scope (US2-6/7/8) — deferred, not designed further now.** Considered designing the full extraction pipeline this session; rejected as premature because provider accuracy against real Thai agronomy free-text is unknown, and guessing at prompt/schema design without real samples risks building the wrong thing. The guided flow (US2-1) works standalone regardless, so nothing is blocked by this deferral.

**How resolved:** decided directly with the team — hosted API, provider-agnostic via LiteLLM, PII-bounded; diary extraction explicitly punted to the team pending real test data.

## Decision

**Graceful LLM-to-Flow Degradation** (the mechanism this ADR formalizes): the LLM path is the *first pass* of the same slot-filling engine already used for guided form-filling — not a separate system to build and maintain in parallel.

1. Farmer sends free text → chatbot sends it to the LLM against the required-fields schema for the current task (the same slots `question.is_mandatory` already defines).
2. All required slots filled with confidence → show a confirmation summary, ask the farmer to confirm before submitting.
3. ~~Any slot unfilled (partial extraction, low confidence, or total LLM failure) → guided flow for only the missing slots — one question at a time, the same engine as the plain wizard (US2-1). Never a full restart.~~ **— superseded, see Amendment below.**
4. ~~Past a time budget (exact threshold not yet decided), the farmer is switched to the guided flow immediately — never blocked waiting on an LLM retry. The original free-text message is preserved, flagged "not yet extracted."~~ **— superseded, see Amendment below.**
5. A cron job (APScheduler, [ADR 0003](/docs/adr/chatbot-service-stack)) later finds unextracted sessions and retries LLM extraction in batch, fully decoupled from task completion — this never gates or blocks the farmer's already-submitted task.
6. If that late pass finds something new, any follow-up message to the farmer is necessarily a **paid push** (outside LINE's ~60-second reply-token window — verified against LINE's own docs). What happens with a late finding (auto-create a record vs. flag for researcher review vs. stay informational) is an **open question, not yet decided**.

### Amendment (2026-07-27) — corrects steps 3 and 4

Working through the full state machine (see the [Target Architecture state-machine diagram](/docs/architecture/target-architecture#state-machine) for the authoritative visual) surfaced two real errors in steps 3–4 above, not just a diagramming nuance:

**Corrected step 3 — "partial" is not the same as "failed."** If slots are still missing after an extraction pass but the LLM itself is healthy and within the time budget, the system does **not** fall back to guided flow. It stays in the LLM path: the LLM composes its own natural follow-up question for whatever's missing, asks it, and extracts again from the farmer's reply — repeating as many turns as needed. **"Slots still missing" alone never triggers guided flow** — only genuine LLM failure, error, or exceeding the time budget does. This is a real business-logic correction, not a wording tweak: the original text told a builder to hand off to guided flow on any partial result, which would make the LLM path far less capable than intended (bailing after one message instead of holding a real conversation).

**Corrected step 4 — the switch is bidirectional and can happen mid-loop, not once and one-way.** On real LLM failure, whatever slots aren't yet filled carry over into guided flow (one at a time, static pre-fixed `form.question` text, zero further LLM calls — this part of step 3 was correct). But the reverse also holds: if the LLM recovers, or the farmer answers a guided question with free text instead of a direct reply, the conversation can switch back into the LLM path from wherever it currently sits. Neither path is a one-way trapdoor, and the switch isn't gated to a single designated checkpoint — it can fire mid-turn, in either direction.

Caveats: the exact time-budget threshold is not yet decided. What action a late-extraction finding triggers (step 6) is explicitly unresolved.

Unsatisfied requirements: diary extraction itself (US2-6/7/8) has no schema or prompt design yet — deferred to the team pending real Thai-language test data, per the team's own decision this session.

## Other Related ADRs

* [ADR 0003 — Chatbot Service Stack](/docs/adr/chatbot-service-stack) - hosts this mechanism; owns the APScheduler retry job
* [ADR 0005 — Data Model Changes](/docs/adr/data-model-changes) - `chat_conversation_answer.source` column supports this decision's review requirement

## References

* [Architecture Review recap — Part 4.4](/docs/plans/architecture-session-notes#llm-extraction)
* [Target Architecture — state-machine diagram (authoritative mechanism post-amendment)](/docs/architecture/target-architecture#state-machine)
* [LiteLLM](https://github.com/BerriAI/litellm)
* [LINE Messaging API — reply token / receiving messages](https://developers.line.biz/en/docs/messaging-api/receiving-messages/)
