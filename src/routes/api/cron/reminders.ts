import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduler endpoint. Any external scheduler (or uptime monitor) can call
 *   GET /api/cron/reminders?key=<key shown in Settings → Reminders>
 * once or twice a day to send due reminders and run data-retention housekeeping.
 * Not needed when something calls /api/health regularly: that runs the same work hourly.
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
        const { runScheduledWork } = await import("@/lib/pulse/scheduler.server");
        const run = await runScheduledWork();
        return new Response(JSON.stringify({ ok: true, ...run }), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      },
    },
  },
});
