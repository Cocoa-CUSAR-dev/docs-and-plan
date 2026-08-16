---
sidebar_position: 5
title: "Backend Fixes Needed for the Chatbot Project"
---

# Backend Fixes Needed for the Chatbot Project

Plain-language version of what needs to change in the two backends (Go/mobile-backend and Kotlin/web-backend) before the new LINE OA chatbot can actually work — for presenting to the BE lead. Full technical detail with exact code citations lives in [ADR 0001](/docs/adr/old-new-integration-seam) and the [Phase 0 register](/docs/phase-0); this page is the meeting-ready summary.

**Context first:** the new chatbot talks directly to the two backends — it doesn't go through the old mobile app or web app at all. So most of the old mobile app's problems (like forms not updating live on the phone) don't block this project. What's below is what actually does.

## 🔴 Must fix — the chatbot can't work without these

### 1. Go: Submitting a task doesn't actually save the data
**What's wrong:** When someone submits a harvest/batch/etc. record today, the code that's supposed to save it into the real database tables just prints a debug message instead. Nothing gets saved.
**Why it blocks us:** The chatbot's whole job is collecting farmer answers and submitting them. If submission doesn't really save data, the chatbot doesn't work either — it would just be talking to a wall.
**Proposed fix:** Write the real "save this to the database" logic for each submission type (harvest, processing batch, etc.). Should have been finished originally; needs finishing now before the chatbot depends on it. Full technical design, including which submission types are safe to build now vs. which need a product decision first: [Designing SubmitTask's Dissection Logic](/docs/plans/task-dissection-design).

### 2. Database: A submitted answer can point to a task that doesn't exist
**What's wrong:** There's no safety check linking an answer to a real task — a broken or dangling reference is currently possible and nothing stops it.
**Why it blocks us:** The chatbot becomes a second thing writing into this same table. Without the safety check, bad data can pile up invisibly.
**Proposed fix:** Add the missing database constraint (a foreign key) so this becomes impossible instead of just unlikely. Small database change, done once — needs DB lead coordination.

### 3. Go: The login token doesn't say who's allowed to do what
**What's wrong:** When someone logs in, the token they get only proves "this is user X" — it doesn't carry their role (farmer? researcher? admin?). The code to look up the role exists, it's just never added to the token.
**Why it blocks us:** The chatbot makes calls into this backend (and the other one) on behalf of farmers. Without roles in the token, there's no clean way to prove "this request is legitimately from a farmer" without reinventing that check from scratch.
**Proposed fix:** Add the role information into the token at the point it's created — the lookup logic already exists, it's a small change to actually use it.

## 🟡 Should fix at the same time — not a hard blocker, but this code is already being touched

### 4. Kotlin: The endpoint that assembles a form for display is slow
**What's wrong:** Every time it builds a form, it re-scans the whole database schema to figure out dropdown options, instead of reusing that work.
**Why it matters more now:** A researcher opening the web app hits this occasionally. The chatbot will hit it every single time a farmer starts a conversation — far more often.
**Proposed fix:** Cache or precompute the dropdown/reference data instead of re-deriving it on every call.

### 5. Go: No structure for where business logic lives
**What's wrong:** All the logic is crammed directly into the request-handling code — nothing is reusable.
**Why it matters:** Makes it harder to safely add what the chatbot needs without duplicating logic or breaking something else.
**Proposed fix:** Pull the logic that's about to be touched (task submission) into its own reusable piece, separate from the web request handling.

### 6. Go: Lists of data come back all at once, no paging
**What's wrong:** Endpoints that return lists (tasks, harvests, batches) send everything in one response.
**Why it matters:** Fine today with little data; becomes a real slowdown as more submissions come in through the chatbot.
**Proposed fix:** Add page/limit options to these endpoints.

## 🟢 Security items — not blockers, but shouldn't go live with real farmer data until fixed

### 7. Kotlin: A couple of endpoints don't check who's asking
**What's wrong:** Most of the web backend correctly checks "is this person allowed to see this data" — except two specific endpoints (viewing task responses, and the bulk data export), which skip that check entirely. Right now, any logged-in account can read or download anyone else's submitted data.
**Proposed fix:** Add the same permission check that's already used correctly everywhere else in this codebase — it just needs to be added to these two spots.

### 8. Both backends: The login cookie isn't marked "secure"
**What's wrong:** A setting that's supposed to stop the login cookie from ever being sent over an unencrypted connection is turned off.
**Proposed fix:** Flip the setting. Five-minute fix, just needs someone to do it and redeploy.

## One more thing, unrelated but urgent

While going through the backend code, we found a **real database password and a security key sitting in plain text** in a config file that may have already been shared or committed somewhere. This should be **rotated immediately**, independent of everything above.

## Worth knowing, not on this list

The web backend still has no way to create a brand-new form — only edit an existing one. That's a real gap, but the chatbot doesn't need it to work, since it reuses whatever form a researcher already set up through the database directly. Worth fixing eventually; not a blocker for this project.

---

Full technical writeup, code citations, and the reasoning behind reusing vs. rebuilding: [ADR 0001 — Old↔New Integration Seam](/docs/adr/old-new-integration-seam).
