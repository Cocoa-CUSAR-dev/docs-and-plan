---
sidebar_position: 3
title: "Slide 4 — Why We Cut the Refactor Phase"
---

# Slide 4 kit — why we cut the dedicated Refactor phase

Presentation assets and script for slide 4 of the plan-approval deck (เหตุผลที่ตัด Phase: Refactor ออก และวิธีแก้). Two diagrams, 1280×720 (16:9), vector SVG for a crisp Insert Picture in PowerPoint, PNG fallback included. Every claim below was verified directly against the repos on 2026-07-14 — file and line number given so it can be pulled up live if challenged.

| Diagram | File |
|---|---|
| Findings by layer, split by severity | [`problems-spread-architecture-style.svg`](/diagrams/presentation/problems-spread-architecture-style.svg) |
| Fix-first vs. fix-alongside-epics | [`fix-strategy-diagram-en.svg`](/diagrams/presentation/fix-strategy-diagram-en.svg) |

## Diagram 1 — what we found

![Code audit findings by layer, split by severity](/diagrams/presentation/problems-spread-architecture-style.png)

Same 5-node layout and visual language as the slide 2 system diagram (transparent background, same box and arrow style) — reuses it instead of introducing a new diagram style. Each box carries **two separate numbers, never summed**: findings that are critical and block deployment (red), and findings that are real but can improve alongside normal work (green). Read straight off the [Weak-Point Register](/docs/phase-0):

| Layer | Critical | To improve | Total |
|---|---|---|---|
| Mobile application | 2 | 4 | 6 |
| Web researcher platform | 1 | 8 | 9 |
| Mobile backend (Go) | 1 | 6 | 7 |
| Web backend (Kotlin) | 3 | 7 | 10 |
| Central database | 5 | 4 | 9 |
| **Total** | **12** | **29** | **41** |

The point of the visual: there is no single box you could point to and say "that's the buggy part" — every layer Phase I already has to touch carries both a red number and a green number.

**Script:** "After the team read through all 5 parts of the system, we found 41 findings — covering performance and functions that simply don't work. They aren't concentrated in one place, and they aren't all the same severity either: 12 are critical and have to be fixed before we can deploy anything; the other 29 are real but can be improved as we go. Every layer of the system carries both kinds."

## Evidence — the five worst findings, with exact locations

Pick two or three to cite live; all are verified against the current repo, not paraphrased from memory.

**1. Registration on the researcher web app is dead on both ends.**
The register button never fires a request: `AuthForm` only calls its `onSubmit` prop if one was passed (`AuthForm.tsx:48-51`), but `AuthRegisterModule.tsx` never passes `onSubmit` at all — clicking the button submits nothing. Even if it did, the BFF route behind it is a no-op: `register/route.ts:9-17` reads and validates `email`/`password`, then falls out of the `try` block with no `return` and no call to the backend at all.

**2. Any logged-in user can read anyone else's form answers.**
`FormResponseController.kt:16-42` (`GET /tasks/{taskId}/responses`, `GET /tasks/{taskId}/responses/{responseId}`) carries zero `@PreAuthorize` annotations. The queries behind it, `FormResponseRepository.kt:26-42` and `:45-63`, filter only by `taskId`/`responseId` — never by the requesting user's ID. Any authenticated account can enumerate every researcher's submitted survey data. `ReportController.kt`'s bulk `.xlsx` export (`GET /reports/raw-data/download`) has the same gap — no authority check at all.

**3. The database's own setup script doesn't run.**
`database/other.sql:17-24` — the first of four trigger functions ends after a single `INSERT` branch, with no `ELSIF`, `END IF`, `RETURN NEW`, or closing `$$;`. The file is not valid SQL. The complete functions exist only in `backup.sql` — and that file is UTF-16 encoded, so even copying from it requires an extra conversion step nobody documented.

**4. The session cookie isn't marked Secure.**
`CookieService.kt:34` — `secure = true` is commented out on the cookie that carries the JWT. Deployed over anything but HTTPS, the session token is interceptable.

**5. The mobile app's backend address is a hardcoded LAN IP.**
`service_provider.dart:10` — `final String baseUrl = 'http://192.168.10.188:8080';`. Every environment (dev, staging, a real deployment) needs a source-code change and a rebuild to point anywhere else, and the traffic itself is plain HTTP.

Full list: [Researcher-Side Code Audit](/docs/phase-0/researcher-audit) (47 findings, each with the offending code and a fix) and the [Weak-Point Register](/docs/phase-0).

## Diagram 2 — why incremental beats one dedicated phase

![Fix first vs fix alongside epics](/diagrams/presentation/fix-strategy-diagram-en.png)

Not every finding is equal. The left lane is the small, blocking foundation — about 12 points, fits in the first two sprints: restore the DB script, add authorization, move the backend URL to config, stand up CI. The right lane is everything else, folded into the epics Phase I is building anyway — pagination lands when the dashboard epic needs it, tests land when that code gets refactored for a feature. The timeline strip is the proof: red dots (blocking) cluster in sprint 1–2, green dots (parallel) spread across every sprint — the system keeps improving continuously instead of stopping.

**Script:** "Not every finding carries the same weight. Some block everything else and have to go first — restoring the database script, closing the authorization gaps, getting CI in place. That's about 12 points, done in the first two sprints. Everything else — pagination, tests, deduplication — gets folded into the epics we're already building in Phase I, the same way a team would clean up code it's touching regardless. We already know what depends on what — see the [Fix Dependency Map](/docs/plans/fix-dependencies) — so this isn't a guess, it's a sequenced backlog. That's why we cut Refactor as its own phase: there's no reason to freeze the whole system waiting for it to finish."

## Source data

Finding counts, points, and every file:line citation above were checked against the repo on 2026-07-14 (see the [Weak-Point Register](/docs/phase-0) and [Fix Dependency Map](/docs/plans/fix-dependencies)). If the codebase changes before the presentation, re-verify the citations — don't just reuse the numbers. Thai-language versions of the original (summed-badge) diagrams are also available at `problems-spread-diagram.svg` / `fix-strategy-diagram.svg` in the same folder if a bilingual deck is useful; the critical/improve split in diagram 1 is English-only for now.

All diagrams in this folder have a **transparent background** — they drop straight onto a PowerPoint slide of any theme color without a white box around them.
