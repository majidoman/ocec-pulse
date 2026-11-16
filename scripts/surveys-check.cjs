// Run against a local dev server (PULSE_CAPTCHA=off): node scripts/surveys-check.cjs <screenshot-dir>
// Several surveys: demo survey as a finished past survey, new surveys, separation of data, public link, deletion.
const { chromium } = require("playwright");
const base = "http://localhost:8080"; const shots = process.argv[2];
let failed = 0;
const ok = (c, l, x = "") => { if (!c) failed++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  → " + x : ""}`); };
const api = (page, fn, data) => page.evaluate(async ([fn, data]) => { const m = await import("/src/lib/pulse/api.ts"); try { return { ok: true, value: await m[fn](data === undefined ? undefined : { data }) }; } catch (e) { return { ok: false, error: String(e && e.message) }; } }, [fn, data]);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const admin = await ctx.newPage();
  await admin.goto(`${base}/api/test-access?key=local-test-key-0123456789abcdef&as=super&next=/settings/surveys`, { waitUntil: "networkidle" });
  await admin.getByRole("heading", { name: "Surveys", exact: true }).waitFor({ timeout: 15000 });
  let L = (await api(admin, "listSurveys")).value;
  ok(L.surveys.length === 1 && L.current === "main", "starts with one survey", JSON.stringify(L.surveys.map((s) => s.id)));
  // main survey: give it a department and invitee so we can check separation
  let cfg = (await api(admin, "getAdminConfig")).value;
  cfg.departments = [{ id: "ops", name: { en: "Operations", ar: "العمليات" }, headcount: 40 }, { id: "events", name: { en: "Events", ar: "الفعاليات" }, headcount: 30 }, { id: "fnb", name: { en: "Food & beverage", ar: "الأغذية" }, headcount: 35 }];
  await api(admin, "saveAdminConfig", { config: cfg });
  let r = await api(admin, "uploadRoster", { rows: [{ email: "same.person@test.local", departmentId: "ops" }] });
  ok(r.ok && r.value.added === 1, "main survey: one invitee added", JSON.stringify(r.value || r.error).slice(0, 80));

  // Demo survey
  const t0 = Date.now();
  await admin.getByRole("button", { name: "Load the demo survey" }).click();
  await admin.waitForURL("**/insights**", { timeout: 90000 });
  ok(true, `demo survey created and results opened (${Math.round((Date.now() - t0) / 1000)} s)`);
  await admin.getByText("Demo survey: sample answers, not real people").waitFor({ timeout: 15000 });
  ok(true, "demo banner shown on staff pages");
  L = (await api(admin, "listSurveys")).value;
  const demo = L.surveys.find((s) => s.isDemo);
  ok(demo && L.current === demo.id && demo.status === "closed" && demo.responses > 50, "demo is a closed past survey with sample answers", demo && `${demo.responses} answers`);
  const res = (await api(admin, "getResults")).value;
  ok(res.total === demo.responses && res.enough && res.engagement !== null, "demo results computed", `engagement ${res.engagement && JSON.stringify(res.engagement).slice(0, 40)}`);
  ok(res.departments.filter((d) => d.index !== null).length === 3, "results by department", String(res.departments.filter((d) => d.index !== null).length));
  ok(Array.isArray(res.comments) && res.comments.length > 5, "comments present", String(res.comments && res.comments.length));
  const inv = (await api(admin, "getInvitationOverview")).value;
  ok(inv.stats.total >= 100 && inv.stats.completed === demo.responses && inv.campaigns.length === 1, "invitation list, completion and sending history present", `${inv.stats.total} invited, ${inv.stats.completed} completed`);
  cfg = (await api(admin, "getAdminConfig")).value;
  ok(cfg.actions.length === 3 && cfg.instrumentStatus === "frozen", "action plans and locked questionnaire in the demo");
  await admin.screenshot({ path: `${shots}/demo-insights.png` });
  for (const path of ["/insights/departments", "/insights/heatmap", "/insights/drivers", "/insights/invitations", "/insights/reminders", "/insights/actions", "/insights/reports"]) {
    const resp = await admin.goto(base + path, { waitUntil: "networkidle" });
    ok(resp.status() === 200 && !(await admin.getByText("Something went wrong").count()), `demo page works: ${path}`);
  }
  await admin.goto(base + "/insights/departments", { waitUntil: "networkidle" });
  await admin.screenshot({ path: `${shots}/demo-departments.png` });
  // employees can't reach the demo
  const anon = await (await b.newContext()).newPage();
  await anon.goto(base + "/", { waitUntil: "networkidle" });
  let pub = (await api(anon, "getPublic")).value;
  ok(pub.surveyId === "main", "plain link still opens the main survey");
  r = await api(admin, "setPublicSurvey", { id: demo.id });
  ok(!r.ok && /demo/i.test(r.error), "demo cannot become the employee survey");
  r = await api(anon, "submitResponse", { survey: demo.id, lang: "en", answers: { x: 3 } });
  ok(r.ok && !r.value.ok && r.value.reason === "closed", "nobody can answer the demo", JSON.stringify(r.value));

  // New survey from the switcher
  await admin.goto(base + "/settings/surveys?new=true", { waitUntil: "networkidle" });
  await admin.locator("#ns-en").fill("Pulse check Q1 2027"); await admin.locator("#ns-ar").fill("نبض الربع الأول ٢٠٢٧");
  await admin.getByRole("button", { name: "Create and open the builder" }).click();
  await admin.waitForURL("**/settings/builder", { timeout: 20000 });
  L = (await api(admin, "listSurveys")).value;
  const q1 = L.surveys.find((s) => s.name.en === "Pulse check Q1 2027");
  ok(q1 && L.current === q1.id && q1.status === "draft" && q1.responses === 0, "new survey created as a draft and selected");
  ok(await admin.locator("header select").first().inputValue() === q1.id, "top-bar drop-down shows it");
  ok((await admin.locator("main select, [class*=max-w-6xl] select").count()) >= 1, "builder has the survey drop-down too");
  await admin.screenshot({ path: `${shots}/builder-switcher.png` });
  // edit its questions + open it; main must not change
  cfg = (await api(admin, "getAdminConfig")).value;
  const mainBefore = await (async () => { await api(admin, "selectSurvey", { id: "main" }); const c = (await api(admin, "getAdminConfig")).value; await api(admin, "selectSurvey", { id: q1.id }); return c; })();
  cfg.questions = cfg.questions.map((q, i) => (i === 0 ? { ...q, text: { en: "Q1-ONLY question", ar: "سؤال الربع الأول" } } : q));
  cfg.general.status = "open"; cfg.general.allowOpenLink = true; cfg.calendar.fieldOpen = "2026-01-01"; cfg.calendar.fieldClose = "2027-12-31";
  cfg.general.orgName = { en: "Shared Org Name", ar: "اسم الجهة المشترك" };
  r = await api(admin, "saveAdminConfig", { config: cfg });
  ok(r.ok, "new survey saved and opened", r.error);
  await api(admin, "selectSurvey", { id: "main" });
  const mainAfter = (await api(admin, "getAdminConfig")).value;
  ok(mainAfter.questions[0].text.en === mainBefore.questions[0].text.en && mainAfter.general.status === mainBefore.general.status, "main survey's questions and status unchanged");
  ok(mainAfter.general.orgName.en === "Shared Org Name", "organisation name is shared across surveys");
  await api(admin, "selectSurvey", { id: q1.id });
  // same person invited to both surveys
  r = await api(admin, "uploadRoster", { rows: [{ email: "same.person@test.local", departmentId: "ops" }] });
  ok(r.ok && r.value.added === 1, "same email can be invited to a second survey", JSON.stringify(r.value || r.error).slice(0, 80));
  // employee answers the new survey through its ?s= link
  const o = (await api(admin, "getInvitationOverview")).value;
  ok(/\/survey\?s=/.test(o.surveyUrl), "its open link/QR carries ?s=", o.surveyUrl);
  const emp = await (await b.newContext()).newPage();
  await emp.goto(o.surveyUrl.replace(/^https?:\/\/[^/]+/, base), { waitUntil: "networkidle" });
  await emp.getByRole("button", { name: "Start the survey" }).click();
  ok(await emp.getByText("Q1-ONLY question").isVisible(), "the ?s= link shows the new survey's questions");
  for (let i = 0; i < 30; i++) {
    const groups = emp.getByRole("radiogroup"); const n = await groups.count();
    for (let k = 0; k < n; k++) { const radios = groups.nth(k).getByRole("radio"); const c = await radios.count(); if (c) await radios.nth(c === 11 ? 8 : 3).click(); }
    if (await emp.getByRole("button", { name: "Submit confidentially" }).count()) break;
    await emp.getByRole("button", { name: "Next", exact: true }).click();
  }
  await emp.getByRole("button", { name: "Submit confidentially" }).click();
  await emp.waitForURL("**/survey/complete", { timeout: 15000 }).catch(() => {});
  ok(emp.url().includes("/survey/complete"), "answer submitted");
  L = (await api(admin, "listSurveys")).value;
  ok(L.surveys.find((s) => s.id === q1.id).responses === 1 && L.surveys.find((s) => s.id === "main").responses === 0, "answer counted in the new survey only");
  // make the plain link open the new survey
  r = await api(admin, "setPublicSurvey", { id: q1.id });
  pub = (await api(anon, "getPublic")).value;
  ok(r.ok && pub.surveyId === q1.id, "plain link can be pointed at another survey");
  await api(admin, "setPublicSurvey", { id: "main" });
  // cron covers all surveys
  const cronUrl = (await api(admin, "getReminderOverview")).value.cronUrl.replace(/^https?:\/\/[^/]+/, base);
  const cron = await (await fetch(cronUrl)).json().catch(() => ({}));
  ok(cron.ok && cron.surveys === 3, "reminder job runs across all surveys", JSON.stringify(cron).slice(0, 100));
  // delete the demo through the UI
  await admin.goto(base + "/settings/surveys", { waitUntil: "networkidle" });
  const row = admin.locator("li", { hasText: "Demo — Employee Survey 2025" });
  await row.getByRole("button", { name: /Delete/ }).click();
  await row.locator("input").fill("DELETE");
  await row.getByRole("button", { name: "Delete", exact: true }).click();
  await admin.waitForTimeout(1500);
  L = (await api(admin, "listSurveys")).value;
  ok(!L.surveys.some((s) => s.isDemo), "demo deleted");
  const leftovers = await api(admin, "getResults");
  ok(leftovers.ok, "results still load after deleting");
  await admin.screenshot({ path: `${shots}/surveys.png`, fullPage: true });
  // Arabic switcher
  await admin.getByRole("button", { name: "العربية" }).first().click(); await admin.waitForTimeout(400);
  await admin.screenshot({ path: `${shots}/surveys-ar.png`, fullPage: true });
  await b.close();
  console.log(failed ? `${failed} FAILED` : "ALL PASS"); process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("CRASH", e.message.split("\n").slice(0, 6).join(" | ")); process.exit(1); });
