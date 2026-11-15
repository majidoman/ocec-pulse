# Pulse — security findings

**System:** OCEC Pulse (`staging` branch, commit `c291818`), Vercel deployment and self-hosted Docker package.
**Method:** the code-modernization plugin's *harden* procedure, fallback mode (no workflow tool in this session): `npm audit`, a secrets sweep of the source and git history, then a manual read of every server function, API route and the sign-in configuration. Each High finding was reproduced against a local copy before and after the fix.
**Date:** 15 November 2026.

## Scorecard

| Severity | Count | IDs |
|---|---|---|
| Critical | 0 | |
| High | 2 | SEC-001, SEC-002 (both fixed in `security_remediation.patch`) |
| Medium | 4 | SEC-003, SEC-004, SEC-005, SEC-006 |
| Low | 5 | SEC-007 to SEC-011 |
| Info | 2 | SEC-012, SEC-013 |

Top weakness classes: CWE-307 (unlimited password guessing), CWE-639 (bearer invitation codes), CWE-348 (trusting a client-supplied address header), CWE-362 (race on first owner).

**Coverage gaps:** none. Every class on the checklist was covered: injection, authentication and session, secrets, dependency CVEs, access control, XSS/CSRF, input validation, SSRF/redirects and misconfiguration. Fallback mode has no independent refuter agents. Instead, both High findings were confirmed by running the attack against a local copy.

**Credentials:** none hardcoded in the source or the git history (sweep for connection strings, `npg_`, `sk-`, `xai-`, `AKIA`, private keys). One credential exposure exists *outside* the code: the Neon database password was shared in a chat earlier and is still in use on both branches. Rotate it (open item since 13 November).

## What is already strong

- **Database queries:** every query uses parameters (tagged templates or `$1` placeholders); no SQL is built from text.
- **Admin access:** all 25 signed-in server functions check the session, and the 22 admin ones also check the person's role on the server. The other three are "who am I", claiming ownership (setup code) and accepting an invitation. Only a super admin can create or change another super admin, and the last super admin cannot be removed.
- **Survey answers:** the server re-checks every answer against the live question list. Invitation tokens are consumed in the same database statement that stores the answer, and the stored answer keeps no link to the token.
- **Cross-site attacks (CSRF):** the framework's built-in protection is on, and session cookies use `SameSite=Lax` and the `__Host-` prefix with `Secure`.
- **Exports:** spreadsheet formulas (`= + - @`) in comments are neutralised, and groups below the anonymity floor are hidden.
- **Emails:** every text is HTML-escaped before links are added.
- **Setup code and test sign-in key:** both are compared in constant time.

## Findings

| ID | CWE | Severity | Location | Exploit scenario | Fix |
|---|---|---|---|---|---|
| SEC-001 | CWE-307 Improper restriction of excessive authentication attempts | **High** | `src/routes/api/auth/$.ts:24` | An attacker scripts password guesses against an HR or super-admin email. Better Auth's built-in limiter counts in each server instance's memory, so on Vercel the count restarts on every new instance and guessing is effectively unlimited. A hit exposes every result and comment. | Count attempts in Postgres: 30 per hour per address, 20 per hour per account. **Patched.** |
| SEC-002 | CWE-639 Authorization bypass through user-controlled key | **High** | `src/lib/pulse/api.ts:240-252` | A staff invitation (including People & Culture or executive access) is a bare code with no expiry and no tie to the invited email. Anyone who receives a forwarded invitation email can accept it with their own account and see all results. | Accept only when the signed-in email matches the invited one, and only within 30 days. **Patched.** |
| SEC-003 | CWE-348 Use of less trusted source | Medium | `src/lib/pulse/core.server.ts:278` | On a self-hosted install the app is reachable directly on port 8080, and the bundled Caddy passes client headers through. An attacker sends a new `X-Real-IP` with each request and so dodges every per-address limit (survey submissions, token checks, sign-in per address). The per-account sign-in limit from SEC-001 still holds. | Trust `X-Real-IP` only when set by your own proxy: in `deploy/Caddyfile` add `header_up X-Real-IP {remote_host}`, publish port 8080 only to localhost when the HTTPS container is used, and read the socket address otherwise. |
| SEC-004 | CWE-359 Exposure of private personal information | Medium | `src/lib/pulse/config.ts:290`, rendered at `src/components/mark.tsx:7` | The logo setting accepts any URL, not just an uploaded image. An administrator (or anyone who takes over an admin account) sets it to an outside image, and every staff member who opens the survey then reports their IP address, device and time to that outside server. That undermines the anonymity promise. | Accept only `data:image/(png\|jpeg\|webp\|gif);base64,` under 300 KB in `normalizeConfig`, and add `img-src 'self' data:` to the Content-Security-Policy. |
| SEC-005 | CWE-799 Improper control of interaction frequency | Medium | `src/lib/pulse/api.ts:95` | The shared link / QR code accepts up to 120 answers per hour from one address, so a script can add hundreds of fake answers in a day and skew results. The "one answer per device" rule is only on the phone. | **Business decision.** For staff with work email, switch off the shared link (Settings → General). If it stays on, lower the limit to 30 per hour and check the open-link count against headcount in the report. |
| SEC-006 | CWE-362 Race condition | Medium | `src/lib/pulse/core.server.ts:187-198` | The owner claim uses `insert … where not exists`, which two simultaneous requests can both pass, despite the code comment saying otherwise. On a fresh Vercel deployment (no setup code) an attacker who signs up at the same moment as the owner also becomes a super admin. The window is small. | Claim a fixed `owner_claimed` row in `pulse_settings` with `on conflict do nothing` first, and insert the owner only if that row was created. |
| SEC-007 | CWE-208 Observable timing discrepancy, CWE-598 Secret in query string | Low | `src/routes/api/cron/reminders.ts:19-20` | The reminders key is compared with `!==` and travels in the URL, so it can appear in proxy logs. Holding it only lets someone trigger due reminders early. | Use `timingSafeEqual` on hashes and accept the key only in the `Authorization` header. |
| SEC-008 | CWE-601 Open redirect | Low | `src/routes/api/test-access.ts:71` | `next=/\evil.com` passes the check, and browsers read `/\` as `//`. Exploiting it needs the test key, and the route is off on the live site. | Reject `next` containing `\`, or accept only known paths. |
| SEC-009 | CWE-200 Exposure of sensitive information | Low | `src/lib/pulse/api.ts:274` | Every staff role, including viewer and department head, can read the full settings: mail server, mail user name, sender address and email templates. The mail password is not included. | Return the full settings only to admin roles and a reduced copy to the others. |
| SEC-010 | CWE-918 Server-side request forgery | Low | `src/lib/pulse/mail.server.ts:81` | An administrator can point the mail server setting at an internal address, and the "test email" button makes the server connect to it, letting them probe the internal network. | On self-hosted installs, refuse private address ranges unless a setting allows them. |
| SEC-011 | Dependency advisory GHSA-44jh-23m7-hpcf (npm rates it Critical) | Low in Pulse | `package.json:57` (`better-auth` 1.6.30) | The advisory is about rate-limit counts stored *in Postgres through Better Auth's adapter* being exceeded under concurrent requests. Pulse uses Better Auth's default in-memory limiter and its own Postgres limiter (SEC-001), so that code path is not used. | Upgrade to `better-auth` ≥ 1.7.7 once the platform auth files are made compatible (1.7.x broke them on 13 November). Keep the version pinned until then. |
| SEC-012 | CWE-346 Origin validation | Info | `src/lib/auth/server.ts:119` | `http://localhost:8080` origins are trusted on the live site too. That only matters if an attacker controls a page on the victim's own machine. | Add local origins only when `NODE_ENV !== "production"`. |
| SEC-013 | Design | Info | `migrations/0002_pulse.sql` | Anyone with database access could, with effort, link an answer to its invitation through transaction timing. Already documented in `INSTALL.md` and the 13 November audit. | Restrict database access and say so in the staff privacy notice. |

No text in the source tried to give instructions to an automated reviewer.

## Dependency scan (`npm audit --omit=dev`, verbatim summary)

| Package | Installed | Advisory | Fixed in | Reachable in Pulse |
|---|---|---|---|---|
| better-auth | 1.6.30 | GHSA-44jh-23m7-hpcf (via adapters) | 1.7.7 | No, see SEC-011 |
| @better-auth/drizzle-adapter | 1.6.x | GHSA-44jh-23m7-hpcf | 1.7.7 | No (adapter not used for rate limits) |
| @better-auth/kysely-adapter | 1.6.x | GHSA-44jh-23m7-hpcf | 1.7.7 | No |

`3 vulnerabilities (2 low, 1 critical)`. All three are the same advisory.

## Remediation log

| ID | Fix | Patch |
|---|---|---|
| SEC-001 | Sign-in attempts counted in the database: 30 per hour per address, 20 per hour per account; the 21st gets "Too many sign-in attempts. Wait an hour, then try again." Trade-off: someone can deliberately lock one account for up to an hour; the owner can still use another address. | `security_remediation.patch` (`$.ts`, `core.server.ts`) |
| SEC-002 | Invitation accepted only by the invited email address, within 30 days; clear messages for "different email" and "expired". | `security_remediation.patch` (`api.ts`) |
| SEC-003 to SEC-012 | Not patched (Medium and below). Fixes described above; available on request. | none |

There is no credential patch (`security_remediation.local.patch`), because no credentials are in the code.

## Patch review

The patch was applied to a separate copy of `staging`, not to the working code, and tested there:

| Hunk | Verdict | Evidence |
|---|---|---|
| SEC-001 `src/routes/api/auth/$.ts` | RESOLVES | 20 wrong guesses on one account from 20 addresses → `401`; 21st → `429`. 30 guesses from one address → `401`; 31st → `429`. The real owner still signs in. |
| SEC-001 `src/lib/pulse/core.server.ts` | RESOLVES | Existing callers keep per-address behaviour (default `perAddress: true`); type check and lint clean. |
| SEC-002 `src/lib/pulse/api.ts` | RESOLVES | Another person's People & Culture invitation → refused and still unused; own invitation → accepted; invitation older than 30 days → "expired". |
| Whole patch | No new risk found | Full end-to-end suite 66/66 with the patch applied; `git apply --check` clean on `staging`. |

Apply from the repository root after review:

```sh
git apply analysis/pulse/security_remediation.patch
```
