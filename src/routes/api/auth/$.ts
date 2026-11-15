import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

/**
 * Self sign-up is open only until an owner exists. After that, a new account can be created only by someone
 * holding a valid staff invitation (the /join page stores the code in a short-lived cookie).
 */
async function signUpAllowed(request: Request): Promise<boolean> {
  const { staffCount } = await import("@/lib/pulse/core.server");
  if ((await staffCount()) === 0) return true;
  // The account must be created with the exact email the invitation was sent to.
  const body = (await request.clone().json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return false;
  const match = /(?:^|;\s*)pulse_invite=([^;]+)/.exec(request.headers.get("cookie") ?? "");
  if (!match) return false;
  const code = decodeURIComponent(match[1]);
  if (code.length < 8 || code.length > 200) return false;
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ ok: number }>`
    select 1 as ok from pulse_staff_invites
    where code = ${code} and accepted_by is null and created_at > now() - interval '30 days'
      and lower(trim(email)) = ${email}
  `;
  return rows.length > 0;
}

/**
 * Password guessing is limited in the database, so the limit holds across serverless instances
 * (Better Auth's own limiter keeps counts in each instance's memory): 30 attempts per hour from one
 * address, and 20 per hour against one account from anywhere.
 */
async function signInThrottled(request: Request): Promise<boolean> {
  const { rateLimit, RateLimitedError } = await import("@/lib/pulse/core.server");
  try {
    await rateLimit("sign-in", 30);
    const body = (await request.clone().json().catch(() => null)) as { email?: unknown } | null;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
    if (email) await rateLimit(`sign-in:${email}`, 20, { perAddress: false });
    return false;
  } catch (e) {
    if (e instanceof RateLimitedError) return true;
    throw e;
  }
}

/** Sign-in and account creation need a solved "I'm not a robot" check (see captcha.server). */
async function captchaPassed(request: Request): Promise<boolean> {
  const { verifyCaptcha, CAPTCHA_HEADER } = await import("@/lib/pulse/captcha.server");
  return verifyCaptcha(request.headers.get(CAPTCHA_HEADER));
}

async function guarded(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname;
  const protectedPath = path.endsWith("/sign-in/email") || path.endsWith("/sign-up/email");
  if (request.method === "POST" && protectedPath && !(await captchaPassed(request))) {
    return Response.json(
      { message: "Tick the “I'm not a robot” box, then try again.", code: "CAPTCHA_REQUIRED" },
      { status: 400 },
    );
  }
  if (request.method === "POST" && path.endsWith("/sign-in/email") && (await signInThrottled(request))) {
    return Response.json(
      { message: "Too many sign-in attempts. Wait an hour, then try again.", code: "TOO_MANY_ATTEMPTS" },
      { status: 429 },
    );
  }
  if (request.method === "POST" && path.endsWith("/sign-up/email")) {
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
