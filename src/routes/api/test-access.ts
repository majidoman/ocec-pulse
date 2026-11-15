import { createFileRoute } from "@tanstack/react-router";

/**
 * Password-free sign-in for the TEST environment only.
 *
 *   /api/test-access?key=<TEST_ACCESS_KEY>&as=super|pc|exec|head|viewer[&dept=<department id>]
 *
 * Signs the visitor in as a dedicated test account for that role (created on first use) and opens
 * the insights room. Switched off unless TEST_ACCESS_KEY is set, and always off on production
 * (VERCEL_ENV=production), so the live site can never be entered this way. Every use is audited.
 */
const ROLES = ["super", "pc", "exec", "head", "viewer"] as const;
type Role = (typeof ROLES)[number];

const notFound = () => new Response("Not found", { status: 404 });

async function handle(request: Request): Promise<Response> {
  const configuredKey = process.env.TEST_ACCESS_KEY?.trim() ?? "";
  if (configuredKey.length < 24 || process.env.VERCEL_ENV === "production") return notFound();

  const url = new URL(request.url);
  const { createHash, createHmac, timingSafeEqual } = await import("node:crypto");
  const digest = (v: string) => createHash("sha256").update(v).digest();
  if (!timingSafeEqual(digest(url.searchParams.get("key") ?? ""), digest(configuredKey))) return notFound();

  const core = await import("@/lib/pulse/core.server");
  try {
    await core.rateLimit("test-access", 30);
  } catch {
    return new Response("Too many attempts. Wait a few minutes.", { status: 429 });
  }

  const asParam = url.searchParams.get("as") ?? "super";
  const role: Role = (ROLES as readonly string[]).includes(asParam) ? (asParam as Role) : "super";
  const config = await core.loadConfig();
  const deptParam = url.searchParams.get("dept");
  const departmentId =
    role === "head"
      ? (config.departments.find((d) => d.id === deptParam && !d.archived)?.id ?? config.departments.find((d) => !d.archived)?.id ?? null)
      : null;

  const email = `tester-${role}@test-access.local`;
  const name = `Test ${role}`;
  // Never typed by anyone: derived from the server secret, so it cannot be guessed or reused elsewhere.
  const password = createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? configuredKey).update(`test-access:${role}`).digest("hex").slice(0, 40);

  const { auth } = await import("@/lib/auth/server");
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();

  let users = await sql<{ id: string }>`select id from "user" where email = ${email}`;
  if (!users.length) {
    await auth.api.signUpEmail({ body: { email, password, name } });
    users = await sql<{ id: string }>`select id from "user" where email = ${email}`;
  }
  const userId = users[0]?.id;
  if (!userId) return new Response("Could not create the test account.", { status: 500 });

  await sql`
    insert into pulse_staff (user_id, email, name, role, department_id, active)
    values (${userId}, ${email}, ${name}, ${role}, ${departmentId}, true)
    on conflict (user_id) do update set role = excluded.role, department_id = excluded.department_id, active = true
  `;

  const signedIn = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
  if (!signedIn.ok) return new Response("Test sign-in failed.", { status: 500 });

  await core.audit(email, `Test access used as ${role}${departmentId ? ` (${departmentId})` : ""}`, `دخول اختباري بصفة ${role}`);

  const next = url.searchParams.get("next");
  const headers = new Headers({ Location: next && next.startsWith("/") && !next.startsWith("//") ? next : "/insights", "Cache-Control": "no-store" });
  for (const cookie of signedIn.headers.getSetCookie()) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

export const Route = createFileRoute("/api/test-access")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
    },
  },
});
