# Changelog

Every change that reaches the live site is listed here, newest first.
Each release has a version, a date, what changed in plain words, and how to undo it.

## [Unreleased] — on the test site, waiting for approval
- Test-site banner: an amber "TEST ENVIRONMENT" strip appears on every page of the test site only.
- This changelog and the release procedure (`RELEASING.md`).

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
