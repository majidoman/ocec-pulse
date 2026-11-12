import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduler endpoint. Any external scheduler (or uptime monitor) can call
 *   GET /api/cron/reminders?key=<key shown in Settings → Reminders>
 * once or twice a day to send due reminders and run data-retention housekeeping.
 * The key is a random secret stored in the database; without it the call is refused.
 */
export const Route = createFileRoute("/api/cron/reminders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const mail = await import("@/lib/pulse/mail.server");
        const key = new URL(request.url).searchParams.get("key") ?? "";
        const expected = await mail.cronKey();
        // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" when that variable is set.
        const cronSecret = process.env.CRON_SECRET?.trim();
        const bearer = request.headers.get("authorization") ?? "";
        const viaVercel = Boolean(cronSecret) && bearer === `Bearer ${cronSecret}`;
        if (!viaVercel && (!key || key !== expected)) {
          return new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
            status: 403,
            headers: { "content-type": "application/json" },
          });
        }
        let sent = 0;
        let failed = 0;
        let remaining = 0;
        let skipped: string | undefined;
        const started = Date.now();
        // Work in small batches, stopping well before a serverless time limit.
        for (let i = 0; i < 6 && Date.now() - started < 20_000; i += 1) {
          const res = await mail.runDueReminders(20);
          sent += res.sent;
          failed += res.failed;
          remaining = res.remaining;
          skipped = res.skipped;
          if (res.skipped || (!res.sent && !res.failed) || !res.remaining) break;
        }
        const retention = await mail.runRetention();
        return new Response(JSON.stringify({ ok: true, sent, failed, remaining, skipped, ...retention }), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      },
    },
  },
});
