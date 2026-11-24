import { createFileRoute } from "@tanstack/react-router";

/** Migration files bundled with this build (names only; the SQL is not loaded). */
const BUNDLED_MIGRATIONS = Object.keys(import.meta.glob("/migrations/*.sql"))
  .map((p) => p.split("/").pop() ?? p)
  .sort();

/**
 * For uptime monitors and the release smoke test. 200 when the app, its database and the
 * database structure all match this build; 503 otherwise. Returns no survey data.
 * `pending` lists migration files this build expects but the database has not applied.
 * Each call also runs due reminders and data clean-up, at most once an hour (scheduler.server.ts).
 */
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const headers = { "Cache-Control": "no-store" };
        try {
          const { getSql } = await import("@/lib/db");
          const sql = await getSql();
          await sql`select 1 as ok`;
          let pending: string[] = [];
          try {
            const rows = await sql<{ name: string }>`select name from _migrations`;
            const applied = new Set(rows.map((r) => r.name));
            pending = BUNDLED_MIGRATIONS.filter((m) => !applied.has(m));
          } catch {
            pending = BUNDLED_MIGRATIONS;
          }
          const ok = pending.length === 0;
          // Reminders and clean-up ride on this public ping: at most once an hour, no secret needed.
          if (ok) {
            void import("@/lib/pulse/scheduler.server")
              .then((m) => m.runScheduledIfDue())
              .catch((err) => console.error("[scheduler]", err instanceof Error ? err.message : err));
          }
          return Response.json(
            { ok, db: "up", migrations: ok ? "up to date" : "pending", ...(ok ? {} : { pending }) },
            { status: ok ? 200 : 503, headers },
          );
        } catch {
          return Response.json({ ok: false, db: "down" }, { status: 503, headers });
        }
      },
    },
  },
});
