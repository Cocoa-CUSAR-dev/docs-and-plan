---
sidebar_position: 10
title: "Designing Carry-Forward (one แปลง, many activities)"
---

# Designing Carry-Forward

Design doc, not implementation. A farmer standing in one plot wants to log three things they did there — ใส่ปุ๋ย, ตัดหญ้า, พ่นยา — without being asked "which farm?" and "which แปลง?" three times. This works out what has to carry between those three rows, and why [multi-submit Phase 1](/docs/plans/multi-submit-design) does **not** already do it.

The short version: Phase 1 carries the *parent picker's* selection forward. `farm_id` and `plot_id` are not parent-picker selections — they are ordinary questions on the form — so today they would be re-asked every single time.

## What the farmer is actually asking for

Grounded in the real `farm_activity` form (`d07f2530`, "จดกิจกรรมในสวน"):

| Question | `field_name` | Type | Varies per row? |
|---|---|---|---|
| ฟาร์มที่ทำกิจกรรม | `farm_id` | OPTION | **No** — same farm all sitting |
| แปลงที่ดำเนินการ | `plot_id` | OPTION | **No** — same plot all sitting |
| กิจกรรมที่ทำ | `farm_activity_type_id` | OPTION | **Yes** — this is the whole point |
| อธิบายรายละเอียด | `description` | VARCHAR | **Yes** — a note about *that* activity |
| ตำแหน่งปัจจุบัน | `gis` | GEODATA | n/a — never reaches the chatbot |
| แนบภาพประกอบ | `upload` | VARCHAR | n/a — never reaches the chatbot |

The last two are filtered out by `_is_supported` (`service.py`), so the guided flow only ever deals with **four** fields. That matters below.

**The awkward fact this design has to deal with:** the field that varies (`farm_activity_type_id`) is an `OPTION` exactly like the two that don't. There is no rule based on input type, nullability, or name shape that separates "context that stays" from "payload that changes". Any cheap heuristic will get this form wrong.

## Why Phase 1 doesn't already do this

`start_next_submission` (chatbot `service.py`) copies `conversation.parent_answer` into the new conversation and nothing else. That is deliberate and correct *for what it was built for*:

- `parent_answer` is written **only** by the parent picker (`parent_picker.py`).
- The parent picker runs **only** for the five child handlers — `farm_activity_fertilizer`, `farm_activity_chemical`, `harvest_grade_detail`, `fermentation_batch`, `drying_batch` — whose parent FK is NOT NULL.
- `farm_activity` is a **top-level** handler. It has no parent picker, so `parent_answer` is `NULL`, so nothing carries.

So switching `is_multiple_submit` on for "จดกิจกรรมในสวน" today gives the farmer a working loop that re-asks ฟาร์ม and แปลง before every activity — the exact annoyance the multi-submit doc warned about, one level up. [That doc](/docs/plans/multi-submit-design) already anticipated this by scoping the five top-level handlers as "possible but much less obviously wanted".

## The design space

### Option A — leave it

Multi-submit works; the farmer just re-answers farm and plot each round. ~5 interactions per extra activity. Honest, no new code. Also the thing most likely to get the feature described as "not really usable" by the person testing it.

### Option B — prefill the next row from the one just submitted

Reuse the autofill machinery that already shipped (US2-4/#102): have `start_next_submission` run the just-submitted answer through `reuse.sanitize_for_autofill` and hand it to `start_conversation_with_autofill`, which already seeds `ConversationAnswer` rows and skips to whatever is still unanswered.

**No schema change. Almost entirely wiring of merged, live-tested parts.**

But there is a real hazard, and it is not small:

> Because *every* question would be prefilled, `_next_unanswered_required` returns `None`, so the farmer lands **directly on the confirmation summary** — showing the previous activity's type and the previous activity's note. One tap on ยืนยัน files a **silent duplicate** of the row they just submitted.

That is worse than an annoyance; it is bad data that looks deliberate. And it lands precisely where the multi-submit doc already flagged the risk getting worse: *"Retry-vs-genuine-duplicate is now ambiguous… once repeat submission is legitimate, it is not [detectable]."*

Mitigations, none free:
- Land on the first question instead of the summary — but the guided flow has no "accept this default" affordance, so the farmer re-answers everything anyway, which is Option A with extra steps.
- Show the summary with a "these values were copied" warning — relies on farmers reading, which the pause/resume work already showed they don't reliably do.
- Pair it with a duplicate guard (below), which is worth doing regardless.

### Option C — a per-question carry-forward flag

One nullable-free column, `form.question.carry_forward boolean NOT NULL DEFAULT false`, surfaced through Kotlin onto the question DTO the chatbot already reads, and honoured by `start_next_submission`: seed answers for flagged questions, ask the rest.

For the farm_activity form the researcher ticks `farm_id` and `plot_id`. The farmer then gets: **asked กิจกรรมที่ทำ → asked description → confirm.** Farm and plot never come up again, and the field that varies is always asked, so there is no path to a blind duplicate.

Costs: a Flyway migration, a Kotlin DTO field (the same three-line shape `isMultipleSubmit` just went through), a chatbot branch, and eventually a web-app checkbox. A researcher can set it by SQL until that checkbox exists — exactly how `is_multiple_submit` is being handled right now.

This is also the honest home for the question. "Which fields describe the batch rather than the row?" is **form authoring metadata**, not something the chatbot can infer. Putting it anywhere else is guessing.

## Recommendation

**Option C.** It is the only one that keeps the varying field in front of the farmer, which is what prevents duplicate rows; and it generalises — `harvest_grade_detail` gets the same benefit for free once the flag exists, without another special case.

Option B is tempting because it is nearly free, and an earlier read of this problem did favour it. Working through what the farmer actually sees changed that: prefilling *everything* on a form whose whole purpose is that one field differs puts a one-tap duplicate directly under their thumb. If Option B ships as an interim, it should be time-boxed and must not go out without the duplicate guard.

### Companion, worth doing either way

**A duplicate guard on repeat submission.** Reject (or at minimum warn on) a submission whose answer is identical to the immediately preceding response for the same `(task, user, parent)`. Cheap, and it retires the retry-vs-duplicate ambiguity the multi-submit doc raised as a known cost — which gets worse the moment either option above ships.

## What this deliberately does not solve

- **Switching plot mid-sitting.** Carry-forward makes the plot sticky; changing it means finishing and starting the task again. [Multi-submit's open decision 3](/docs/plans/multi-submit-design) raises the same question for parents and suggests a third button ("เพิ่ม, ชุดอื่น"); whatever is decided there should apply here too, not be solved twice.
- **Reviewing the batch.** Three activities logged in one sitting are still three unrelated rows — they cannot be reviewed or undone as a set. That is Phase 2's submission-session concept.
- **Autofill's meaning.** `GetLastAnswer` still keys on `(user, handler)`, not on form. [Multi-submit's open decision 4](/docs/plans/multi-submit-design) covers this and is now unblocked, since `response.task_form_id` is populated.

## Open decisions

1. **Does carry-forward apply to the first submission too?** I.e. should the autofill offer at task start also respect the flag, prefilling only sticky fields rather than everything? Probably yes, but it changes an already-merged flow.
2. **Who ticks the box?** A researcher authoring the form, or should carry-forward default to on for any OPTION that is also a picker-resolved reference? The latter is convenient and unpredictable.
3. **Does the flag belong to the question or to the form?** Per-question is more precise; a per-form list of sticky field names is less normalised but easier to author.

## Sequencing

1. **database** — Flyway migration adding `form.question.carry_forward`.
2. **web-backend** — expose it on the question DTO the chatbot reads (same shape the `isMultipleSubmit` change just used).
3. **chatbot** — honour it in `start_next_submission`; seed flagged answers, ask the rest.
4. **mobile-backend** — the duplicate guard (independent; can go first).
5. **web-app** — the authoring checkbox. Only needs step 1, can run in parallel.

## Related

- [Designing Multi-Submit Forms](/docs/plans/multi-submit-design) — the loop this extends, and where `parent_answer` carry-forward already happens for the five child handlers
- [Designing the 5 Blocked Handlers](/docs/plans/chatbot-child-handler-design) — the parent picker and the `parent_answer` mechanism itself
