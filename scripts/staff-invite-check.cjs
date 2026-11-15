const { chromium } = require("playwright");
const fs = require("fs");
const base = "http://localhost:8080"; const MAIL = process.argv[2]; const shots = process.argv[3];
let failed = 0;
const ok = (c, l, x = "") => { if (!c) failed++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  → " + x : ""}`); };
const api = (page, fn, data) => page.evaluate(async ([fn, data]) => { const m = await import("/src/lib/pulse/api.ts"); try { return { ok: true, value: await m[fn](data === undefined ? undefined : { data }) }; } catch (e) { return { ok: false, error: String(e && e.message) }; } }, [fn, data]);
const mails = () => (fs.existsSync(MAIL) ? fs.readFileSync(MAIL, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
(async () => {
  const b = await chromium.launch();
  const admin = await (await b.newContext()).newPage();
  await admin.goto(`${base}/api/test-access?key=local-test-key-0123456789abcdef&as=super&next=/settings/users`, { waitUntil: "networkidle" });
  const inv = await api(admin, "inviteStaff", { email: "Third.Person@test.local", role: "viewer", sendEmail: true });
  ok(inv.ok && inv.value.emailed, "staff invitation emailed", JSON.stringify(inv.value || inv.error).slice(0, 120));
  await admin.waitForTimeout(1000);
  const m = mails().filter((x) => /third\.person@test\.local/i.test(x.to)).pop();
  const link = m && (m.text.match(/http:\/\/localhost:8080\/join\?code=[^\s]+/) || [])[0];
  ok(!!link, "email contains the join link");
  // New person, no account
  const p = await (await b.newContext()).newPage();
  await p.goto(link, { waitUntil: "networkidle" });
  ok(await p.getByText(/This invitation is for third\.person@test\.local \(/).isVisible(), "join page names the invited email and role");
  await p.screenshot({ path: `${shots}/join.png` });
  await p.getByRole("link", { name: "Create my account" }).click();
  await p.waitForURL("**/login**");
  await p.getByRole("heading", { name: "Create an account" }).waitFor({ timeout: 8000 }).catch(() => {});
  ok(await p.getByRole("heading", { name: "Create an account" }).isVisible(), "opens straight in 'Create an account'");
  ok((await p.locator("#email").inputValue()) === "third.person@test.local", "email already filled in");
  await p.locator("#name").fill("New Person"); await p.locator("#password").fill("a-good-password-1");
  await p.getByRole("button", { name: "Create account" }).click();
  await p.waitForURL("**/join**", { timeout: 15000 });
  await p.getByRole("button", { name: "Activate my access" }).click();
  await p.waitForURL("**/insights**", { timeout: 15000 });
  ok(true, "account created, access activated, results open");
  const me = await api(p, "getMe");
  ok(me.ok && me.value.role === "viewer", "new person has the viewer role", JSON.stringify(me.value && me.value.role));
  // Same link again
  const p2 = await (await b.newContext()).newPage();
  await p2.goto(link, { waitUntil: "networkidle" });
  ok(await p2.getByText(/already been used/).isVisible(), "used link says so");
  // Signed in as someone else
  const inv2 = await api(admin, "inviteStaff", { email: "fourth@test.local", role: "pc" });
  const link2 = `${base}/join?code=${encodeURIComponent(inv2.value.code)}`;
  await admin.goto(link2, { waitUntil: "networkidle" });
  ok(await admin.getByText(/This invitation is for fourth@test\.local, but you are signed in as/).isVisible(), "wrong account is explained, with sign out");
  ok((await admin.getByRole("button", { name: "Activate my access" }).count()) === 0, "no activate button for the wrong account");
  // Arabic
  const p3 = await (await b.newContext()).newPage();
  await p3.goto(link2, { waitUntil: "networkidle" });
  await p3.getByRole("button", { name: "العربية" }).first().click(); await p3.waitForTimeout(300);
  ok(await p3.getByRole("link", { name: "إنشاء حسابي" }).isVisible(), "Arabic join page");
  await p3.screenshot({ path: `${shots}/join-ar.png` });
  await b.close();
  console.log(failed ? `${failed} FAILED` : "ALL PASS"); process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("CRASH", e.message); process.exit(1); });
