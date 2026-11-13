import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

/**
 * Self sign-up is open only until an owner exists. After that, a new account can be created only by someone
 * holding a valid staff invitation (the /join page stores the code in a short-lived cookie).
 */
async function signUpAllowed(request: Request): Promise<boolean> {
  const { staffCount } = await import("@/lib/pulse/core.server");
  if ((await staffCount()) === 0) return true;
  const match = /(?:^|;\s*)pulse_invite=([^;]+)/.exec(request.headers.get("cookie") ?? "");
  if (!match) return false;
  const code = decodeURIComponent(match[1]);
  if (code.length < 8 || code.length > 200) return false;
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ ok: number }>`
    select 1 as ok from pulse_staff_invites
    where code = ${code} and accepted_by is null and created_at > now() - interval '30 days'
  `;
  return rows.length > 0;
}

async function guarded(request: Request): Promise<Response> {
  if (request.method === "POST" && new URL(request.url).pathname.endsWith("/sign-up/email")) {
    let allowed = false;
    try {
      allowed = await signUpAllowed(request);
    } catch {
      allowed = false;
    }
    if (!allowed) {
      return Response.json(
        { message: "Accounts are by invitation only. Ask your administrator for an invitation link.", code: "INVITE_ONLY" },
        { status: 403 },
      );
    }
  }
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => guarded(request),
    },
  },
});
