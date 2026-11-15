# Changelog

Every change that reaches the live site is listed here, newest first.
Each release has a version, a date, what changed in plain words, and how to undo it.

## [Unreleased] — on the test site, waiting for approval
- Nothing yet.

## [1.2.0] — 2026-11-15 — released to live
Approved by the owner on 15 November 2026. Everything below was on the test site first.
- Undo: Vercel → Deployments → promote the 1.1.0 deployment (seconds). Database backup taken before release: Neon branch `backup-pre-v1.2.0-2026-11-15` (the free plan allows one snapshot, kept for 1.1.0). No database structure changes in this release; only settings rows. 1.1.0 runs unchanged against it.
- Not included: the security patch for SEC-001/SEC-002 (`analysis/pulse/security_remediation.patch`) — still waiting for "apply the fix".

### Questionnaire library 0.5 — 2026-11-15 — branches `staging` and `package`
- **Ready-made questionnaires inside the app** (Settings → Survey builder → Import questions from Excel → Ready-made questionnaires): 11 bilingual questionnaires, each with "Check and use" (same check, backup and history as an uploaded file) and a download button.
- **Added Bawsala's five employee satisfaction surveys** (Overall satisfaction, Leadership & trust, Career growth, Wellbeing & work environment, Recognition, collaboration & inclusion): 12 topics, 47 agree questions, eNPS and 3 comments each. "OCEC" replaced by the organisation-name placeholder so they work for any client; "(0-10)" removed from the question (the scale is on screen).
- **Arabic wording:** six questions that read badly once the organisation name is filled in ("لـالمركز", "بـالمركز") reworded.
- Sources and the build script live in `templates/questionnaires/` (README explains how to add more).
- Verified: all 11 pass the import check; satisfaction survey taken in English and Arabic with the name filled in; import checks 19/19; full test 66/66.

### Questionnaire import 0.4 — 2026-11-15 — branches `staging` and `package`
- **Import questions from Excel** (Settings → Survey builder): choose a workbook, see a check of the file (sections, question counts, problems with row numbers, warnings), then replace all sections and questions. The survey name can come from the file too.
- **Safe by design:** only before anyone has answered and while the questions are unlocked (checked by the server as well); the previous questions are kept as a backup with a "Go back to them" button; every import and restore is in the change history.
- **Templates:** blank template downloadable from the page; six ready workbooks in `templates/questionnaires/` (current survey, engagement pulse, new joiner, exit, wellbeing & safety, manager effectiveness), each with bilingual instructions and drop-down lists.
- Verified: 4 unit tests for the file reader, 19 browser checks (import, take the imported survey, blocking with answers, restore, Arabic), full test 66/66.
- Undo: roll back in Vercel; no database change (the backup is one settings row).

### Survey design 0.3 — 2026-11-15 — branches `staging` and `package` — what staff see
- **Opening screen:** one clear "Your answers are anonymous" panel (three facts, full notice one tap away) instead of six repeated boxes; time and closing date at the top; a 1–5 preview of the answer scale; the Start button stays in reach on phones.
- **Question pages:** "Section 2 of 15" and progress at the top, staying visible while scrolling; Back/Next stay in reach; answer buttons show the full words ("Strongly disagree", not "S. disagree"); visible keyboard focus; a short fade between sections (off when the phone's reduce-motion setting is on).
- **Arabic:** numbers in Arabic-Indic digits on the survey (١–٥، القسم ١ من ١٥), matching the dates.
- **Screen readers:** each answer group is named by its question (was an internal code); the 0–10 question is announced as a choice.
- **Thank-you page:** "Thank you. Your answers are in." with a check mark, one short paragraph and the closing date; no repeated text.
- **Wording:** "census" replaced by "survey" in all English screens, emails and messages (41 places). Home page: OCEC's slogan and "k≥5" replaced by a plain sentence (the slogan was built in, so every client would have shown it); capitalised small labels set in normal case.
- Not changed: colours, fonts, logo, results dashboard.
- Verified: full test (66 checks), 10 checks for unanswered questions / language / fonts, screenshots on phone and desktop in English and Arabic.
- Undo: roll back in Vercel. No database change. Saved texts in Settings (privacy notice, emails) keep their own wording until edited there.

### Package 0.2 — 2026-11-15 — branches `package` and `staging` — modern web guidance (Chrome / MDN)
Checked against Google Chrome's *Modern Web Guidance*. Its automatic legacy scan found nothing; these came from the guides on forms, accessibility, privacy and text scaling.
- **Fonts are bundled with the app.** They were loaded from Google's servers, so every staff member's browser contacted Google when the survey opened, and an installation without internet showed fallback fonts. Now served by the app itself; no request leaves for any outside server.
- **Unanswered questions are pointed out.** Pressing Next with a required question unanswered now marks each one ("⚠ Not answered yet", red outline), moves the person to the first one, and links the message to the question for screen readers. Before, only a general message appeared at the bottom.
- **Whole page follows the chosen language.** `<html lang/dir>` now switch to Arabic/RTL, so screen readers, browser translation and pop-up dialogs use the right language and direction.
- **Follows the phone's text-size setting** (`text-scale` opt-in; layout already uses relative sizes).
- **Installed copies send the same security headers as the Vercel site** (no framing, no referrer, no camera/microphone/location). Before, only Vercel added them.
- Package: `.env.example` was missing from the zip (the installer would have failed); added a double-click `Install.cmd` for Windows.
- Verified: full test (66 checks), 10 new checks for the items above, self-hosted build serving headers and fonts locally, first real install on Windows with Docker Desktop.
- Undo: roll back in Vercel / reinstall the previous package. No database change.

### Package 0.1 — 2026-11-14 — branch `package` — for installation testing
Self-hosted installation package (does not change the Vercel test or live sites).
- Plain Node server build (`npm run build:selfhost`) with no Grok layer; runs on any server with Docker.
- Docker Compose: app, PostgreSQL (not exposed), jobs (nightly backups kept 14 days, daily reminders), optional HTTPS (Caddy).
- First-run setup wizard at `/setup`: setup code, owner account, organisation, departments, dates, finish. Locked once finished.
- `SETUP_CODE` required to claim ownership on installed copies; `/api/health` for monitoring.
- `install.ps1` (Windows) and `install.sh` (Linux): generate secrets, build, start, show the setup code.
- `INSTALL.md`: install, wizard, backups, restore, update, HTTPS, security notes, troubleshooting.
- Settings form labels now linked to their fields (screen readers).
- Rate limit trusts only the proxy-added address.
- Verified here: standalone build, wizard (11 checks), runtime rehearsal with the real entrypoint, backup and restore round trip, full test (65 checks). Not verified: the Docker image build itself and install.ps1 (no Docker Hub access or PowerShell here).

### Test site, white-label, wording and settings (13–14 November)
- Test-site banner: an amber "TEST ENVIRONMENT" strip appears on every page of the test site only.
- This changelog and the release procedure (`RELEASING.md`).
- **White-label.** No client name is built into the app any more.
  - New settings: *Short name* (Settings → General, e.g. "OCEC") and *Product name* (Settings → Branding, e.g. "OCEC Pulse").
  - Every text, question, email and export that named OCEC now uses `{org}` (short name), `{orgName}` (full name) or `{app}` (product name), filled in from settings in both languages. Editors can use the same placeholders in their own questions and emails.
  - New installs start neutral ("Pulse", "your organisation") until the client's names are entered.
  - App icon, install manifest and link-preview image replaced with neutral versions. Known leftover: the Grok platform layer still adds its own manifest and a grey Grok placeholder icon link to every page (ours comes first). Removing that means editing the Grok platform files and ends the option of moving back to Grok.
  - **Release step:** after this goes live, enter OCEC's full name, short name and product name in Settings once, or the live site shows the neutral names.
  - Undo: roll back in Vercel. No database change.
- **Arabic wording:** "تعداد" (census) replaced by "استبيان" (survey) on every screen, email and setting default (39 places). Where the point is that everyone is asked, it reads "استبيان شامل لا عيّنة".
  - Note: Arabic email and privacy texts already saved in Settings keep their old wording until edited there.
- **Test sign-in without a password (test site only).** A secret link signs you in as a test account for any role (super admin, People & Culture, executive, department head, viewer) so each view can be checked quickly.
  - Works only where the `TEST_ACCESS_KEY` setting exists; it is set on the test environment only. The live site refuses it even with the key (checked: 404).
  - Rate-limited and written to the audit log. Test accounts are named `tester-<role>@test-access.local`.
  - Undo: delete the `TEST_ACCESS_KEY` setting in Vercel (link stops working at once on the next deploy) or roll back.
- **Survey screen (from the UI best-practice review).**
  - The introduction now states the real confidentiality minimum from Settings (no longer a fixed "5"), explains that the survey is anonymous and not just confidential, and says who reads written comments.
  - The progress bar moved from the top to just above the Back/Next buttons, as a plain bar with no "page x of 15" counter.
  - Fix: question text no longer overlaps the top edge of its answer card.
- **Staff list upload.**
  - Accepts Excel (.xlsx) as well as CSV or pasted rows; a template can be downloaded from the page.
  - A check screen appears before anything is saved: people ready to add, repeated rows, invalid emails, rows with no email, count per department.
  - A department name that matches no department now blocks the save and is listed by name. The admin either fixes the file or ticks "Add them without a department". Before, such people were added silently with no department.
  - Progress bar while saving; large lists are saved in parts of 250.
  - Confirmation with the date and time (survey time zone), file name, who uploaded and the counts. The last upload stays visible on the Invitations page.
  - One history entry per upload, however large.
- **Change history.** New page under Settings listing every administrator action, newest first, with search. Settings saves are now recorded by the server with the section and field changed, and old → new for dates, numbers and on/off values. Repeated edits to the same field within 15 minutes are merged into one entry.
- Uses the `read-excel-file` library, pinned to 9.3.14.
- Settings → General: clearer labels. "Cycle" is now **Survey name** (with an example), "Census status" is **Survey status**, "Field dates" is **Survey open and close dates**.
- **Survey dates and status, simplified.** Settings → General now has just **Start date** and **End date**. The status dropdown is gone: the status follows the dates automatically (not scheduled / scheduled / open until … / ended), using the same rule the server applies to accept answers. Closing early or reopening stays on the Danger zone page. The separate "Delivery calendar" page (kick-off, freeze, presentation dates) is removed from the menu.
- **Clearer wording, Arabic and English.** Research jargon replaced throughout: الدورة → الاستبيان، بنك الأسئلة → قائمة الأسئلة، مجمّد للميدان → مقفل أثناء الاستبيان، تواريخ الميدان → تاريخا البدء والانتهاء، المجهولية → السرية، القوة المعتمدة → إجمالي عدد الموظفين، الأفراد والثقافة → الموارد البشرية; "Freeze for field" → "Lock the questions", "cycle" → "survey".
- **Survey name everywhere.** "Voice 2026" is no longer built in. The home page, FAQ, survey and emails use the survey name from Settings → General (placeholder `{survey}`). New default: "Employee Survey 2026" / "استبيان الموظفين ٢٠٢٦".

## [1.1.0] — 2026-11-13 — commit d5881fc
Security hardening after the audit.
- Limit on bulk answers from one network address (120 an hour on the shared link).
- New accounts by invitation only once an owner exists.
- Security headers; the site can no longer be embedded elsewhere.
- Grok script removed from every page.
- Mail, validation and build packages upgraded.
- Database: adds table `pulse_ratelimit` (migration 0003). Safe to keep if rolled back.
- Undo: roll back to 1.0.0 in Vercel. No data change needed.

## [1.0.0] — 2026-11-12 — commit fe70093
First live version on Vercel.
- Working survey: database, sign-in, real results, email invitations and reminders.
- Web framework upgraded to the patched version required by Vercel.
- Database: migrations 0001 (accounts) and 0002 (survey tables).
