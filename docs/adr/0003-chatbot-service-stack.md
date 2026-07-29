---
sidebar_position: 3
title: "ADR 0003: Chatbot Service Technology Stack"
---

# ADR 0003: Chatbot Service Technology Stack

## Submitters

* _[Your name]_ (Is Thai Cacao Capstone Team)

## Change Log

* [approved](/docs/plans/architecture-session-notes#chatbot-stack) 2026-07-27

## Referenced Use Case(s)

* [EPIC 2 — LINE OA AI Chatbot](/docs/plans/architecture-session-notes#backlog-check)
* [US2-1 — Guided conversational form filling](/docs/plans/architecture-session-notes#backlog-check)
* [US2-3 — Pause/resume a conversation](/docs/plans/architecture-session-notes#backlog-check)

## Context

None of the 5 existing repos are a natural home for LINE webhook handling, conversational state, or LLM calls — Go and Kotlin are both synchronous request/response APIs serving their own clients, not built for the async, event-driven, session-carrying shape a chatbot needs. A new service was needed; the question was language/framework/async model, not whether to build one.

## Proposed Design

**Services/modules impacted:** none existing — this is entirely new. It becomes a new caller into Kotlin ([ADR 0001](/docs/adr/old-new-integration-seam)) and Go ([ADR 0001](/docs/adr/old-new-integration-seam)).

**New services/modules:**
* A new Python service (own repo/deployable unit), stateless, sitting alongside the existing backends.
* A separate, lightweight **Vite + React** app for LIFF screens (pairing-code display, any rich in-chat forms) — not folded into the existing Next.js `web-app`.

**Model/DTO impact:** Pydantic models double as (a) request/response validation for calls into Go's `POST /tasks` and (b) the structured-output schema handed to the LLM (see [ADR 0004](/docs/adr/llm-extraction-approach)) — one schema definition, two consumers.

**API impact:** new LINE webhook endpoint (signature-verified), new LIFF-facing endpoints for the pairing flow ([ADR 0002](/docs/adr/line-identity-linking)).

**Config/devops impact:** a new deployable service and a new static frontend — hosting target is unresolved, see [ADR 0007](/docs/adr/deployment-and-hosting).

## Considerations

**Framework — FastAPI (chosen) vs. Flask (considered).** FastAPI is async-native, which matches the webhook pattern directly (acknowledge the LINE webhook fast, then process in the background — LINE requires a fast response or it retries the delivery). Its bundled Pydantic gets reused for both Go-submission validation and LLM structured-output schemas, which Flask has no equivalent for out of the box. Flask would need `Flask-RESTX`/separate schema libraries to match this, for no offsetting benefit.

**LINE SDK — `line-bot-sdk-python` (chosen), the official SDK.** Handles webhook signature verification (`WebhookHandler`) and LIFF identity in one dependency rather than hand-rolling HMAC verification against LINE's webhook secret.

**LIFF frontend — separate Vite+React app (chosen) vs. folding into the existing Next.js `web-app` (rejected).** LIFF is a handful of small screens with no SSR or complex routing need; reusing Next.js would import far more machinery (App Router, the BFF proxy pattern already flagged as duplicated 11 times — `FE-3`) than the surface actually requires.

**Async model — two distinct tools, not one (chosen):**
* FastAPI's built-in `BackgroundTasks` for "acknowledge the webhook now, do the work right after" — immediate, in-request-lifecycle async.
* **APScheduler (chosen)** for genuinely scheduled work — the delayed LLM-retry cron ([ADR 0004](/docs/adr/llm-extraction-approach)) and reminder pushes ([ADR 0006](/docs/adr/reminder-delivery)).
* **Celery + Redis (rejected)** — a message broker and worker pool is real operational weight (another service to deploy, monitor, and keep alive) that a 4-person team doesn't need at this task volume. APScheduler runs in-process with no extra infrastructure.

**LLM interface — LiteLLM (chosen) vs. LangChain (rejected).** Covered in full in [ADR 0004](/docs/adr/llm-extraction-approach); noted here because it's part of the same stack decision.

**How resolved:** decided directly with the team, stack accepted as proposed.

## Decision

Agreed stack:
* **Language/framework:** Python, FastAPI.
* **LINE integration:** `line-bot-sdk-python` (webhook signature verification, LIFF).
* **LIFF frontend:** standalone Vite + React app.
* **Async:** FastAPI `BackgroundTasks` for post-webhook immediate work; **APScheduler** for scheduled/cron work (LLM retry batch, reminders) — explicitly not Celery+Redis.
* **LLM abstraction:** LiteLLM (see [ADR 0004](/docs/adr/llm-extraction-approach)).

Caveats: hosting/deployment target for this new service is unresolved — see [ADR 0007](/docs/adr/deployment-and-hosting). This ADR covers the application-level stack only, not where it runs.

Deferred: nothing at the stack level; implementation detail (exact background-job persistence for APScheduler — in-memory vs. a job store) is left to implementation time.

## Other Related ADRs

* [ADR 0001 — Old↔New Integration Seam](/docs/adr/old-new-integration-seam) - this service is the new caller on that seam
* [ADR 0004 — LLM Extraction Approach](/docs/adr/llm-extraction-approach) - LiteLLM choice detailed fully here
* [ADR 0007 — Deployment, CI/CD & Hosting](/docs/adr/deployment-and-hosting) - where this service actually runs, still pending

## References

* [Architecture Review recap — Part 4.3](/docs/plans/architecture-session-notes#chatbot-stack)
* [FastAPI](https://fastapi.tiangolo.com/)
* [line-bot-sdk-python](https://github.com/line/line-bot-sdk-python)
* [APScheduler](https://apscheduler.readthedocs.io/)
* [LINE Messaging API — webhook overview](https://developers.line.biz/en/docs/messaging-api/overview/)
