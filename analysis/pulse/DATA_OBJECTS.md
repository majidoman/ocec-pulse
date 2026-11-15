# Pulse — core data records

Tables are created by `migrations/0002_pulse.sql` and `0003_ratelimit.sql`. The rules that use each record are listed in BUSINESS_RULES.md.

| Record (table) | Key fields | Holds personal data? | Used by |
|---|---|---|---|
| Settings (`pulse_settings`) | `key`, `value` (JSON: organisation, dates, departments and headcounts, questions, anonymity floor, email texts, reminder steps) | Mail user name; the mail password is stored encrypted under a separate key | RULE-003, 008, 010, 027–030, 032 |
| Staff account (`pulse_staff`) | `user_id`, `email`, `name`, `role` (super, pc, exec, head, viewer), `department_id`, `active` | Yes (staff who read results) | RULE-006, 023–026, 031 |
| Staff invitation (`pulse_staff_invites`) | `code`, `email`, `role`, `department_id`, `created_at`, `accepted_by` | Yes | RULE-025 (and SEC-002) |
| Survey invitee (`pulse_invitees`) | `id`, `email`, `department_id`, `token`, `opened`, `used`, `reminders_sent`, `send_error`, `invited_at` | Yes; deleted after closing (RULE-030) | RULE-009, 014, 028, 030 |
| Response (`pulse_responses`) | `id`, `submitted_on` (date only), `lang`, `department_id`, `tenure`, `level`, `contract`, `source` (token/open) | No: no name, email, link, address or time | RULE-001, 002, 004, 008, 012 |
| Answer (`pulse_answers`) | `response_id`, `question_id`, `value` (1–5 or 0–10) | No | RULE-011, 015–018, 021 |
| Comment (`pulse_comments`) | `id`, `question_id`, `department_id`, `body` (≤ 1,000 characters), `submitted_on`; not linked to a response | Only what people type | RULE-005, 022 |
| Email campaign (`pulse_campaigns`) | campaign progress counters | No | Invitations |
| Change history (`pulse_audit`) | `at`, `actor`, `action_en`, `action_ar` | Staff names and emails | RULE-003, 032 |
| Rate-limit counter (`pulse_ratelimit`) | `bucket` (hashed address and action), `hour`, `n` | No: addresses are hashed with the server secret and removed after 3 hours | RULE-013 |
