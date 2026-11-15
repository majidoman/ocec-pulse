// Run against a dev server with the check on: node scripts/invite-captcha-check.cjs <mail.jsonl> <screenshot-dir>
// Invitation link → set password in one step, and the "I'm not a robot" check on sign-in / sign-up / reset.
const { chromium } = require("playwright");
const fs = require("fs");
const { solveChallenge } = require("altcha-lib");
const { deriveKey } = require("altcha-lib/algorithms/pbkdf2");
const base = "http://localhost:8080"; const MAIL = process.argv[2]; const shots = process.argv[3];
let failed = 0;
const R = Date.now().toString(36);
const ok = (c, l, x = "") => { if (!c) failed++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  → " + x : ""}`); };
const api = (page, fn, data) => page.evaluate(async ([fn, data]) => { const m = await import("/src/lib/pulse/api.ts"); try { return { ok: true, value: await m[fn](data === undefined ? undefined : { data }) }; } catch (e) { return { ok: false, error: String(e && e.message) }; } }, [fn, data]);
const mails = () => (fs.existsSync(MAIL) ? fs.readFileSync(MAIL, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
async function solved() {
  const c = await (await fetch(`${base}/api/captcha`)).json();
  const s = await solveChallenge({ challenge: c, deriveKey });
  return Buffer.from(JSON.stringify({ challenge: { parameters: c.parameters, signature: c.signature }, solution: s })).toString("base64");
}
const post = (path, body, headers = {}) => fetch(`${base}/api/auth${path}`, { method: "POST", headers: { "content-type": "application/json", origin: base, ...headers }, body: JSON.stringify(body) });
async function waitTick(p) {
  await p.locator("#password").focus();
  await p.waitForFunction(() => { const w = document.querySelector("altcha-widget"); const i = w && w.querySelector('input[name="captcha"]'); return !!(i && i.value); }, null, { timeout: 30000 });
}
(async () => {
  // 1. API without / with a fake check
  let r = await post("/sign-in/email", { email: "x@test.local", password: "whatever-123" });
  let j = await r.json().catch(() => ({}));
  ok(r.status === 400 && j.code === "CAPTCHA_REQUIRED", "sign-in without the check is refused", `${r.status} ${j.code}`);
  r = await post("/sign-in/email", { email: "x@test.local", password: "whatever-123" }, { "x-pulse-captcha": Buffer.from(JSON.stringify({ challenge: null, solution: null, test: true })).toString("base64") });
  ok(r.status === 400, "fake 'test' payload is refused", String(r.status));
  const one = await solved();
  const codes = [];
  for (let i = 0; i < 4; i++) { r = await post("/sign-in/email", { email: "nobody@test.local", password: "wrong-password-1" }, { "x-pulse-captcha": one }); codes.push(r.status); }
  ok(codes[0] === 401 && codes[2] === 401 && codes[3] === 400, "one solved check covers 3 tries, the 4th needs a new one", codes.join(","));

  const b = await chromium.launch();
  const admin = await (await b.newContext()).newPage();
  await admin.goto(`${base}/api/test-access?key=local-test-key-0123456789abcdef&as=super&next=/settings/users`, { waitUntil: "networkidle" });

  // 2. New person: link → choose password → results
  const inv = await api(admin, "inviteStaff", { email: `New.Viewer.${R}@test.local`, name: "Noor", role: "viewer", sendEmail: true });
  ok(inv.ok && inv.value.emailed, "invitation emailed", JSON.stringify(inv.value || inv.error).slice(0, 100));
  await admin.waitForTimeout(800);
  const m = mails().filter((x) => new RegExp(`new\\.viewer\\.${R}@test\\.local`, "i").test(x.to)).pop();
  ok(m && /choose a password to finish your account/.test(m.text) && /اختر كلمة مرور/.test(m.text), "email says: open the link and choose a password");
  const link = m && (m.text.match(/http:\/\/localhost:8080\/join\?code=[^\s]+/) || [])[0];
  const p = await (await b.newContext()).newPage();
  await p.goto(link, { waitUntil: "networkidle" });
  ok(await p.getByRole("heading", { name: "Finish your account" }).isVisible(), "link opens 'Finish your account' directly");
  ok((await p.locator("#email").inputValue()) === `new.viewer.${R}@test.local` && (await p.locator("#email").getAttribute("readonly")) !== null, "email filled in and locked");
  ok((await p.locator("#name").inputValue()) === "Noor", "name filled in from the invitation");
  ok((await p.locator("altcha-widget").count()) === 1, "'I'm not a robot' box shown");
  await p.locator("#password").fill("a-good-password-1"); await p.locator("#confirm").fill("a-good-password-1");
  await waitTick(p); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${shots}/join-new.png` });
  await p.getByRole("button", { name: "Create account and open results" }).click();
  await p.waitForURL("**/insights**", { timeout: 20000 }).catch(() => {});
  ok(p.url().includes("/insights"), "one click: account created, access active, results open", p.url());
  const me = await api(p, "getMe");
  ok(me.ok && me.value.role === "viewer", "has the viewer role", JSON.stringify(me.value && me.value.role));

  // 3. Mismatched passwords / no tick
  const inv2 = await api(admin, "inviteStaff", { email: `has.account.${R}@test.local`, role: "pc" });
  const link2 = `${base}/join?code=${encodeURIComponent(inv2.value.code)}`;
  const p2 = await (await b.newContext()).newPage();
  await p2.goto(link2, { waitUntil: "networkidle" });
  await p2.locator("#password").fill("a-good-password-1"); await p2.locator("#confirm").fill("different-password");
  await waitTick(p2);
  await p2.getByRole("button", { name: "Create account and open results" }).click();
  ok(await p2.getByText("The two passwords do not match.").waitFor({ timeout: 5000 }).then(() => true, () => false), "mismatched passwords caught");

  // 4. Sign-up gate: invitation cookie, different email
  r = await post("/sign-up/email", { email: "intruder@test.local", password: "a-good-password-1", name: "X" }, { "x-pulse-captcha": await solved(), cookie: `pulse_invite=${encodeURIComponent(inv2.value.code)}` });
  ok(r.status === 403, "invitation cannot create an account for another email", String(r.status));
  // Account exists but not yet activated
  r = await post("/sign-up/email", { email: `has.account.${R}@test.local`, password: "existing-pass-123", name: "Has Account" }, { "x-pulse-captcha": await solved(), cookie: `pulse_invite=${encodeURIComponent(inv2.value.code)}` });
  ok(r.status === 200, "invited email can create its account", String(r.status));
  const p3 = await (await b.newContext()).newPage();
  await p3.goto(link2, { waitUntil: "networkidle" });
  ok(await p3.getByRole("heading", { name: "Activate your access" }).isVisible(), "existing account: asks only for the password");
  ok((await p3.locator("#confirm").count()) === 0 && (await p3.getByRole("link", { name: "Forgot password?" }).isVisible()), "no repeat field, has 'Forgot password?'");
  await p3.locator("#password").fill("existing-pass-123");
  await waitTick(p3);
  await p3.getByRole("button", { name: "Sign in and activate" }).click();
  await p3.waitForURL("**/insights**", { timeout: 20000 }).catch(() => {});
  ok(p3.url().includes("/insights"), "signed in and activated", p3.url());

  // 5. Sign-in page
  const p4 = await (await b.newContext()).newPage();
  await p4.route("**/api/captcha", async (route) => { await new Promise((r) => setTimeout(r, 4000)); await route.continue(); });
  await p4.goto(`${base}/login`, { waitUntil: "networkidle" });
  await p4.locator("#email").fill(`new.viewer.${R}@test.local`); await p4.locator("#password").fill("a-good-password-1");
  let signInCalls = 0; p4.on("request", (rq) => { if (rq.url().includes("/api/auth/sign-in")) signInCalls++; });
  await p4.getByRole("button", { name: "Sign in", exact: true }).click();
  await p4.waitForTimeout(800);
  ok(signInCalls === 0 && p4.url().includes("/login"), "sign-in is held until the box is ticked", `calls=${signInCalls}`);
  await waitTick(p4);
  await p4.locator("#password").fill("wrong-password-9");
  await p4.getByRole("button", { name: "Sign in", exact: true }).click();
  await p4.getByText("The email or password is not right.").waitFor({ timeout: 8000 }).catch(() => {});
  ok(await p4.getByText("The email or password is not right.").isVisible(), "wrong password: plain message");
  await p4.locator("#password").fill("a-good-password-1");
  await p4.getByRole("button", { name: "Sign in", exact: true }).click();
  await p4.waitForURL("**/insights**", { timeout: 20000 }).catch(() => {});
  ok(p4.url().includes("/insights"), "right password signs in (same tick reused once)", p4.url());

  // 6. Forgot password
  const p5 = await (await b.newContext()).newPage();
  await p5.goto(`${base}/forgot-password`, { waitUntil: "networkidle" });
  await p5.locator("#email").fill(`new.viewer.${R}@test.local`);
  await p5.locator("#email").focus();
  await p5.waitForFunction(() => !!document.querySelector('altcha-widget input[name="captcha"]')?.value, null, { timeout: 30000 });
  await p5.getByRole("button", { name: "Send reset link" }).click();
  ok(await p5.getByRole("heading", { name: "Check your email" }).waitFor({ timeout: 8000 }).then(() => true, () => false), "forgot password works with the tick");

  // 7. Arabic
  const p6 = await (await b.newContext()).newPage();
  const inv3 = await api(admin, "inviteStaff", { email: `arabic.${R}@test.local`, role: "viewer" });
  await p6.goto(`${base}/join?code=${encodeURIComponent(inv3.value.code)}`, { waitUntil: "networkidle" });
  await p6.getByRole("button", { name: "العربية" }).first().click(); await p6.waitForTimeout(500);
  ok(await p6.getByRole("heading", { name: "أكمل إنشاء حسابك" }).isVisible(), "Arabic join page");
  await p6.locator("#password").fill("a-good-password-1"); await waitTick(p6);
  ok(await p6.getByText("تم التحقق").isVisible(), "Arabic check box ('تم التحقق')");
  await p6.waitForTimeout(1200);
  await p6.screenshot({ path: `${shots}/join-ar.png` });
  const p7 = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p7.goto(`${base}/login`, { waitUntil: "networkidle" }); await p7.locator("#email").fill("a@b.c"); await waitTick(p7); await p7.waitForTimeout(1200);
  await p7.screenshot({ path: `${shots}/login-phone.png` });
  await b.close();
  console.log(failed ? `${failed} FAILED` : "ALL PASS"); process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("CRASH", e.message); process.exit(1); });
