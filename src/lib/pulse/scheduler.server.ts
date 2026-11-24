/**
 * Scheduled work: due reminders and data clean-up for every survey.
 *
 * Two ways in:
 *   - /api/cron/reminders?key=… (an external scheduler that holds the key), runs now;
 *   - runScheduledIfDue(), called by /api/health, runs at most once an hour. Any uptime ping or
 *     a host cron job that calls the public health address keeps reminders going, with no secret
 *     to copy anywhere. Calling it more often changes nothing: the hour is claimed in one
 *     database statement, and every step is safe to repeat (each person gets each reminder once,
 *     never two within 20 hours, never in quiet hours).
 */
import { getSql } from "@/lib/db";
import { inSurvey, listSurveyIds } from "./core.server";
import { runDueReminders, runRetention } from "./mail.server";

export type ScheduledRun = {
  sent: number;
  failed: number;
  remaining: number;
  skipped?: string;
  surveys: number;
  purgedInvitees: number;
  purgedResponses: number;
};

export async function runScheduledWork(): Promise<ScheduledRun> {
  const surveys = await listSurveyIds();
  let sent = 0;
  let failed = 0;
  let remaining = 0;
  let purgedInvitees = 0;
  let purgedResponses = 0;
  const skipped: string[] = [];
  const started = Date.now();
  for (const id of surveys) {
    await inSurvey(id, async () => {
      // Small batches, stopping well before any request time limit.
      for (let i = 0; i < 6 && Date.now() - started < 20_000; i += 1) {
        const res = await runDueReminders(20);
        sent += res.sent;
        failed += res.failed;
        remaining += res.remaining;
        if (res.skipped && surveys.length === 1) skipped.push(res.skipped);
        if (res.skipped || (!res.sent && !res.failed) || !res.remaining) break;
      }
      const ret = await runRetention();
      purgedInvitees += ret.purgedInvitees;
      purgedResponses += ret.purgedResponses;
    });
  }
  return { sent, failed, remaining, skipped: skipped[0], surveys: surveys.length, purgedInvitees, purgedResponses };
}

const KEY = "scheduler_last_run";
const EVERY_MINUTES = 55;

/** Runs the scheduled work if nobody has in the last hour. Returns null when it was not due. */
export async function runScheduledIfDue(): Promise<ScheduledRun | null> {
  const sql = await getSql();
  const at = new Date().toISOString();
  await sql`insert into pulse_settings (key, value) values (${KEY}, ${JSON.stringify({ at: "1970-01-01T00:00:00Z" })}::jsonb) on conflict (key) do nothing`;
  const claimed = await sql<{ key: string }>`
    update pulse_settings set value = ${JSON.stringify({ at })}::jsonb
    where key = ${KEY} and (value->>'at')::timestamptz < now() - make_interval(mins => ${EVERY_MINUTES})
    returning key`;
  if (!claimed.length) return null;
  const result = await runScheduledWork();
  await sql`update pulse_settings set value = ${JSON.stringify({ at, result })}::jsonb where key = ${KEY}`;
  return result;
}
