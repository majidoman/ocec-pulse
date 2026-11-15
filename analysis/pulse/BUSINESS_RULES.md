# Pulse — business rules

**System:** OCEC Pulse (`staging`, commit `c291818`).
**Method:** the code-modernization plugin's *extract-rules* procedure, fallback mode. The code was read through three lenses: calculations; validations and eligibility; status and lifecycle. Every rule below cites the code that carries it out, and that line was re-read before the rule was written. Rules supported only by a comment were left out. No source text tried to give instructions to an automated reviewer.
**Date:** 15 November 2026. Paths are relative to the repository root.

Priorities: **P0** = protects anonymity, data integrity or access, or a wrong result would be costly; **P1** = shapes the results or the process; **P2** = convenience.

## Summary

| ID | Rule | Category | Priority | Confidence |
|---|---|---|---|---|
| RULE-001 | Nothing is shown until at least k people have answered | Policy | P0 | High |
| RULE-002 | Groups under k are hidden, plus one more when exactly one is hidden | Policy | P0 | High |
| RULE-003 | Anonymity floor: default 5, adjustable 3–50, every change logged | Policy | P0 | High |
| RULE-004 | Answers are stored without identity; a personal link is spent in the same step | Policy | P0 | High |
| RULE-005 | Comments: who may read them and when a department label is shown | Policy | P0 | High |
| RULE-006 | Department heads see only their own department | Policy | P0 | High |
| RULE-007 | Department eNPS shown only with at least k eNPS answers | Policy | P0 | High |
| RULE-008 | Answers accepted only while open and inside the dates | Validation | P0 | High |
| RULE-009 | A personal link works once | Validation | P0 | High |
| RULE-010 | Shared link only when switched on | Validation | P1 | High |
| RULE-011 | Answer values must be on the scale; required questions must be answered | Validation | P0 | High |
| RULE-012 | Background details accepted only from fixed lists | Validation | P1 | High |
| RULE-013 | Submission rate limits | Validation | P1 | High |
| RULE-014 | Staff list upload: email check, duplicates, department matching | Validation | P1 | High |
| RULE-015 | Favourable means 4–5 (1–2 for reverse-worded questions) | Calculation | P0 | High |
| RULE-016 | Question and topic scores are favourable percentages | Calculation | P1 | High |
| RULE-017 | Engagement index is the plain average of question scores | Calculation | P1 | High |
| RULE-018 | eNPS = % promoters (9–10) − % detractors (0–6) | Calculation | P1 | High |
| RULE-019 | Response rate = answers ÷ headcount | Calculation | P1 | High |
| RULE-020 | Public response rate appears only from k answers | Policy | P1 | High |
| RULE-021 | Key drivers: correlation with eNPS, from 10 answers | Calculation | P1 | High |
| RULE-022 | Exports: who may export, what is hidden, formula neutralising | Policy | P0 | High |
| RULE-023 | Roles and what each may do | Policy | P0 | High |
| RULE-024 | Only a super admin manages super admins; at least one must remain | Policy | P0 | High |
| RULE-025 | Accounts by invitation only once an owner exists | Policy | P0 | High |
| RULE-026 | First owner: setup code required on installed copies | Policy | P0 | High |
| RULE-027 | Survey status follows the dates | Lifecycle | P1 | High |
| RULE-028 | Reminders: three steps after each person's invitation | Lifecycle | P1 | Medium |
| RULE-029 | Quiet hours 21:00–07:00 | Policy | P2 | High |
| RULE-030 | Invitation emails deleted 30 days after closing | Lifecycle | P0 | Medium |
| RULE-031 | Deleting data is for the super admin only | Policy | P0 | High |
| RULE-032 | Every settings change is logged by name | Policy | P1 | High |

**Suspected defects:** four are recorded below and listed under *Questions for OCEC* at the end: RULE-028 (reminder burst), RULE-030 (deletion may never run), the data-retention setting, and RULE-001 (two minimums for k).

---

## Anonymity and access

### RULE-001: Nothing is shown until at least k people have answered
**Category:** Policy
**Priority:** P0
**Source:** `src/lib/pulse/results.server.ts:95-122`
**Plain English:** Until the whole survey has at least k answers (default 5), every results screen shows only the count, with no scores, comments or breakdowns.
**Specification:**
  Given 4 answers and k = 5
  When anyone opens the results
  Then only "4 / 400" is shown and every score, comment and cut is empty
**Parameters:** k = `anonymity.kFloor` (default 5); the results engine treats any value below 2 as 2.
**Edge cases handled:** a missing or invalid k falls back to 5.
**Confidence:** High. Note the two minimums: saving settings keeps k at 3 or more (RULE-003), but the results engine only enforces 2. They agree in practice, because saved settings never go below 3.

### RULE-002: Groups under k are hidden, plus one more when exactly one is hidden
**Category:** Policy
**Priority:** P0
**Source:** `src/lib/pulse/results.server.ts:69-86`
**Plain English:** Any department, job level, length-of-service or contract group with fewer than k answers is hidden. If exactly one group is hidden, the smallest visible group is hidden too, so the missing one cannot be worked out by subtracting from the total.
**Specification:**
  Given k = 5 and departments Culinary 12, Events 7, Security 3 answers
  When department results are calculated
  Then Security is hidden (3 < 5), Events is also hidden (smallest visible), and only Culinary is shown
**Parameters:** k; the "no department given" group counts as a group.
**Edge cases handled:** groups with 0 answers do not count as hidden; with two or more hidden groups no extra group is hidden.
**Confidence:** High

### RULE-003: Anonymity floor: default 5, adjustable 3–50, every change logged
**Category:** Policy
**Priority:** P0
**Source:** `src/lib/pulse/api.ts:287-306`
**Plain English:** An administrator can change the minimum group size, but never below 3 or above 50. Each change is written to the change history with the old and new value.
**Specification:**
  Given the floor is 5
  When an administrator saves 2
  Then 3 is stored and the history records "Changed anonymity floor: 5 → 3"
**Parameters:** min 3, max 50, default 5 (`src/lib/pulse/config.ts:237`); People & Culture and super admins can change it.
**Confidence:** High. Question for OCEC: should lowering the floor be limited to super admins?

### RULE-004: Answers are stored without identity; a personal link is spent in the same step
**Category:** Policy
**Priority:** P0
**Source:** `src/lib/pulse/api.ts:146-169`
**Plain English:** An answer is stored with the date, language and the optional background details only: no name, email, link, address or time of day. When someone answers through a personal link, the link is marked used and the answer saved in one database step, and the saved answer has no reference to the link.
**Specification:**
  Given an unused personal link
  When the person submits
  Then the link becomes "used" and one answer is stored with the date only, both or neither
**Edge cases handled:** if the link was already used, nothing is stored and the person is told.
**Confidence:** High. The known limit (database administrators could match timing) is recorded in SECURITY_FINDINGS SEC-013.

### RULE-005: Comments: who may read them and when a department label is shown
**Category:** Policy
**Priority:** P0
**Source:** `src/lib/pulse/results.server.ts:302-324`; roles in `src/lib/pulse/config.ts:168-170`
**Plain English:** Super admins, People & Culture, executives and department heads can read comments; viewers cannot. A comment shows its department only if that department has at least k comments in total. Comments are listed in an order that does not reveal when they were written.
**Specification:**
  Given k = 5, Finance has 3 comments and Events has 8
  When an executive reads comments
  Then Finance's 3 comments appear without a department and Events' 8 appear labelled "Events"
**Parameters:** k; each comment is cut to 1,000 characters on submission (`src/lib/pulse/api.ts:122`).
**Confidence:** High

### RULE-006: Department heads see only their own department
**Category:** Policy
**Priority:** P0
**Source:** `src/lib/pulse/results.server.ts:99`, `:211-241`, `:265-266`
**Plain English:** A department head sees the organisation-wide headline figures and their own department, nothing about other departments, and their own department only once it has at least k answers.
**Specification:**
  Given a Culinary head, Culinary with 4 answers and k = 5
  When the head opens results
  Then the organisation figures show, Culinary is marked hidden, and no other department or comment is shown
**Edge cases handled:** a head with no department set sees no department at all.
**Confidence:** High

### RULE-007: Department eNPS shown only with at least k eNPS answers
**Category:** Policy
**Priority:** P0
**Source:** `src/lib/pulse/results.server.ts:237`
**Plain English:** A department's recommend score is shown only if at least k people in it answered that question, even when the department itself is shown.
**Specification:**
  Given Events shown with 7 answers, of which 4 answered the 0–10 question, and k = 5
  When results are calculated
  Then Events' eNPS is blank
**Confidence:** High

## Taking the survey

### RULE-008: Answers accepted only while open and inside the dates
**Category:** Validation
**Priority:** P0
**Source:** `src/lib/pulse/api.ts:101-104`
**Plain English:** An answer is accepted only when the survey is open and today, in the organisation's time zone, is between the start and end dates (both inclusive).
**Specification:**
  Given status open, start 15 November and end 29 November 2026 (Asia/Muscat)
  When someone submits on 30 November at 00:05 Muscat time
  Then the answer is refused as "closed"
**Parameters:** `general.timezone` (default Asia/Muscat); `calendar.fieldOpen`, `calendar.fieldClose`.
**Edge cases handled:** an empty date means no limit on that side.
**Confidence:** High

### RULE-009: A personal link works once
**Category:** Validation
**Priority:** P0
**Source:** `src/lib/pulse/api.ts:64-69` (check), `:146-170` (submit)
**Plain English:** A personal link opens the survey until an answer is sent through it; after that it says "already used".
**Specification:**
  Given a link that has been used
  When it is opened again
  Then the person sees "Already answered" and cannot submit
**Confidence:** High

### RULE-010: Shared link only when switched on
**Category:** Validation
**Priority:** P1
**Source:** `src/lib/pulse/api.ts:105`
**Plain English:** Answering without a personal link (shared link or QR poster) works only if "Allow the shared link and QR code" is on. One answer per device is asked of the phone, not enforced by the server.
**Specification:**
  Given the shared link is switched off
  When someone submits without a personal link
  Then the answer is refused as "token required"
**Confidence:** High. See SECURITY_FINDINGS SEC-005.

### RULE-011: Answer values must be on the scale; required questions must be answered
**Category:** Validation
**Priority:** P0
**Source:** `src/lib/pulse/api.ts:108-126`
**Plain English:** Agreement questions accept whole numbers 1–5 and the recommend question 0–10. A required question without a valid answer refuses the whole submission, and so does a submission with no scored answers at all. Only visible questions in visible topics count.
**Specification:**
  Given a required agreement question answered with 6
  When the survey is submitted
  Then it is refused as "incomplete" and nothing is stored
**Edge cases handled:** answers to hidden or unknown questions are ignored; comment text is trimmed and empty comments dropped.
**Confidence:** High

### RULE-012: Background details accepted only from fixed lists
**Category:** Validation
**Priority:** P1
**Source:** `src/lib/pulse/api.ts:128-135`
**Plain English:** Department must be an active department; length of service must be under 1, 1–3, 3–7 or 7+ years; level must be frontline, supervisor, manager or leadership; contract must be permanent or contract. Anything else is stored as "not given".
**Specification:**
  Given a submission with department "unknown-dept"
  When it is stored
  Then the department is blank and the answer counts in "no department given"
**Confidence:** High

### RULE-013: Submission rate limits
**Category:** Validation
**Priority:** P1
**Source:** `src/lib/pulse/api.ts:58`, `:95`
**Plain English:** From one network address, at most 120 shared-link answers, 200 personal-link answers and 120 link checks per hour.
**Specification:**
  Given 120 shared-link answers from one office address this hour
  When the 121st arrives
  Then it is refused with "too many submissions, wait a few minutes"; the answers stay on the phone
**Parameters:** 120 / 200 / 120 per hour, counted per hashed address.
**Confidence:** High

### RULE-014: Staff list upload: email check, duplicates, department matching
**Category:** Validation
**Priority:** P1
**Source:** `src/lib/pulse/mail.server.ts:118`, `:130-137`, `:152-197`
**Plain English:** Each row needs a valid email; repeats in the file are skipped; an email already on the list is not added again. The department may be given by its code, English name or Arabic name. If any department name matches nothing, the upload stops until the administrator confirms adding those people without a department.
**Specification:**
  Given 3 rows: a@ocec.om "Events", a@ocec.om "Events", b@ocec.om "Event"
  When uploaded
  Then 1 duplicate is skipped and the upload stops with "Event" listed as not matching any department
**Parameters:** up to 5,000 rows per part; emails up to 254 characters.
**Confidence:** High

## Calculations

### RULE-015: Favourable means 4–5 (1–2 for reverse-worded questions)
**Category:** Calculation
**Priority:** P0
**Source:** `src/lib/pulse/results.server.ts:144-145`
**Plain English:** On the 1–5 scale, 4 and 5 count as favourable and 1 and 2 as unfavourable; for questions marked "reverse", 1 and 2 are favourable. 3 is neutral.
**Specification:**
  Given the reverse-worded question "I often think about leaving" answered 2
  When scored
  Then it counts as favourable
**Confidence:** High

### RULE-016: Question and topic scores are favourable percentages
**Category:** Calculation
**Priority:** P1
**Source:** `src/lib/pulse/results.server.ts:29`, `:174-181`, `:326-329`
**Plain English:** A question's score is the share of favourable answers, rounded to a whole percent. A topic's score pools all answers to its questions.
**Specification:**
  Given a topic with question A (8 of 10 favourable) and question B (3 of 5 favourable)
  When scored
  Then A = 80, B = 60 and the topic = 11 of 15 = 73
**Confidence:** High

### RULE-017: Engagement index is the plain average of question scores
**Category:** Calculation
**Priority:** P1
**Source:** `src/lib/pulse/results.server.ts:182`
**Plain English:** The engagement index is the average of all question scores, each question counting equally however many people answered it, to one decimal place.
**Specification:**
  Given question A 80% (10 answers) and question B 60% (5 answers)
  When the index is calculated
  Then it is 70.0, not the pooled 73
**Confidence:** High. Question for OCEC: the index (equal weight per question) and topic scores (weighted by answers) can differ slightly. Is that the intended method?

### RULE-018: eNPS = % promoters (9–10) − % detractors (0–6)
**Category:** Calculation
**Priority:** P1
**Source:** `src/lib/pulse/results.server.ts:32-44`
**Plain English:** The recommend score is the percentage who answered 9 or 10 minus the percentage who answered 0 to 6, rounded to a whole number between −100 and +100.
**Specification:**
  Given 10 answers: four 9–10s, three 7–8s, three 0–6s
  When calculated
  Then eNPS = (4 − 3) ÷ 10 × 100 = +10
**Confidence:** High

### RULE-019: Response rate = answers ÷ headcount
**Category:** Calculation
**Priority:** P1
**Source:** `src/lib/pulse/results.server.ts:29`, `:235`
**Plain English:** Response rate is answers divided by the headcount entered in settings, as a whole percent. A department's rate is capped at 100%.
**Specification:**
  Given Culinary headcount 40 and 44 answers saying "Culinary"
  When calculated
  Then Culinary's rate shows 100%
**Parameters:** headcounts from Settings → Departments.
**Confidence:** High. A rate above 100% before capping means the headcount is out of date or people chose the wrong department.

### RULE-020: Public response rate appears only from k answers
**Category:** Policy
**Priority:** P1
**Source:** `src/lib/pulse/api.ts:40-45`
**Plain English:** The home page shows "x% have already answered" only once at least k answers exist, and never above 100%.
**Specification:**
  Given 4 answers and k = 5
  When the home page loads
  Then no percentage is shown
**Confidence:** High

### RULE-021: Key drivers: correlation with eNPS, from 10 answers
**Category:** Calculation
**Priority:** P1
**Source:** `src/lib/pulse/results.server.ts:268-298`
**Plain English:** For each topic, the system correlates each person's average topic score (reverse questions flipped) with their 0–10 answer, and ranks topics by that correlation. It needs at least 10 answers, or k if larger.
**Specification:**
  Given 9 people answered the 0–10 question
  When drivers are calculated
  Then no drivers are shown
**Parameters:** minimum max(k, 10); correlation rounded to 2 decimals.
**Confidence:** High

### RULE-022: Exports: who may export, what is hidden, formula neutralising
**Category:** Policy
**Priority:** P0
**Source:** `src/lib/pulse/api.ts:360-411`
**Plain English:** Super admins, People & Culture and executives can download department, question and comment files. Hidden groups export as "<k (hidden)", nothing exports below k answers, every export is logged, and text starting with = + − @ is prefixed so a spreadsheet cannot run it.
**Specification:**
  Given a comment "=HYPERLINK(...)"
  When comments are exported
  Then the cell contains '=HYPERLINK(...) as plain text
**Confidence:** High

## Access and administration

### RULE-023: Roles and what each may do
**Category:** Policy
**Priority:** P0
**Source:** `src/lib/pulse/core.server.ts:146-167`; checks throughout `src/lib/pulse/api.ts`
**Plain English:** Super admin: everything. People & Culture: settings, invitations, users (except super admins), all results. Executive: all results, comments and exports, no settings. Department head: own department and comments. Viewer: results without comments. A deactivated account has no access.
**Specification:**
  Given an executive
  When they try to save settings
  Then it is refused with "Your role cannot do this"
**Confidence:** High

### RULE-024: Only a super admin manages super admins; at least one must remain
**Category:** Policy
**Priority:** P0
**Source:** `src/lib/pulse/api.ts:480`, `:550-559`
**Plain English:** Only a super admin can invite, promote, demote or deactivate a super admin, and the last active super admin cannot be demoted or deactivated.
**Specification:**
  Given one active super admin
  When they try to deactivate themselves
  Then it is refused with "Keep at least one active super admin"
**Confidence:** High

### RULE-025: Accounts by invitation only once an owner exists
**Category:** Policy
**Priority:** P0
**Source:** `src/routes/api/auth/$.ts:8-22`
**Plain English:** Before an owner exists anyone may create an account. After that, a new account can be created only from an unused staff invitation less than 30 days old.
**Specification:**
  Given an owner exists
  When a stranger signs up without an invitation
  Then it is refused with "Accounts are by invitation only"
**Parameters:** invitation validity for sign-up: 30 days.
**Confidence:** High. The pending security patch also limits *accepting* an invitation to the invited email and to 30 days (SEC-002).

### RULE-026: First owner: setup code required on installed copies
**Category:** Policy
**Priority:** P0
**Source:** `src/lib/pulse/api.ts:204-212`; `src/lib/pulse/core.server.ts:187-198`
**Plain English:** The first signed-in person becomes the owner (super admin), but on an installed copy only if they enter the setup code from the installation. Once an owner exists, nobody else can claim.
**Specification:**
  Given an installed copy with a setup code and no owner
  When someone presses "Make me the owner" with a wrong code
  Then it is refused with "The setup code is not correct"
**Confidence:** High. Race condition noted in SEC-006.

### RULE-031: Deleting data is for the super admin only
**Category:** Policy
**Priority:** P0
**Source:** `src/lib/pulse/api.ts:855-893`
**Plain English:** Only a super admin can delete all answers, delete the invitation list, or delete everything.
**Specification:**
  Given a People & Culture user
  When they choose "Delete all answers"
  Then it is refused
**Confidence:** High

### RULE-032: Every settings change is logged by name
**Category:** Policy
**Priority:** P1
**Source:** `src/lib/pulse/api.ts:288-313`; wording in `src/lib/pulse/changes.ts:139-162`
**Plain English:** Each save records who changed what, with old → new values for short facts (dates, numbers, on/off). Repeated saves by the same person within 15 minutes are merged into one entry.
**Specification:**
  Given an administrator changes the end date from 20 to 29 November
  When settings save
  Then the history shows "Changed settings: Survey dates (end date 2026-11-20 → 2026-11-29)"
**Confidence:** High

## Lifecycle

### RULE-027: Survey status follows the dates
**Category:** Lifecycle
**Priority:** P1
**Source:** `src/routes/settings/index.tsx:31-36`; `src/lib/pulse/api.ts:290-297`
**Plain English:** Setting both dates (end on or after start) opens a draft survey, and clearing either date returns it to draft. Closing is a separate action, which records the closing time.
**Specification:**
  Given a draft survey
  When the administrator sets start 15 November and end 29 November
  Then the status becomes open and answers are accepted on those dates only (RULE-008)
**Edge cases handled:** passing the end date stops answers but leaves the status "open".
**Confidence:** High

### RULE-028: Reminders: three steps after each person's invitation
**Category:** Lifecycle
**Priority:** P1
**Source:** `src/lib/pulse/mail.server.ts:318-375`; defaults `src/lib/pulse/config.ts:172-200`
**Plain English:** People who have not answered get reminders 3, 7 and 10 days after *their own* invitation, each step once. Reminders stop when the survey is not open, after the end date, during quiet hours, or after a failed send to that person.
**Specification:**
  Given someone invited on 1 November who has not answered
  When reminders run on 4 November at 10:00
  Then they receive the day-3 reminder
**Parameters:** steps at day 3, 7, 10 (editable); batches of 20.
**Suspected defect:** if reminders have not run for a while, one run can send several steps to the same person at once. The query for step 2 includes people whose counter just moved to 1 in the same run (`reminders_sent <= step`). Someone invited 11 days before the first run would get the day-3, day-7 and day-10 emails together.
**Confidence:** Medium. Question for OCEC: should one run send at most one reminder per person? (Recommended: yes.)

### RULE-029: Quiet hours 21:00–07:00
**Category:** Policy
**Priority:** P2
**Source:** `src/lib/pulse/mail.server.ts:307-312`
**Plain English:** Automatic reminders are not sent between 21:00 and 07:00 in the organisation's time zone. The manual "send now" button can override this.
**Specification:**
  Given Asia/Muscat and a scheduled run at 22:30
  When reminders run
  Then nothing is sent ("Quiet hours — reminders wait until morning")
**Confidence:** High

### RULE-030: Invitation emails deleted 30 days after closing
**Category:** Lifecycle
**Priority:** P0
**Source:** `src/lib/pulse/mail.server.ts:386-397`
**Plain English:** The list of invited email addresses is deleted automatically a set number of days (default 30) after the survey is closed.
**Specification:**
  Given the survey was closed on 1 December and the setting is 30 days
  When the daily job runs on 31 December
  Then all invitation emails and links are deleted
**Suspected defect:** deletion needs the status "closed" with a recorded closing time. With date-driven status (RULE-027), a survey that simply passes its end date stays "open", so the emails are never deleted unless someone presses *Close survey*.
**Confidence:** Medium. Question for OCEC: should passing the end date count as closing, for deletion purposes?

## Questions for OCEC (before the rules are treated as final)

1. **RULE-003:** may People & Culture lower the anonymity floor, or only a super admin?
2. **RULE-017:** is an equal weight per question the intended engagement index?
3. **RULE-028:** at most one reminder per person per run? (Fix suggested.)
4. **RULE-030:** should the end date count as closing, so invitation emails are deleted on time? (Fix suggested.)
5. **Data retention:** Settings shows "keep answers 24 months" (`anonymity.retentionMonths`), but no code deletes answers after 24 months. Should it be enforced, or the setting removed? Two more settings, `stripSelfId` and `noExternalTraining`, exist in the configuration but nothing uses them.
