# How changes reach the live site

## Where it runs

| | Live |
|---|---|
| Address | https://estbanat.com |
| Hosting | Hostinger shared hosting, account `u152013600`, Node.js app |
| Code | GitHub `majidoman/ocec-pulse`, branch `main` |
| Database | Neon project `ocec-pulse`, branch `main` (real answers) |
| Health check | `/api/health` → `{"ok":true,"db":"up","migrations":"up to date"}` |
| Scheduler | Hostinger cron every 30 min: `curl https://estbanat.com/api/health`; the app runs reminders + clean-up at most hourly (no secret needed) |

Build settings (stored in hPanel): Node 22 · app type Nitro · build script `build:selfhost` · output `.output` ·
entry `server/index.mjs` · npm. Environment variable names: `deploy/hostinger-env.example`.

## The rule

The owner approves every change in chat before it goes live. Every release is in `CHANGELOG.md` with a
version, a date and how to undo it. Nothing reaches live without passing the release check, and nothing
is called done until the smoke test passes on the live address.

## Steps for each release

1. **Code** on `main`; add a `## [X.Y.Z]` section to `CHANGELOG.md` (what changed, how to undo it) and set
   `"releaseVersion"` in `package.json`.
2. **Gate:** `npm run release:check`: changelog entry, type check, tests, self-hosted build. All must pass.
   For bigger changes also run the browser checks in `scripts/*-check.cjs` against `npm run dev`.
3. **Push** `main` to GitHub. The source must be in GitHub before it goes live.
4. **Backup** if the release changes the database: a Neon branch or snapshot `backup-pre-vX.Y.Z-<date>`.
   Keep the latest three backups and delete older ones (Neon has a branch and snapshot limit).
5. **Migrations:** apply any new `migrations/*.sql` file to Neon `main` and record it in `_migrations`.
   The health check fails (503, listing the file) if this step is missed.
6. **Deploy:** Hostinger builds from GitHub `main` (or, without the GitHub link, from a zip made with
   `git archive --format=zip --prefix=ocec-pulse/ -o ocec-pulse-<commit>.zip HEAD`, uploaded to
   `public_html`). Wait for the build state `completed`.
7. **Smoke test:** `npm run smoke -- https://estbanat.com`. Every check must pass. Then send the owner the link.

Version numbers: X = big redesign, Y = new feature, Z = fix.

## Going back

**Code.** In hPanel → Deployments, redeploy the previous successful build, or revert the release commit and
release again.

**Data.** Restore the `backup-pre-…` branch or snapshot, or use Neon point-in-time restore inside the
history window (6 hours on the current plan). Restoring rewinds everything, including answers received
since; during a live survey prefer fixing forward.

**Database structure.** Migrations only ever add things, so an older version of the code keeps working
against a newer database.

## While the survey is open

No releases unless something is broken. Fixes only, tested first, with a backup before.
