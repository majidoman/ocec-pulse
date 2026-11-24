# OCEC Pulse — project instructions

(Referenced by `AGENTS.md`: "If `AGENTS.project.md` exists, it holds the
user's project instructions. Follow it with the same priority as this file."
`AGENTS.md` itself is Grok's own platform sandbox contract — don't edit it
for product reasons, don't strip its branding/startup.sh rules, and don't
treat it as documentation about this product.)

Employee engagement survey platform for OCEC. Bilingual (Arabic/English),
originally white-labeled then re-focused on OCEC only. TanStack Start (React
19) + Vite + TypeScript, PostgreSQL via Kysely, better-auth.

## Where this actually runs

| | |
|---|---|
| Live site | https://estbanat.com |
| Hosting | Hostinger shared hosting, Node.js app, account `u152013600` |
| Code of record | GitHub `majidoman/ocec-pulse`, branch `main` |
| Database | Neon project `ocec-pulse`, branch `main` (real survey answers) |
| Health check | `/api/health` → `{"ok":true,"db":"up","migrations":"up to date"}` |

Hostinger is **not** currently auto-deploying from GitHub (`gitAutoDeployment`
was null as of this sync) — releases are built from a zip archive uploaded by
hand. `RELEASING.md` describes the intended process (code → `main` → GitHub →
Hostinger build); wiring up the actual git auto-deploy is still open.

`pulse.estbanat.com` is a **separate, intentional** marketing/SaaS site for
the Pulse product generally — different codebase, do not touch it from here.

## Commands

```
npm run dev              # vite dev on :8080
npm run build             # vite build + db:migrate
npm run build:selfhost    # the build Hostinger actually runs
npm run typecheck         # tsc --noEmit
npm test                  # node --test
npm run release:check     # changelog entry + typecheck + tests + selfhost build
npm run smoke -- <url>    # smoke test against a live address
```

## Hard invariants

- **Migrations are additive only** — never edit a shipped migration; add a new
  numbered one.
- **`BETTER_AUTH_SECRET` must never change** after first setup — it also
  decrypts the saved mailbox password.
- **Survey answers carry no PII.** No name/email/IP/timestamp tied to a
  response; groups below the anonymity floor stay hidden.
- **Bilingual text** — any user-facing string change needs English and Arabic
  together.
- **Invite-only after setup** — no public sign-up path once an owner exists.
- Full release process (versioning, backups, smoke test, rollback) is in
  `RELEASING.md`. `HANDOVER.md` covers first-run setup and hosting options.

## Security review

A private security review exists for this project. It is **not** kept in this
public repo. Ask the project owner before acting on security matters, and
never add vulnerability details, exploit notes, or credential-status notes to
this repository.

## Secrets — never commit

`.env`, `.env.*` (except `.env.example`), and `owner-login.txt` are gitignored.
Don't remove them from `.gitignore`.
