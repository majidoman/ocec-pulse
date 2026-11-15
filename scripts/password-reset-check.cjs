const { chromium } = require("playwright");
const fs = require("fs");
const { execSync } = require("child_process");
const base = "http://localhost:8080";
const MAIL = process.argv[2]; const shots = process.argv[3];
let failed = 0;
const ok = (c, l, x = "") => { if (!c) failed++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  → " + x : ""}`); };
const psql = (q) => execSync(`su postgres -c "psql -p 5433 -h 127.0.0.1 -d pulse -At"`, { input: q + ";\n" }).toString().trim();
const mails = () => (fs.existsSync(MAIL) ? fs.readFileSync(MAIL, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
async function trySignIn(page, email, pw) {
  await page.goto(base + "/login?next=%2Finsights", { waitUntil: "networkidle" });
  await page.locator("#email").fill(email); await page.locator("#password").fill(pw);
  await page.getByRole("button", { name: "Sign in" }).click();
  try { await page.waitForURL("**/insights**", { timeout: 8000 }); return true; } catch { return false; }
}
(async () => {
  const b = await chromium.launch();
  // Owner account
  const ctx0 = await b.newContext(); const p0 = await ctx0.newPage();
  await p0.goto(base + "/login?next=%2Finsights", { waitUntil: "networkidle" });
  await p0.getByText("First time here? Create an account").click();
  await p0.locator("#name").fill("Owner"); await p0.locator("#email").fill("owner@test.local"); await p0.locator("#password").fill("old-password-123");
  await p0.getByRole("button", { name: "Create account" }).click(); await p0.waitForURL("**/insights**");
  await p0.evaluate(async () => { const m = await import("/src/lib/pulse/api.ts"); await m.claimOwner({ data: {} }); });
  await ctx0.close();

  const page = await (await b.newContext()).newPage();
  await page.goto(base + "/login", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await page.waitForURL("**/forgot-password");
  ok(true, "'Forgot password?' link on the sign-in page");
  // Unknown email: same answer, no mail
  await page.locator("#email").fill("nobody@test.local"); await page.getByRole("button", { name: "Send reset link" }).click();
  await page.getByRole("heading", { name: "Check your email" }).waitFor({ timeout: 8000 }).catch(() => {});
  ok(await page.getByRole("heading", { name: "Check your email" }).isVisible(), "unknown email gets the same answer");
  await page.waitForTimeout(800);
  ok(mails().length === 0, "no email sent for an unknown address");
  // Real account
  await page.goto(base + "/forgot-password", { waitUntil: "networkidle" });
  await page.locator("#email").fill("Owner@Test.local"); await page.getByRole("button", { name: "Send reset link" }).click();
  await page.waitForTimeout(1500);
  const m = mails().find((x) => x.to.includes("owner@test.local"));
  ok(!!m, "reset email sent to the owner", m && m.subject);
  const link = m && (m.text.match(/http:\/\/localhost:8080\/reset-password\?token=[A-Za-z0-9_-]+/) || [])[0];
  ok(!!link && /العربية|كلمة المرور/.test(m.text), "email has the link and Arabic text");
  ok(psql("select count(*) from verification where identifier like 'pulse-reset:%'") === "1" && !psql("select identifier from verification").includes(link.split("token=")[1]), "only a hash of the link is stored");
  // Use the link
  await page.goto(link, { waitUntil: "networkidle" });
  await page.locator("#new-password").fill("short"); await page.locator("#repeat-password").fill("short");
  await page.getByRole("button", { name: "Save new password" }).click();
  ok(await page.locator("#new-password").evaluate((el) => el.validity.tooShort), "too-short password refused (browser check, 10 characters)");
  await page.locator("#new-password").fill("brand-new-password-9"); await page.locator("#repeat-password").fill("brand-new-password-9");
  await page.getByRole("button", { name: "Save new password" }).click();
  await page.waitForTimeout(1500);
  ok(await page.getByRole("heading", { name: "Password changed" }).isVisible(), "password changed");
  await page.screenshot({ path: `${shots}/reset-done.png` });
  ok(!(await trySignIn(await (await b.newContext()).newPage(), "owner@test.local", "old-password-123")), "old password no longer works");
  ok(await trySignIn(await (await b.newContext()).newPage(), "owner@test.local", "brand-new-password-9"), "new password works");
  // Link is single-use
  const again = await (await b.newContext()).newPage();
  await again.goto(link, { waitUntil: "networkidle" });
  await again.locator("#new-password").fill("another-password-99"); await again.locator("#repeat-password").fill("another-password-99");
  await again.getByRole("button", { name: "Save new password" }).click(); await again.waitForTimeout(1000);
  ok(await again.getByText(/not valid or has expired/).isVisible(), "the same link cannot be used twice");
  // Expired link
  await page.goto(base + "/forgot-password", { waitUntil: "networkidle" });
  await page.locator("#email").fill("owner@test.local"); await page.getByRole("button", { name: "Send reset link" }).click(); await page.waitForTimeout(1500);
  const link2 = (mails().filter((x) => x.to.includes("owner@test.local")).pop().text.match(/http:\/\/localhost:8080\/reset-password\?token=[A-Za-z0-9_-]+/) || [])[0];
  psql(`update verification set "expiresAt" = now() - interval '1 minute' where identifier like 'pulse-reset:%'`);
  await page.goto(link2, { waitUntil: "networkidle" });
  await page.locator("#new-password").fill("another-password-99"); await page.locator("#repeat-password").fill("another-password-99");
  await page.getByRole("button", { name: "Save new password" }).click(); await page.waitForTimeout(1000);
  ok(await page.getByText(/not valid or has expired/).isVisible(), "an expired link is refused");
  ok(psql("select count(*) from pulse_audit where action_en like 'Password changed with a reset link%'") === "1", "password change in the change history");
  // Per-account limit: 3 requests an hour
  for (let i = 0; i < 2; i++) { await page.goto(base + "/forgot-password", { waitUntil: "networkidle" }); await page.locator("#email").fill("owner@test.local"); await page.getByRole("button", { name: "Send reset link" }).click(); await page.waitForTimeout(800); }
  ok(await page.getByText(/Too many requests/).isVisible(), "fourth request in an hour is refused");
  // Arabic
  await page.goto(base + "/forgot-password", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "العربية" }).first().click(); await page.waitForTimeout(300);
  ok(await page.getByRole("heading", { name: "نسيت كلمة المرور؟" }).isVisible(), "Arabic page");
  await page.screenshot({ path: `${shots}/forgot-ar.png` });
  await b.close();
  console.log(failed ? `${failed} FAILED` : "ALL PASS");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("CRASH", e.message); process.exit(1); });
