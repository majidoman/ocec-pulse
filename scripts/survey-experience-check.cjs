// Run against a local dev server (PULSE_CAPTCHA=off): node scripts/survey-experience-check.cjs <screenshot-dir>
// Survey experience: themes, preview tab, grid sections, one-page mode, jump to unanswered, required per section.
const { chromium, devices } = require("playwright");
const base = "http://localhost:8080"; const shots = process.argv[2];
let failed = 0;
const ok = (c, l, x = "") => { if (!c) failed++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  → " + x : ""}`); };
const api = (page, fn, data) => page.evaluate(async ([fn, data]) => { const m = await import("/src/lib/pulse/api.ts"); try { return { ok: true, value: await m[fn](data === undefined ? undefined : { data }) }; } catch (e) { return { ok: false, error: String(e && e.message) }; } }, [fn, data]);
const cssVar = (page, name) => page.evaluate((n) => getComputedStyle(document.querySelector("[data-theme]")).getPropertyValue(n).trim(), name);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const admin = await ctx.newPage();
  await admin.goto(`${base}/api/test-access?key=local-test-key-0123456789abcdef&as=super&next=/settings/appearance`, { waitUntil: "networkidle" });
  await admin.getByRole("heading", { name: "Look & layout" }).waitFor({ timeout: 15000 });
  ok(true, "'Look & layout' settings page opens");
  ok((await admin.getByRole("radio").count()) >= 9, "7 themes + 2 page layouts offered", String(await admin.getByRole("radio").count()));
  await admin.getByRole("radio", { name: /Ocean/ }).click();
  await admin.getByText("All changes saved").waitFor({ timeout: 10000 }).catch(() => {});
  let cfg = (await api(admin, "getAdminConfig")).value;
  ok(cfg.presentation.theme === "ocean", "theme saved", cfg.presentation.theme);
  await admin.screenshot({ path: `${shots}/appearance.png`, fullPage: true });

  // Preview in a new tab (survey still a draft)
  const [tab] = await Promise.all([ctx.waitForEvent("page"), admin.getByRole("button", { name: "Preview in a new tab" }).click()]);
  await tab.waitForURL("**/survey?preview=**", { timeout: 15000 });
  await tab.getByText("Preview — answers are not sent").waitFor({ timeout: 15000 });
  ok(true, "preview opens in a new tab with a banner, even though the survey is not open");
  ok((await cssVar(tab, "--color-sand")) === "#edf3f6", "preview uses the chosen theme (Ocean)", await cssVar(tab, "--color-sand"));
  await tab.getByRole("button", { name: "Start the survey" }).click();
  ok(await tab.getByText("Section 1 of").isVisible(), "one section per page by default");
  await tab.screenshot({ path: `${shots}/preview-ocean.png` });
  // anonymous visitor cannot use ?preview=1
  const anon = await (await b.newContext()).newPage();
  await anon.goto(`${base}/survey?preview=1`, { waitUntil: "networkidle" });
  await anon.getByText("The survey is not open").waitFor({ timeout: 15000 }).catch(() => {});
  ok(await anon.getByText("The survey is not open").isVisible(), "preview link does nothing for someone not signed in");

  // Open the survey; first section as a grid; one question on page 1 optional
  cfg = (await api(admin, "getAdminConfig")).value;
  const dims = cfg.dimensions.filter((d) => d.visible && !d.archived).sort((a, b) => a.order - b.order);
  const first = dims[0];
  const firstQs = cfg.questions.filter((q) => q.dimension === first.id && q.visible).sort((a, b) => a.order - b.order);
  cfg.dimensions = cfg.dimensions.map((d) => (d.id === first.id ? { ...d, display: "matrix" } : d));
  const optId = firstQs[1].id;
  cfg.questions = cfg.questions.map((q) => (q.id === optId ? { ...q, required: false } : q));
  cfg.general.status = "open";
  cfg.calendar.fieldOpen = "2026-01-01"; cfg.calendar.fieldClose = "2026-12-31";
  let r = await api(admin, "saveAdminConfig", { config: cfg });
  ok(r.ok, "survey opened with the first section as a grid", r.error);

  const emp = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await emp.goto(`${base}/survey`, { waitUntil: "networkidle" });
  await emp.getByRole("button", { name: "Start the survey" }).click();
  const table = emp.locator("table");
  ok(await table.isVisible(), "grid shown on a wide screen");
  ok((await emp.locator('table input[type="radio"]').count()) === firstQs.filter((q) => q.type === "likert").length * 5, "a row of 5 choices per question");
  ok(await emp.getByText("(Optional)").first().isVisible(), "optional question marked '(Optional)'");
  // Next with nothing answered → stays, highlights
  await emp.getByRole("button", { name: "Next", exact: true }).click();
  ok(await emp.getByText(/required questions still need an answer|required question still needs/).isVisible(), "Next with gaps shows how many are left");
  ok((await emp.locator('tr[data-missing="true"]').count()) === firstQs.length - 1, "missing rows highlighted (optional one not)", String(await emp.locator('tr[data-missing="true"]').count()));
  await emp.screenshot({ path: `${shots}/grid-missing.png`, fullPage: true });
  // answer all but the optional one
  for (const q of firstQs) if (q.id !== optId) await emp.locator(`input[name="m-${q.id}"][value="4"]`).check();
  await emp.getByRole("button", { name: "Next", exact: true }).click();
  ok(await emp.getByText("Section 2 of").isVisible(), "grid answered → next section");
  // phone: cards instead of grid
  const phone = await (await b.newContext({ ...devices["Pixel 7"] })).newPage();
  await phone.goto(`${base}/survey`, { waitUntil: "networkidle" });
  await phone.getByRole("button", { name: "Start the survey" }).click();
  ok(!(await phone.locator("table").isVisible()) && (await phone.locator("fieldset").first().isVisible()), "phone shows cards, not the grid");

  // Go through the rest, then make the optional question required → Submit jumps back to page 1
  for (let i = 0; i < 30; i++) {
    const groups = emp.getByRole("radiogroup"); const n = await groups.count();
    for (let k = 0; k < n; k++) { const radios = groups.nth(k).getByRole("radio"); const c = await radios.count(); if (c) await radios.nth(c === 11 ? 8 : 3).click(); }
    if (await emp.getByRole("button", { name: "Submit confidentially" }).count()) break;
    await emp.getByRole("button", { name: "Next", exact: true }).click();
  }
  cfg = (await api(admin, "getAdminConfig")).value;
  cfg.questions = cfg.questions.map((q) => (q.id === optId ? { ...q, required: true } : q));
  await api(admin, "saveAdminConfig", { config: cfg });
  await emp.reload({ waitUntil: "networkidle" });
  await emp.getByRole("button", { name: "Start the survey" }).click();
  ok(await emp.getByRole("button", { name: "Submit confidentially" }).isVisible(), "answers and page kept after reload");
  await emp.getByRole("button", { name: "Submit confidentially" }).click();
  await emp.waitForTimeout(600);
  ok(await emp.getByText("Section 1 of").isVisible(), "Submit with a gap on an earlier page jumps back to that page");
  ok((await emp.locator('tr[data-missing="true"]').count()) === 1, "and highlights the unanswered question");
  ok(await emp.getByText(/1 required question still needs an answer/).isVisible(), "message says 1 question is left");
  await emp.locator(`input[name="m-${optId}"][value="5"]`).check();
  for (let i = 0; i < 30 && !(await emp.getByRole("button", { name: "Submit confidentially" }).count()); i++) await emp.getByRole("button", { name: "Next", exact: true }).click();
  await emp.getByRole("button", { name: "Submit confidentially" }).click();
  await emp.waitForURL("**/survey/complete", { timeout: 15000 }).catch(() => {});
  ok(emp.url().includes("/survey/complete"), "then it submits");
  ok((await cssVar(emp, "--color-sand")) === "#edf3f6", "thank-you page uses the theme too");

  // One-page mode
  cfg = (await api(admin, "getAdminConfig")).value;
  cfg.presentation = { ...cfg.presentation, pageMode: "single", theme: "night" };
  await api(admin, "saveAdminConfig", { config: cfg });
  const one = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await one.goto(`${base}/survey`, { waitUntil: "networkidle" });
  await one.getByRole("button", { name: "Start the survey" }).click();
  const h2 = await one.locator("main h2, section h2").count();
  ok((await one.locator("section h2").count()) >= dims.length, "one-page mode shows every section on one page", String(h2));
  ok(await one.getByText(/0 of \d+ questions answered/).isVisible(), "progress counts answered questions");
  ok((await one.getByRole("button", { name: "Next", exact: true }).count()) === 0 && (await one.getByRole("button", { name: "Submit confidentially" }).isVisible()), "only a Submit button");
  // answer the first half only
  const groups = one.getByRole("radiogroup"); const n = await groups.count();
  for (let k = 0; k < Math.floor(n / 2); k++) { const radios = groups.nth(k).getByRole("radio"); const c = await radios.count(); if (c) await radios.nth(c === 11 ? 8 : 3).click(); }
  for (const q of firstQs) await one.locator(`input[name="m-${q.id}"][value="4"]`).check();
  await one.evaluate(() => window.scrollTo(0, 0));
  await one.getByRole("button", { name: "Submit confidentially" }).click();
  await one.waitForTimeout(900);
  const firstMissing = one.locator('[data-missing="true"]:visible').first();
  const box = await firstMissing.boundingBox();
  ok(box && box.y > 0 && box.y < 900, "Submit scrolls to the first unanswered question", JSON.stringify(box && Math.round(box.y)));
  ok(await one.getByText(/required questions still need an answer/).isVisible(), "and says how many are left");
  ok((await cssVar(one, "--color-sand")) === "#11181c", "Night theme applied");
  await one.screenshot({ path: `${shots}/onepage-night.png` });
  // Arabic grid
  cfg.presentation = { ...cfg.presentation, pageMode: "section", theme: "desert" };
  await api(admin, "saveAdminConfig", { config: cfg });
  const ar = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await ar.goto(`${base}/survey`, { waitUntil: "networkidle" });
  await ar.getByRole("button", { name: "العربية" }).first().click(); await ar.waitForTimeout(300);
  await ar.getByRole("button", { name: "ابدأ الاستبيان" }).click().catch(async () => { await ar.locator("button.w-full").first().click(); });
  await ar.waitForTimeout(400);
  await ar.screenshot({ path: `${shots}/grid-ar-desert.png`, fullPage: true });
  ok(await ar.locator("table").isVisible(), "Arabic grid shows (right-to-left)");
  // Builder controls
  await admin.goto(`${base}/settings/builder`, { waitUntil: "networkidle" });
  ok(await admin.getByRole("radio", { name: "Grid (1–5)" }).isVisible() && await admin.getByRole("button", { name: "Make all required" }).isVisible(), "builder: per-section grid switch and 'make all required/optional'");
  await admin.screenshot({ path: `${shots}/builder.png` });
  await b.close();
  console.log(failed ? `${failed} FAILED` : "ALL PASS"); process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("CRASH", e.message.split("\n").slice(0, 6).join(" | ")); process.exit(1); });
