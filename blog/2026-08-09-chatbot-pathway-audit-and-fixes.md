---
slug: chatbot-pathway-audit-and-fixes
title: "Chatbot save pathway audited live — a false-success bug found and fixed"
authors: [team]
tags: [phase-0, chatbot, audit, database]
---

The LINE chatbot's guided-flow submission pathway was audited live today — not by reading code, but by driving a correctly-signed synthetic webhook payload through the real `/line/webhook` route (chatbot, Go, and Kotlin all running against the real dev DB), verifying database state after every hop. Full technical detail is in the **[Weak-Point Register, section 7](/docs/phase-0#7-chatbot--line-oa-pathway-phase-ii)**; this is the plain-language summary of what was found and fixed.

## The headline bug

`confirm_conversation` told the farmer "บันทึกข้อมูลเรียบร้อยแล้ว" (saved!) **unconditionally** — even when Go rejected the write outright. A live test proved it: a submission that hit a database constraint violation on Go's side left zero rows anywhere (no `form.response`, no domain row), while the farmer was told it succeeded. Silent, undetectable data loss.

**Fixed:** on a Go failure, the conversation now stays awaiting confirmation instead of being marked complete, the confirm button is re-shown, and the farmer sees an honest error message. Tapping confirm again retries the same submission.

## Three "supported" handlers that couldn't actually save

Of the 5 handlers Go's dissection logic claims to support, only 2 (`farm_activity`, `processing_record`) were actually wired up correctly end to end. The other 3 were each missing a required database field that no form ever asked for:

- **`farm_pest_disease_record`** needed a farm, never asked — confirmed broken live, then fixed and re-verified with a real row landing correctly.
- **`harvest`** needed a collection hub, never asked — same pattern, fixed.
- **`batch`** was asking for "which district," a field connected to nothing — replaced with the real "which processing station" question.

All three fixes were applied to every real (non-phantom) copy of each form, plus the `mock_forms.sql` seed template so a fresh dev database doesn't reproduce the same gap.

## Cleanup

21 test tasks across the database turned out to have zero questions attached — a leftover from incomplete seeding, not a code bug. All were removed (including 11 real prior conversation attempts against them, at the team's request), and 3 clean, clearly-labeled `(E2E test)` tasks were added in their place, built specifically to exercise the 3 fields that were just fixed.

## A concurrency bug, found while verifying the fix

While re-testing the fix, firing two answers close together raced and corrupted conversation state — nothing serialized message handling for the same conversation, so two near-simultaneous messages (LINE's own delivery retry, or a farmer texting twice quickly) could both read the same "current question" and both answer it. Fixed with a database-level lock: the first message to arrive wins and processes normally; anything else arriving while that's still in flight is dropped immediately rather than corrupting state. Verified directly against the database (bypassing the webhook layer, which had its own confounding subprocess/logging quirks) — 3/3 clean runs after the fix.

## Also shipped today

- A "skip" button on every optional question, with the choice always shown first and a distinct icon — accessibility-motivated, since most users are older farmers for whom "this one's optional" needs to be visually obvious, not just implied by phrasing.
- A leftover debug `print()` that crashed the webhook handler on Windows whenever a message contained Thai text — real production bug, one-line fix.

## Logged for later, not built today

- The 5 remaining unsupported handlers (fertilizer/chemical application detail, grading detail, fermentation/drying detail) all turn out to be *details attached to an already-logged entry*, not new events — a concrete picker-based design is written up in the register for whenever the team picks it up.
- Two field-naming mismatches (`grade_code`, `drying_facility_type`) that looked like simple renames but turned out to need real backend changes — one references a natural-key column, not the usual UUID pattern; the other has an inconsistently-named reference table.
