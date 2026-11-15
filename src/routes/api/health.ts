import { createFileRoute } from "@tanstack/react-router";

/** For Docker / load balancers: 200 when the app and its database answer, 503 otherwise. No data returned. */
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const headers = { "Cache-Control": "no-store" };
        try {
          const { getSql } = await import("@/lib/db");
          const sql = await getSql();
          await sql`select 1 as ok`;
          return Response.json({ ok: true, db: "up" }, { headers });
        } catch {
          return Response.json({ ok: false, db: "down" }, { status: 503, headers });
        }
      },
    },
  },
});
