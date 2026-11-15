const { chromium } = require("playwright");
const { execSync } = require("child_process");
const base = "http://localhost:8080";
let failed = 0;
const ok = (c, l, x = "") => { if (!c) failed++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  → " + x : ""}`); };
const api = (page, fn, data) => page.evaluate(async ([fn, data]) => { const m = await import("/src/lib/pulse/api.ts"); try { return { ok: true, value: await m[fn]({ data }) }; } catch (e) { return { ok: false, error: String(e && e.message) }; } }, [fn, data]);
const psql = (q) => execSync(`su postgres -c "psql -p 5433 -h 127.0.0.1 -d pulse -Atc \\"${q}\\""`).toString().trim();
async function signIn(page, email) {
  await page.goto(base + "/login?next=%2Finsights", { waitUntil: "networkidle" });
  await page.locator("#email").fill(email); await page.locator("#password").fill("correct-horse-battery-9");
  await page.getByRole("button", { name: "Sign in" }).click(); await page.waitForURL("**/insights**", { timeout: 20000 }); await page.waitForLoadState("networkidle");
}
async function signUpWith(browser, code, email) {
  const ctx = await browser.newContext(); await ctx.addCookies([{ name: "pulse_invite", value: code, url: base }]);
  const p = await ctx.newPage();
  await p.goto(base + "/login?next=%2Finsights", { waitUntil: "networkidle" });
  await p.getByText("First time here? Create an account").click();
  await p.locator("#name").fill("T"); await p.locator("#email").fill(email); await p.locator("#password").fill("correct-horse-battery-9");
  await p.getByRole("button", { name: "Create account" }).click(); await p.waitForURL("**/insights**", { timeout: 20000 }); await p.waitForLoadState("networkidle");
  return p;
}
(async () => {
  const b = await chromium.launch();
  const owner = await (await b.newContext()).newPage();
  await signIn(owner, "owner@test.local");
  const A = (await api(owner, "inviteStaff", { email: "pc2@test.local", role: "pc" })).value.code;
  const B = (await api(owner, "inviteStaff", { email: "x@test.local", role: "viewer" })).value.code;
  const D = (await api(owner, "inviteStaff", { email: "z@test.local", role: "viewer" })).value.code;
  // SEC-002: another person's invitation cannot be used
  const x = await signUpWith(b, B, "x@test.local");
  let r = await api(x, "acceptInvite", { code: A });
  ok(!r.ok && /different email/.test(r.error), "someone else's (pc) invitation is refused", r.error);
  ok(psql(`select count(*) from pulse_staff_invites where code='${A}' and accepted_by is null`) === "1", "refused invitation stays unused");
  r = await api(x, "acceptInvite", { code: B });
  ok(r.ok && r.value.role === "viewer", "own invitation still works", JSON.stringify(r.value ?? r.error));
  // expired
  const z = await signUpWith(b, D, "z@test.local");
  psql(`update pulse_staff_invites set created_at = now() - interval '31 days' where code='${D}'`);
  r = await api(z, "acceptInvite", { code: D });
  ok(!r.ok && /expired/.test(r.error), "invitation older than 30 days is refused", r.error);
  // SEC-001: per-account limit (nonexistent account, so nobody is locked out)
  const anon = await (await b.newContext()).newPage();
  await anon.goto(base + "/login", { waitUntil: "networkidle" });
  const codes = await anon.evaluate(async () => {
    const out = [];
    for (let i = 0; i < 22; i++) {
      const res = await fetch("/api/auth/sign-in/email", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": `10.0.0.${i}` }, body: JSON.stringify({ email: "Nobody@Test.local", password: "wrong-password-" + i }) });
      out.push(res.status);
    }
    return out;
  });
  ok(codes.slice(0, 20).every((c) => c === 401) && codes[20] === 429 && codes[21] === 429, "21st guess on one account (from 21 addresses) is blocked", codes.join(","));
  // per-address limit
  const codes2 = await anon.evaluate(async () => {
    const out = [];
    for (let i = 0; i < 31; i++) {
      const res = await fetch("/api/auth/sign-in/email", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": "10.9.9.9" }, body: JSON.stringify({ email: `u${i}@test.local`, password: "wrong-password" }) });
      out.push(res.status);
    }
    return out;
  });
  ok(codes2.slice(0, 30).every((c) => c === 401) && codes2[30] === 429, "31st guess from one address is blocked", codes2.slice(-3).join(","));
  const body = await anon.evaluate(async () => (await fetch("/api/auth/sign-in/email", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": "10.9.9.9" }, body: JSON.stringify({ email: "u0@test.local", password: "x" }) })).text());
  ok(/Too many sign-in attempts/.test(body), "blocked attempt gets a plain message", body.slice(0, 80));
  // owner unaffected (different address bucket, own account)
  const o2 = await (await b.newContext()).newPage();
  await signIn(o2, "owner@test.local");
  ok(true, "the real owner can still sign in");
  await b.close();
  console.log(failed ? `${failed} FAILED` : "ALL PASS");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("CRASH", e.message); process.exit(1); });
