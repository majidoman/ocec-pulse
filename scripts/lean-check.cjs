// Release 1.7.0 checks. Run against a local dev server:
//   TEST_ACCESS_KEY=local-test-key-0123456789abcdef PULSE_CAPTCHA=off npm run dev
//   node scripts/lean-check.cjs <screenshot-dir>
// Shared link off by default, QR hidden, privacy notice follows k, drop-off counts, monitor page.
const { chromium } = require("playwright");
const base = "http://localhost:8080";
const shots = process.argv[2] || "/tmp";
let failed = 0;
const ok = (c, l, x = "") => {
  if (!c) failed++;
  console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  → " + x : ""}`);
};
const api = (page, fn, data) =>
  page.evaluate(
    async ([fn, data]) => {
      const m = await import("/src/lib/pulse/api.ts");
      try {
        return { ok: true, value: await m[fn](data === undefined ? undefined : { data }) };
      } catch (e) {
        return { ok: false, error: String(e && e.message) };
      }
    },
    [fn, data],
  );

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const admin = await ctx.newPage();
  await admin.goto(`${base}/api/test-access?key=local-test-key-0123456789abcdef&as=super&next=/insights/invitations`, { waitUntil: "networkidle" });
  let cfg = (await api(admin, "getAdminConfig")).value;
  ok(cfg && cfg.general.allowOpenLink === false, "shared link is off by default", String(cfg && cfg.general.allowOpenLink));

  await admin.getByText("Shared link and QR code: off").waitFor({ timeout: 15000 }).catch(() => {});
  ok(await admin.getByText("Shared link and QR code: off").isVisible(), "invitations page says the shared link is off");
  ok((await admin.getByRole("button", { name: "Print poster" }).count()) === 0, "no QR poster to print while off");

  // Open the survey, k = 3, deletion days 0 (to see the warning)
  cfg.general.status = "open";
  cfg.calendar.fieldOpen = "2026-01-01";
  cfg.calendar.fieldClose = "2026-12-31";
  cfg.anonymity.kFloor = 3;
  cfg.anonymity.inviteDeleteDays = 0;
  let r = await api(admin, "saveAdminConfig", { config: cfg });
  ok(r.ok, "survey opened", r.error);

  // Without a personal link the survey refuses
  const anon = await (await b.newContext()).newPage();
  await anon.goto(`${base}/survey`, { waitUntil: "networkidle" });
  await anon.getByText("This survey is answered through the link in your invitation email.").waitFor({ timeout: 15000 }).catch(() => {});
  ok(await anon.getByText("This survey is answered through the link in your invitation email.").isVisible(), "plain link refused while shared link is off");
  const sub = await api(anon, "submitResponse", { lang: "en", answers: {} });
  ok(sub.ok && sub.value.ok === false && sub.value.reason === "token_required", "server refuses an answer without a personal link", JSON.stringify(sub.value || sub.error));

  // Anonymity page: deletion warning, placeholder hint
  await admin.goto(`${base}/settings/anonymity`, { waitUntil: "networkidle" });
  await admin.getByText("kept forever").waitFor({ timeout: 15000 }).catch(() => {});
  ok(await admin.getByText(/currently kept forever/).isVisible(), "warning when invitation list is never deleted");
  ok(await admin.getByText(/Write \{\{k\}\} where/).isVisible(), "privacy notice explains {{k}}");
  await admin.screenshot({ path: `${shots}/anonymity.png`, fullPage: true });

  // Switch the shared link on to take the survey anonymously and count pages
  cfg = (await api(admin, "getAdminConfig")).value;
  cfg.general.allowOpenLink = true;
  r = await api(admin, "saveAdminConfig", { config: cfg });
  ok(r.ok, "shared link switched on for the count test", r.error);

  const emp = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await emp.goto(`${base}/survey`, { waitUntil: "networkidle" });
  const notice = await emp.locator("details p").first().textContent();
  ok(/groups smaller than 3 people/.test(notice || ""), "privacy notice shows the real floor (3)", notice);
  ok(!(await emp.getByText("{{k}}").count()), "no raw {{k}} shown to staff");
  const home = await (await b.newContext()).newPage();
  await home.goto(`${base}/`, { waitUntil: "networkidle" });
  ok(await home.getByText("Department cuts only when 3 or more people have spoken.").isVisible(), "landing page states the real floor (3), not five");
  await emp.getByRole("button", { name: "Start the survey" }).click();
  for (let page = 0; page < 3; page++) {
    const groups = emp.getByRole("radiogroup");
    const n = await groups.count();
    for (let k = 0; k < n; k++) {
      const radios = groups.nth(k).getByRole("radio");
      const c = await radios.count();
      if (c) await radios.nth(c === 11 ? 8 : 3).click();
    }
    await emp.getByRole("button", { name: "Next", exact: true }).click();
  }
  await emp.waitForTimeout(800);
  // Reloading must not count the same pages again
  await emp.reload({ waitUntil: "networkidle" });
  await emp.waitForTimeout(800);

  await admin.goto(`${base}/insights/monitor`, { waitUntil: "networkidle" });
  await admin.getByRole("heading", { name: "Where people stop" }).waitFor({ timeout: 15000 }).catch(() => {});
  const mon = (await api(admin, "getMonitor")).value;
  ok(mon && mon.steps.length >= 3, "drop-off counts recorded for each page reached", JSON.stringify(mon && mon.steps));
  ok(mon && mon.steps.every((s) => s.n === 1), "each page counted once per browser, even after reload", JSON.stringify(mon && mon.steps));
  ok(mon && mon.daily.length === 0, "daily chart hidden below k answers");
  ok(await admin.getByRole("heading", { name: "Where people stop" }).isVisible(), "monitor page shows the drop-off chart");
  ok(await admin.getByText("Response monitor").first().isVisible(), "Response monitor in the menu");
  await admin.screenshot({ path: `${shots}/monitor.png`, fullPage: true });

  // Viewer cannot read the monitor
  const viewer = await (await b.newContext()).newPage();
  await viewer.goto(`${base}/api/test-access?key=local-test-key-0123456789abcdef&as=viewer&next=/insights`, { waitUntil: "networkidle" });
  const vm = await api(viewer, "getMonitor");
  ok(!vm.ok, "a viewer cannot load the monitor data", vm.error);
  ok((await viewer.getByText("Response monitor").count()) === 0, "monitor not in a viewer's menu");

  // Health reports migrations
  const h = await (await fetch(`${base}/api/health`)).json();
  ok(h.ok && h.migrations === "up to date", "health check includes migrations", JSON.stringify(h));

  await b.close();
  console.log(failed ? `\n${failed} FAILED` : "\nALL PASS");
  process.exit(failed ? 1 : 0);
})();
