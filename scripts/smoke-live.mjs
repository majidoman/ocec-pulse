#!/usr/bin/env node
// Release smoke test: run right after every deploy.
//   node scripts/smoke-live.mjs https://estbanat.com
// Exits 1 if any check fails, so a broken release is caught before staff see it.
// Reads only public pages; sends no answers and signs in to nothing.

const base = (process.argv[2] || process.env.SMOKE_URL || "https://estbanat.com").replace(/\/+$/, "");

/** @type {{ name: string, path: string, expect: (r: Response, body: string) => string | null }[]} */
const checks = [
  {
    name: "Health: app, database and migrations",
    path: "/api/health",
    expect: (r, body) => {
      if (r.status !== 200) return `status ${r.status}: ${body.slice(0, 200)}`;
      const j = JSON.parse(body);
      return j.ok && j.db === "up" && j.migrations === "up to date" ? null : `unexpected ${body}`;
    },
  },
  { name: "Home page", path: "/", expect: (r, b) => (r.status === 200 && /<html/i.test(b) ? null : `status ${r.status}`) },
  { name: "Survey page", path: "/survey", expect: (r) => (r.status === 200 ? null : `status ${r.status}`) },
  { name: "Sign-in page", path: "/login", expect: (r) => (r.status === 200 ? null : `status ${r.status}`) },
  {
    name: "Reminder job is protected",
    path: "/api/cron/reminders",
    expect: (r) => (r.status === 403 ? null : `expected 403 without a key, got ${r.status}`),
  },
  {
    name: "Security headers",
    path: "/",
    expect: (r) => {
      const missing = ["x-frame-options", "content-security-policy", "x-content-type-options", "referrer-policy"].filter(
        (h) => !r.headers.get(h),
      );
      return missing.length ? `missing ${missing.join(", ")}` : null;
    },
  },
];

let failed = 0;
for (const c of checks) {
  try {
    const r = await fetch(base + c.path, { redirect: "follow", signal: AbortSignal.timeout(20_000) });
    const body = await r.text();
    const problem = c.expect(r, body);
    console.log(`${problem ? "FAIL" : "ok  "}  ${c.name}${problem ? ` — ${problem}` : ""}`);
    if (problem) failed += 1;
  } catch (err) {
    console.log(`FAIL  ${c.name} — ${err instanceof Error ? err.message : err}`);
    failed += 1;
  }
}
console.log(failed ? `\n${failed} check(s) failed on ${base}` : `\nAll ${checks.length} checks passed on ${base}`);
process.exit(failed ? 1 : 0);
