import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/attachment?id=<id> — download one attached file. Signed-in staff who may read comments only
 * (department heads: their own department, once it has enough files to stay anonymous).
 * Always sent as a download, never shown inline, so a file cannot run in the app's pages.
 */
export const Route = createFileRoute("/api/attachment")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const deny = (status: number) => new Response(status === 401 ? "Sign in first." : "Not allowed.", { status, headers: { "cache-control": "no-store" } });
        const { requireUserId } = await import("@/lib/auth/verify.server");
        const core = await import("@/lib/pulse/core.server");
        const { canReadComments } = await import("@/lib/pulse/config");
        const { getSql } = await import("@/lib/db");
        let userId: string;
        try {
          userId = await requireUserId();
        } catch {
          return deny(401);
        }
        let staff;
        try {
          staff = await core.requireStaff(userId);
        } catch {
          return deny(403);
        }
        if (!canReadComments(staff.role)) return deny(403);
        const id = new URL(request.url).searchParams.get("id") ?? "";
        if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return deny(404);
        const sql = await getSql();
        const rows = await sql<{ filename: string; mime: string; b64: string; department_id: string | null; survey_id: string }>`
          select filename, mime, encode(data, 'base64') as b64, department_id, survey_id from pulse_attachments where id = ${id} and submitted = true`;
        const f = rows[0];
        if (!f) return deny(404);
        if (staff.role === "head") {
          const config = await core.loadConfig(f.survey_id);
          const k = Math.max(2, Number(config.anonymity.kFloor) || 5);
          const n = await sql<{ n: number }>`
            select count(*) as n from pulse_attachments where survey_id = ${f.survey_id} and submitted = true and department_id = ${f.department_id}`;
          if (!f.department_id || f.department_id !== staff.departmentId || Number(n[0]?.n ?? 0) < k) return deny(403);
        }
        const body = Buffer.from(f.b64, "base64");
        const ascii = f.filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
        return new Response(body, {
          headers: {
            "content-type": "application/octet-stream",
            "content-disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(f.filename)}`,
            "content-length": String(body.length),
            "x-content-type-options": "nosniff",
            "cache-control": "private, no-store",
          },
        });
      },
    },
  },
});
