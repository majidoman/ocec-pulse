#!/bin/sh
# Scheduled jobs container: nightly database backup + daily reminder run.
# Runs busybox crond in the foreground. Schedules use the container's TZ (set in .env).
set -eu
: "${PGHOST:=db}"; : "${PGUSER:=pulse}"; : "${PGDATABASE:=pulse}"
: "${BACKUP_CRON:=30 1 * * *}"
: "${REMINDER_CRON:=0 9 * * *}"
: "${BACKUP_KEEP_DAYS:=14}"
export PGHOST PGUSER PGDATABASE PGPASSWORD BACKUP_KEEP_DAYS CRON_SECRET

mkdir -p /backups
cat > /usr/local/bin/pulse-backup <<'SH'
#!/bin/sh
set -eu
f="/backups/pulse-$(date +%Y%m%d-%H%M).dump"
pg_dump -Fc -f "$f.tmp" && mv "$f.tmp" "$f"
find /backups -name 'pulse-*.dump' -type f -mtime +"$BACKUP_KEEP_DAYS" -delete
echo "[backup] $(date '+%F %T') wrote $f ($(du -h "$f" | cut -f1))"
SH
cat > /usr/local/bin/pulse-reminders <<'SH'
#!/bin/sh
wget -q -O - --header "Authorization: Bearer $CRON_SECRET" http://app:3000/api/cron/reminders \
  && echo " [reminders] $(date '+%F %T') ok" || echo "[reminders] $(date '+%F %T') failed"
SH
chmod 755 /usr/local/bin/pulse-backup /usr/local/bin/pulse-reminders

{
  echo "$BACKUP_CRON /usr/local/bin/pulse-backup >> /proc/1/fd/1 2>&1"
  echo "$REMINDER_CRON /usr/local/bin/pulse-reminders >> /proc/1/fd/1 2>&1"
} > /etc/crontabs/root

echo "[jobs] backups: '$BACKUP_CRON' (keep $BACKUP_KEEP_DAYS days) · reminders: '$REMINDER_CRON' · TZ=${TZ:-UTC}"
exec crond -f -l 8
