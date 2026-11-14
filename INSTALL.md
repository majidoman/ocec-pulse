# Pulse survey — installation guide (self-hosted)

One package, installed on a server the client controls. Everything runs in Docker:

| Container | What it does |
|---|---|
| `app` | The survey website and dashboard (port 8080 by default) |
| `db` | PostgreSQL database. Not reachable from outside the server. |
| `jobs` | Nightly database backup to `./backups`, daily reminder emails |
| `https` (optional) | HTTPS front door with an automatic certificate (Caddy) |

---

## 1. What the server needs

- **Test machine (Windows 10/11):** Docker Desktop with WSL 2, 4 GB free memory, internet the first time (to download Node and PostgreSQL images).
- **Client server (recommended):** Linux (Ubuntu 22.04+ or similar), Docker Engine with the Compose plugin, 2 CPU, 4 GB memory, 20 GB disk.
- **An address:** the exact web address staff will open, for example `https://survey.client.om`.
- **A mailbox** for sending invitations (SMTP host, port, user, password).

> **Sign-in works only over HTTPS, or on `http://localhost` on the server itself.**
> Opening `http://<server-ip>:8080` from another computer will load the survey but sign-in will fail.
> For real use, put the app behind HTTPS (section 5).

---

## 2. Install

### Windows test machine
1. Install and start **Docker Desktop**; wait for "Engine running".
2. Unzip the package to a folder, e.g. `C:\Pulse`.
3. Right-click `install.ps1` → **Run with PowerShell**.
   If Windows blocks it, open PowerShell in the folder and run:
   `powershell -ExecutionPolicy Bypass -File .\install.ps1`
4. Press Enter to accept `http://localhost:8080`.
5. The first build takes 5–10 minutes. The script then opens the setup page and shows the **setup code**.

### Linux server
```sh
unzip pulse-package.zip -d /opt/pulse && cd /opt/pulse
sh install.sh            # enter the public address, e.g. https://survey.client.om
```

### What the script does
- Creates `.env` with new random secrets (database password, sign-in secret, reminder key, setup code). Only if `.env` does not exist yet.
- Runs `docker compose up -d --build`, waits for the health check, prints the address and setup code.

---

## 3. First-run setup wizard

Open `<address>/setup`:

1. **Owner account** — enter the setup code from `.env`, your name, work email and a password (10+ characters). This account becomes the super admin.
2. **Organisation** — full name, short name (used inside questions), survey name, product name, support email, time zone.
3. **Departments** — names in English and Arabic, and headcount. Response rates use these numbers.
4. **Survey dates** — start and end. Staff can answer only between them. Shared link / QR on or off.
5. **Finish** — then, from the dashboard:
   - Settings → Invitations & email: mailbox details, **send yourself a test email**.
   - Settings → Users & roles: invite HR, executives, department heads.
   - Invitations: upload the staff list (Excel or CSV).
   - Take the survey yourself on a phone, then delete the test answer (Settings → Danger zone).

After the owner exists, nobody else can create an account without an invitation, and the wizard cannot be run again.

---

## 4. Everyday operations

All commands run in the package folder.

| Task | Command |
|---|---|
| See status | `docker compose ps` |
| Logs | `docker compose logs -f app` (or `jobs`, `db`) |
| Stop / start | `docker compose stop` / `docker compose start` |
| Backup now | `docker compose exec jobs pulse-backup` |
| Send due reminders now | `docker compose exec jobs pulse-reminders` |
| Health check | open `<address>/api/health` → `{"ok":true,"db":"up"}` |

### Backups
- Nightly at 01:30 (server time zone, `BACKUP_CRON` in `.env`) to `./backups/pulse-YYYYMMDD-HHMM.dump`.
- Kept for 14 days (`BACKUP_KEEP_DAYS`).
- **Copy `./backups` to another machine or storage regularly.** Backups on the same server do not survive a disk failure.

### Restore a backup
This replaces all current data with the backup's contents. Answers received after the backup are lost.
```sh
docker compose stop app jobs
docker compose exec -T db pg_restore --clean --if-exists --no-owner -U pulse -d pulse < backups/pulse-YYYYMMDD-HHMM.dump
docker compose start app jobs
```
(Windows PowerShell: use `cmd /c "docker compose exec -T db pg_restore --clean --if-exists --no-owner -U pulse -d pulse < backups\pulse-YYYYMMDD-HHMM.dump"`.)

### Update to a new version
```sh
docker compose exec jobs pulse-backup     # 1. backup first
# 2. replace the package files with the new version — keep .env and the backups folder
docker compose up -d --build              # 3. rebuild; database changes apply automatically
```
Database changes only ever add tables or columns, so an older version can still run if you need to go back.

---

## 5. HTTPS

**Option A — the client's existing reverse proxy / load balancer (preferred in enterprises):**
forward `https://survey.client.om` to `http://<server>:8080`, pass the `X-Forwarded-For` and `X-Forwarded-Proto` headers, and set `PUBLIC_URL=https://survey.client.om` in `.env`.

**Option B — the built-in HTTPS container:**
```sh
# in .env
PUBLIC_URL=https://survey.client.om
PUBLIC_HOST=survey.client.om
# for an internal-only name, add:  TLS_MODE=internal   (self-signed; browsers warn once)
docker compose --profile https up -d
```
A real certificate needs the name to resolve publicly and ports 80/443 open.

After changing `PUBLIC_URL`, restart: `docker compose up -d`.

---

## 6. Security notes for the client's IT

- The database has no published port; only the app and jobs containers reach it.
- The app runs as a non-root user.
- `.env` holds all secrets; keep it readable by administrators only. **Never change `AUTH_SECRET` after setup**: it also decrypts the saved mailbox password, and everyone would be signed out.
- No data leaves the server except invitation and reminder emails sent through the client's mailbox.
- Answers are stored without names, emails, links, IP addresses or time of day. Whoever has database access could, with technical effort, link an answer to its invitation; restrict server and database access accordingly and say so in the staff privacy notice.
- Request logs from any reverse proxy contain IP addresses and times; set their retention to the shortest your policy allows.

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| Sign-in does nothing / logs you straight out | You are not on `PUBLIC_URL`, or not on HTTPS. Use the exact address in `.env`. |
| `install.ps1` says Docker is not running | Start Docker Desktop and wait for "Engine running". |
| Build fails downloading images | The machine needs internet access to Docker Hub the first time. |
| App keeps restarting | `docker compose logs app` — usually a wrong `DB_PASSWORD` after editing `.env`. |
| Port 8080 in use | Set `APP_PORT=8090` and `PUBLIC_URL=http://localhost:8090` in `.env`, then `docker compose up -d`. |
