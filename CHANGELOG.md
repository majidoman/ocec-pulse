# Changelog

Every change that reaches the live site is listed here, newest first.
Each release has a version, a date, what changed in plain words, and how to undo it.

## [Unreleased] — on the test site, waiting for approval
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
