# OCEC Pulse — handover

The demo is now a working survey system: answers are saved in a database, the
insights room needs a sign-in, every figure is computed from real responses,
and invitations and reminders are sent by email.

## Go live, in order

1. **Get this code into the project and publish.** Sign-in and the database are
   switched on in `.grok/app-env.json`; the database tables are created
   automatically on publish (`migrations/0001_auth.sql`, `0002_pulse.sql`).
2. **Sign in first and claim ownership.** Open `/insights`, sign in, press
   "Claim ownership". Until someone does this, the first person to sign in can
   take it — do it the minute the site is published.
3. **Settings → General:** cycle name, open and close dates, support contact,
   and the public web address of the site (used for links in emails).
4. **Settings → Departments & roster:** confirm headcounts (defaults are the
   proposal's 400 people across 12 departments), then on the
   Invitations page add the staff email list (one per line: email, department).
5. **Settings → Invitations & email:** enter the mailbox details (for a
   Hostinger mailbox: smtp.hostinger.com, port 465, SSL on), save the password,
   press "Test send".
6. **Settings → Users & roles:** invite OCEC's People & Culture users,
   executives and department heads. Each gets a one-time join link.
7. **Set status to Open**, then **Invitations → Send**.

## Hosting on Vercel (instead of Grok)

1. Import this repository in Vercel (Add New → Project). Leave the build
   settings as they are; `vercel.json` sets them.
2. In the project, open Storage and add a Neon Postgres database. It adds
   `DATABASE_URL` to the project by itself.
3. Add two environment variables (Settings → Environment Variables):
   - `BETTER_AUTH_SECRET` — a long random text. Never change it afterwards:
     it also protects the saved mailbox password.
   - `BETTER_AUTH_URL` — the exact public address, for example
     `https://ocec-pulse.vercel.app` (no slash at the end). Sign-in is refused
     from any other address, including Vercel's preview links.
4. Deploy. The database tables are created during the build.
5. Sign in with email and password and claim ownership. Google and X sign-in
   are hidden outside Grok because they run through Grok's own service.
6. Optional: add `CRON_SECRET` (any random text). Vercel then calls the
   reminders address once a day at 09:00 Muscat time on its own.

If the address changes later (a custom domain), update `BETTER_AUTH_URL` and
the public web address in Settings → General, then redeploy.

## How people answer

- **Personal link (email):** works once, then is spent. The link is never
  stored with the answers.
- **Shared link / QR poster** (`/survey`): for staff without email. One answer
  per device only — it cannot stop a determined person answering twice on two
  phones. Turn it off in Settings → General if that matters.

## Reminders

Reminders go only to people whose link is unused, once per step, outside quiet
hours. They are sent whenever an administrator opens the insights room, or
from the "Send due reminders now" button. For fully automatic sending, have
any scheduler call the address shown on the Reminders page once a day.

## Anonymity rules that are enforced by the server

- No name, email, link, IP address or time of day is stored with an answer.
- Any group below the floor (default 5) is hidden, and if exactly one group is
  hidden the next smallest is hidden too, so it cannot be worked out by
  subtraction. The same applies to exports.
- Comments are stored separately from answers.
- Department heads see only their own department.

## Things that deliberately show nothing yet

- **Benchmarks** and **Year on year** stay empty until real, sourced figures
  are entered in Settings. Nothing is invented.
- **AI briefing** writes a rule-based summary from the real figures. It uses a
  language model only if an `XAI_API_KEY` is set on the server, and then sends
  only anonymised totals.

## Notes

- The code that hid the "Created with Grok" banner was removed; that banner is
  controlled from the project's settings on the platform, not from code.
- Platform self-tests that assert "sign-in is off" now fail by design, because
  sign-in is on.
