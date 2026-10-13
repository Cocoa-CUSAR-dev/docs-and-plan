---
sidebar_position: 1
title: UAT plan — farmers & researchers
---

# UAT plan — farmers & researchers

Tracks [docs-and-plan#251](https://github.com/Cocoa-CUSAR-dev/docs-and-plan/issues/251). Real farmers and researchers use the system for real tasks and confirm it works for them. Developers are not the testers.

This page is the plan and the test script. Each session is recorded on the [result sheet](#result-sheet) at the end, and every problem found becomes a GitHub issue (see [Logging a problem](#logging-a-problem)).

:::info Fill in before the first session
Items marked **TBD** need a decision from the team. They are collected in [Open questions](#open-questions).
:::

## What UAT is checking

Not "does the code work": the integration and regression suites (#248–#250) cover that. UAT answers one question per role:

| Role | The question UAT answers |
|---|---|
| Farmer (LINE OA, mobile app) | Can I record what I did on my farm, on my own, without help, in a few minutes, and trust that it was saved? |
| Researcher (web) | Can I set up a form, send it to farmers, see what came back, and fix what the AI got wrong? |

**Pass criterion for the whole UAT:** every scenario marked **must** is completed by at least 80% of participants without help from the facilitator, and there is no open 🔴 problem (see [Severity](#severity)).

## Scope

In scope: features merged to `dev` and deployed to the UAT environment.

| Area | Stories covered |
|---|---|
| LINE OA chatbot | US1-2 LINE sign-in, US2-1 one question at a time, US2-2 validation, US2-3 pause/resume, US2-4 reuse last answers, US2-6 free-text filling and diary, US2-9 own words, US2-10/US2-12 several plots, US2-11 natural typing, location answer, US4-1 reminders, US4-2 to-do list |
| Farmer web (from LINE) | US3-1 open links without logging in again, US5-1 submission history |
| Mobile app | US2-5 reuse last answers, submitting offline / rejected answers |
| Researcher web | form create/edit, task assignment, US4-3 reminder schedule, responses view, US2-8 review & correct AI-extracted fields |

Out of scope: performance (#252), admin-only screens, and anything not yet on `dev` when the session runs. Re-check this table against `dev` the day before each session.

## Participants

| Group | How many | Who |
|---|---|---|
| Farmers | 5–8 | Mix of ages. At least 2 aged 50+, at least 2 who rarely type in LINE. Each has a real farm and plot in the system. |
| Researchers | 2–3 | People who will actually create forms and read the data. |

Every participant gets a consent briefing first: what is recorded, that it's the software being tested and not them, and that they can stop at any time.

## Environment

| Item | Value |
|---|---|
| Chatbot / LINE OA | **TBD** — a UAT OA, not the dev OA `@572vqqsq` that developers use |
| Researcher web | **TBD** URL |
| Mobile app build | **TBD** (APK / TestFlight) |
| Database | **TBD** — a UAT copy, not `flyway_test` |

Rules for the environment during a session:
- No deploys from 30 minutes before a session until it ends.
- Sentry open on a laptop; note the time of anything odd, so errors can be matched afterwards.

## Preparing a session (checklist)

- [ ] Each farmer account is linked to the participant's own LINE, with farm and plots set up. One farmer has **2+ plots** (for the several-plots scenario).
- [ ] Tasks assigned to every farmer and open today:
  - [ ] one ordinary form (farm activity), never submitted before
  - [ ] one form the farmer **has submitted before** (for reuse-last-answers)
  - [ ] one multiple-submit form with an OPTION question (several plots / add another)
  - [ ] one form with a **location** question
- [ ] One reminder scheduled to fire during the session (US4-1).
- [ ] Researcher accounts have the researcher role and the update-response permission (database V28).
- [ ] At least one submission with AI-extracted values exists (for review & correct).
- [ ] Printed result sheets, one per participant; screen recording consent signed.

## How to run a session

1. Facilitator reads the scenario card aloud, or gives it on paper, **without showing how**.
2. The participant uses their own phone (farmers) or a laptop (researchers).
3. The facilitator does **not** help unless the participant is stuck for 2 minutes or asks to stop. A hint counts as "with help".
4. The note-taker records, per step: done alone / done with help / not done, plus time and any quote ("ไม่รู้ต้องกดตรงไหน").
5. After each scenario, ask: "ง่ายแค่ไหน 1–5?" and "ตรงไหนงง?"

Sessions are about 45 minutes for farmers and 60 minutes for researchers.

## Farmer scenarios — LINE OA

Card text in Thai is what the participant hears or reads. "Expected" is for the note-taker.

### F1 · เพิ่มเพื่อนและเข้าใช้ครั้งแรก — **must**
> เพิ่มเพื่อน LINE "น้องโกโก้" แล้วลองคุยดูว่าบอททำอะไรได้บ้าง

Expected: a welcome message with a **เริ่ม** button. An unlinked account is told to contact the team, and never gets stuck in silence.

### F2 · ดูงานที่ต้องทำ — **must**
> อยากรู้ว่าวันนี้มีงานอะไรต้องบันทึกบ้าง

Expected: typing **เริ่ม**, or something natural like "มีงานอะไรบ้าง", shows the pending tasks as buttons.

### F3 · กรอกฟอร์มทีละข้อ — **must**
> เลือกงาน "จดกิจกรรมในสวน" แล้วบันทึกว่าวันนี้ใส่ปุ๋ยแปลงของตัวเอง

Expected:
- One question at a time, with buttons where there are choices.
- A wrong answer, such as text where a number is needed, gets a clear message and the same question again.
- The summary is shown before saving, and **ยืนยัน** saves it.

### F4 · พิมพ์เล่าเองแบบปกติ — **must**
> แทนที่จะตอบทีละข้อ ลองพิมพ์เล่าว่าวันนี้ทำอะไรไปบ้าง เหมือนเล่าให้เพื่อนฟัง

Expected: the bot fills what it can from the text and asks only for what is missing. The summary matches what was said.

### F5 · พักแล้วกลับมาทำต่อ — should
> กำลังกรอกอยู่ครึ่งทาง ต้องไปทำธุระ พักไว้ก่อน แล้วค่อยกลับมาทำต่อ

Expected: **⏸️ พักไว้ก่อน** pauses. Later, เริ่ม → the same task brings back the answers already given and continues from where it stopped.

### F6 · แก้คำตอบก่อนส่ง — **must**
> ที่หน้าสรุป เห็นว่าตอบผิดไปข้อหนึ่ง แก้ให้ถูกแล้วค่อยส่ง

Expected: **แก้ไข** → pick the question → answer again → back at the summary with the new value.

### F7 · ใช้ข้อมูลเดิมจากครั้งก่อน — should
> เปิดงานที่เคยบันทึกไปแล้วครั้งหนึ่ง (ประเภทเดียวกัน)

Expected:
- The bot offers last time's answers, and the farmer can **use them** or **start fresh**.
- A location is never pre-filled from last time.

### F8 · บันทึกหลายแปลงในครั้งเดียว — should
> วันนี้ฉีดยาสองแปลง บันทึกให้ครบทั้งสองแปลง

Expected:
- A bubble lets the farmer tick several plots, then **✅ เสร็จ**.
- The summary says how many records will be saved, and confirming saves one record per plot.
- A form with a number field (e.g. weight) uses **➕ เพิ่มอีกรายการ** instead.

### F9 · ส่งตำแหน่ง — should
> เมื่อบอทถามตำแหน่ง ส่งตำแหน่งที่อยู่ตอนนี้

Expected:
- **📍 ส่งตำแหน่ง** opens LINE's map, and the shared location is accepted.
- Typing ordinary text instead gets a re-ask with the button. This needs LINE on a **phone**.

### F10 · ไดอารี่และดูประวัติ — should
> หลังส่งงาน ดูสรุปที่บอทส่งมา แล้วกดดูประวัติการบันทึกย้อนหลัง

Expected:
- A diary card arrives.
- Its link opens the history page **without logging in again** (US3-1) and shows today's submission.

### F11 · การแจ้งเตือน — should
> (รอให้มีข้อความแจ้งเตือนเข้ามา) ทำตามที่แจ้งเตือนบอก

Expected: the reminder arrives at the scheduled time and leads straight to the task.

## Farmer scenarios — mobile app

### M1 · ใช้ข้อมูลเดิมในแอป — should
> เปิดแอป แล้วเปิดงานที่เคยบันทึกในแชตมาก่อน

Expected: the same "ใช้ข้อมูลเดิมจากครั้งล่าสุด?" offer as the chatbot, with the same values (US2-5).

### M2 · ส่งตอนไม่มีสัญญาณ — **must**
> เปิดโหมดเครื่องบิน แล้วบันทึกงาน จากนั้นปิดโหมดเครื่องบิน

Expected: "บันทึกไว้ในเครื่องแล้ว…" when offline, and the record appears in the system once back online, **once only**.

## Researcher scenarios — web

### R1 · สร้างฟอร์มและมอบหมายงาน — **must**
> สร้างฟอร์มเก็บข้อมูลใหม่ 4–5 ข้อ แล้วมอบหมายให้เกษตรกรกลุ่มหนึ่ง

Expected: the form is created with question types and validation, and the task is visible to those farmers in LINE.

### R2 · ตั้งเวลาแจ้งเตือน — should
> ตั้งให้ระบบแจ้งเตือนเกษตรกรทุกเช้าจนกว่าจะส่ง

Expected: the reminder schedule is saved, and F11 fires from it.

### R3 · ดูคำตอบที่ส่งเข้ามา — **must**
> ดูว่าเกษตรกรส่งอะไรเข้ามาบ้างในงานที่สร้าง

Expected: the responses view lists each submission with the right values and times. Times are shown in Thai time, not 7 hours off.

### R4 · ตรวจและแก้ค่าที่ AI ดึงมา — **must**
> หาคำตอบที่ AI ดึงมาจากข้อความ แล้วแก้ค่าที่ผิดให้ถูก

Expected:
- **Review & correct** → the AI-extracted badge and filter work.
- Editing a value with a reason saves it, and it is still there after a refresh.
- A wrong type (text in a number field) can't be saved.

### R5 · แดชบอร์ด — could
> ดูภาพรวมข้อมูลการเก็บเกี่ยวในแดชบอร์ด

Expected: the charts and map load with the UAT data.

## Severity

| | Meaning | What happens |
|---|---|---|
| 🔴 | Data is lost, wrong, or duplicated; or a **must** scenario can't be finished | Fix before release; UAT fails until fixed |
| 🟠 | Finished only with help, or confusing enough to make a farmer give up | Fix in the next sprint |
| 🟡 | Works, but slow, awkward, or wording is unclear | Backlog |

## Logging a problem

One GitHub issue per problem in `docs-and-plan`, as a sub-issue of #251:
- **Title:** `UAT - <scenario id>: <what went wrong>`, for example `UAT - F8: summary says 2 records but 3 plots were ticked`
- **Body:**
  - participant code (not their name), device and LINE / app version
  - time of the problem (for Sentry), steps, and what was expected vs what happened
  - the severity
  - screenshot or recording if any

## Result sheet

One sheet per participant. Farmers: F1–F11, M1–M2. Researchers: R1–R5.

| Scenario | Done alone / with help / not done | Time | Ease 1–5 | Notes / quotes | Issue # |
|---|---|---|---|---|---|
| F1 | | | | | |
| F2 | | | | | |
| … | | | | | |

Participant code: ______ · Role: ______ · Age range: ______ · Device: ______ · Date: ______ · Facilitator / note-taker: ______

## After UAT

- [ ] Tally the result sheets: completion rate per **must** scenario against the 80% bar.
- [ ] Every 🔴 has an issue in the current sprint; every 🟠 is scheduled.
- [ ] Short report on #251: what passed, what failed, and the top 3 things farmers struggled with.
- [ ] Re-test every 🔴 fix with at least one participant before closing #251.

## Open questions

1. UAT environment: which LINE OA, web URL, app build and database?
2. Dates and place for the sessions, and who facilitates and who takes notes.
3. How participants are recruited, and whether there is compensation.
4. Consent form wording, and whether sessions may be recorded.
5. Is the 80% pass bar right for this capstone, or should it be stricter for farmers?
