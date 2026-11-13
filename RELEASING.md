# How changes reach the live site

## Two environments

| | Test | Live |
|---|---|---|
| Address | https://ocec-pulse-staging.vercel.app | https://ocec-pulse.vercel.app |
| Code branch | `staging` | `main` |
| Database | Neon branch `staging` (test data only) | Neon branch `production` (real answers) |
| Emails / reminders | Only if a test mailbox is set up there | Real |

The two never share data. Real survey answers are never copied into the test site.

## The rule

Nothing is pushed to `main` directly. Every change goes: build → test site → owner approves → live.

## Steps for each change

1. Make the change on the `staging` branch and add a line under **[Unreleased]** in `CHANGELOG.md`.
2. Run the automated end-to-end test. It must pass in full.
3. Push `staging`. The test site updates by itself in about a minute.
4. The owner checks the change on the test site and says **approved** (or asks for changes).
5. On approval:
   a. Take a snapshot of the live database, named `pre-vX.Y.Z-<date>`.
   b. Move the **[Unreleased]** notes under a new version number and date in `CHANGELOG.md`.
   c. Merge `staging` into `main`, tag it `vX.Y.Z`, push. The live site updates by itself.
   d. Check the live site loads and the error log is clean.

Version numbers: X = big redesign, Y = new feature, Z = fix.

## Going back

**Features (code).** In Vercel, every past release stays available. Rolling back switches the live
site to an earlier release in seconds, without rebuilding. Then revert the change on `main` so the
next release does not bring it back.

**Data.** Two safety nets on the live database:
- A named snapshot is taken before every release and can be restored.
- Point-in-time restore: the database can be rewound to any moment inside the history window
  (6 hours on the current Neon plan; longer on a paid plan).

Restoring data rewinds *everything* to that moment, including answers received since. During a
live survey, restoring is a last resort; prefer fixing forward.

**Database structure.** Structure changes (migrations) only ever add things, never remove or
rename, so an older version of the code keeps working against a newer database. A change that
must remove something is done in two releases.

## While the survey is open

No releases unless something is broken. Fixes only, tested first, with a snapshot before.
