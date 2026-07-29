---
sidebar_position: 9
title: "ADR 0009: Computer Vision Technology Direction (Phase II)"
---

# ADR 0009: Computer Vision Technology Direction (Phase II)

## Submitters

* _[Your name]_ (Is Thai Cacao Capstone Team)

## Change Log

* [pending](/docs/plans/architecture-session-notes#computer-vision) 2026-07-27 — technology direction only; everything else gated on data that doesn't exist yet

## Referenced Use Case(s)

* [EPIC 7 — Computer Vision cocoa-disease detection (Phase II, gated G1→G2→G3)](/docs/plans/architecture-session-notes#backlog-check)

## Context

Computer Vision is the most preliminary of all the new work — Phase II, gated (G1→G2→G3 in the current plan), and dependent on a labeled disease-image dataset that does not exist yet. This session touched it only lightly, on purpose: there is very little to responsibly decide before real data collection starts.

## Proposed Design

**Services/modules impacted:** none yet.

**New services/modules:** a future inference API, expected to match the chatbot service's own FastAPI stack ([ADR 0003](/docs/adr/chatbot-service-stack)) for consistency, so the team isn't maintaining a third distinct backend framework.

**Model/DTO impact:** not designed — depends entirely on what the eventual dataset and label schema look like.

**API impact:** not designed.

**Config/devops impact:** not designed; GPU/training infrastructure needs are unassessed.

## Considerations

**Framework — PyTorch (leaning, not fully committed) vs. alternatives.** PyTorch via transfer learning off a pretrained model is the direction discussed, mainly because it's the most common ecosystem for this kind of image-classification transfer-learning task and pairs well with lightweight annotation tooling. Not treated as a hard decision — no real alternative was seriously weighed against it, since the bigger open question (does usable data exist at all) dominates everything else.

**Inference API framework — matching the chatbot's FastAPI stack (leaning).** Considered mainly to avoid a third backend framework in a 4-person team's surface area, not because of any CV-specific requirement.

**How resolved:** intentionally left light — the team's own gate structure (G1→G2→G3) already governs how much gets built before more is justified, and this review didn't attempt to get ahead of that.

## Decision

Leaning direction only, not a firm commitment:
* PyTorch, transfer learning off a pretrained model, once labeled data exists.
* Inference API on FastAPI, matching the chatbot service's stack.
* Lightweight dataset/annotation tooling — not yet chosen.

Caveats: this entire ADR is closer to "current thinking" than "decision" — almost everything here is contingent on data that doesn't exist yet and the G1 gate being cleared first.

Deferred: essentially everything beyond the two leanings above — dataset sourcing/labeling strategy, model architecture specifics, accuracy-bar validation approach, annotation tooling choice.

Unsatisfied requirements: a labeled dataset, and clearing gate G1, before any of this can move from "leaning" to "decided."

## Other Related ADRs

* [ADR 0003 — Chatbot Service Stack](/docs/adr/chatbot-service-stack) - the FastAPI pattern this leans on for consistency

## References

* [Architecture Review recap — Part 4.9](/docs/plans/architecture-session-notes#computer-vision)
* [PyTorch](https://pytorch.org/)
