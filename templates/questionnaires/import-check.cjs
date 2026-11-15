const { chromium } = require("playwright");
const { execSync } = require("child_process");
const base = "http://localhost:8080";
const T = process.argv[2]; const shots = process.argv[3];
let failed = 0;
const ok = (c, l, x = "") => { if (!c) failed++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  → " + x : ""}`); };
const psql = (q) => execSync(`su postgres -c "psql -p 5433 -h 127.0.0.1 -d pulse -Atc \\"${q}\\""`).toString().trim();
async function upload(page, file) {
  await page.locator('input[type="file"]').setInputFiles(`${T}/${file}`);
  await page.waitForTimeout(1500);
}
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto(`${base}/api/test-access?key=local-test-key-0123456789abcdef&as=super&next=/settings/builder`, { waitUntil: "networkidle" });
  await page.goto(`${base}/settings/builder`, { waitUntil: "networkidle" });
  ok(await page.getByText("Import questions from Excel").isVisible(), "import panel on Survey builder");
  const tpl = await page.request.get(`${base}/templates/pulse-questions-template.xlsx`);
  ok(tpl.ok() && (await tpl.body()).length > 5000, "blank template downloads");
  // A broken file shows problems with row numbers and no replace button
  await upload(page, "pulse-questions-template.xlsx");
  ok(await page.getByText(/Fix 1 problem/).isVisible(), "empty template is refused with a reason");
  ok((await page.getByRole("button", { name: "Replace the questions" }).count()) === 0, "no replace button for a bad file");
  // Exit survey import
  await upload(page, "03-exit-survey.xlsx");
  ok(await page.getByText(/Ready: 6 sections, 13 agree/).isVisible(), "exit survey preview counts");
  await page.screenshot({ path: `${shots}/import-preview.png`, fullPage: false });
  await page.getByRole("button", { name: "Replace the questions" }).click();
  await page.getByRole("button", { name: "Yes, replace the questions" }).click();
  await page.waitForTimeout(2500);
  ok(await page.getByText(/Questions replaced/).first().isVisible().catch(() => false), "replace confirmed");
  const cfg = JSON.parse(psql("select value::text from pulse_settings where key='config'"));
  ok(cfg.questions.length === 17 && cfg.dimensions.length === 6 && cfg.general.cycleName.en === "Exit Survey", "settings now hold the exit survey", `${cfg.questions.length} q, ${cfg.dimensions.length} s, ${cfg.general.cycleName.en}`);
  ok(!!psql("select value::text from pulse_settings where key='questionnaire_backup'"), "previous questions kept as backup");
  ok(psql("select count(*) from pulse_audit where action_en like 'Imported the survey questions%'") === "1", "import written to change history");
  // Wait for any pending autosave, then check the import survived it
  await page.waitForTimeout(2000);
  const cfg2 = JSON.parse(psql("select value::text from pulse_settings where key='config'"));
  ok(cfg2.general.cycleName.en === "Exit Survey", "a later autosave did not undo the import");
  // Survey shows the new sections; take it
  psql("update pulse_settings set value = jsonb_set(jsonb_set(jsonb_set(value, '{general,status}', to_jsonb('open'::text)), '{calendar,fieldOpen}', to_jsonb('2026-01-01'::text)), '{calendar,fieldClose}', to_jsonb('2026-12-31'::text)) where key='config'");
  const s = await (await b.newContext({ viewport: { width: 420, height: 860 } })).newPage();
  await s.goto(`${base}/survey`, { waitUntil: "networkidle" });
  ok(await s.getByRole("heading", { name: "Exit Survey" }).isVisible(), "survey shows the new name");
  await s.getByRole("button", { name: "Start the survey" }).last().click();
  ok(await s.getByRole("heading", { name: "The Role" }).isVisible(), "first section is 'The Role'");
  for (let step = 0; step < 6; step++) {
    const groups = s.getByRole("radiogroup");
    const n = await groups.count();
    for (let i = 0; i < n; i++) { const r = groups.nth(i).getByRole("radio"); await r.nth((await r.count()) === 11 ? 8 : 3).click(); }
    await s.getByRole("button", { name: /^Next/ }).click(); await s.waitForTimeout(300);
  }
  ok((await s.getByRole("textbox").count()) === 3, "comments page shows the 3 exit questions");
  await s.getByRole("textbox").first().fill("Better pay elsewhere");
  await s.getByRole("button", { name: /^Next/ }).click(); await s.waitForTimeout(300);
  await s.getByRole("button", { name: /^Submit/ }).click();
  await s.waitForURL("**/survey/complete**", { timeout: 15000 });
  ok(psql("select count(*) from pulse_answers") === "14", "answers stored against the new questions", psql("select count(*) from pulse_answers"));
  // With an answer in, import and restore are blocked
  await page.reload({ waitUntil: "networkidle" });
  ok(await page.getByText(/already has 1 answer/).isVisible(), "import blocked once answers exist");
  await upload(page, "01-engagement-pulse.xlsx");
  ok((await page.getByRole("button", { name: "Replace the questions" }).count()) === 0, "no replace button while answers exist");
  const forced = await page.evaluate(async () => { const m = await import("/src/lib/pulse/api.ts"); try { await m.restoreQuestionnaireBackup(); return "allowed"; } catch (e) { return String(e.message); } });
  ok(/already has 1 answer/.test(forced), "server refuses restore too", forced.slice(0, 60));
  // Clear answers, then go back to the previous questions
  psql("delete from pulse_comments; delete from pulse_answers; delete from pulse_responses");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Go back to them" }).click();
  await page.waitForTimeout(2500);
  const cfg3 = JSON.parse(psql("select value::text from pulse_settings where key='config'"));
  ok(cfg3.questions.length === 51 && cfg3.general.cycleName.en !== "Exit Survey", "went back to the original 51 questions", `${cfg3.questions.length}`);
  // Arabic view of the panel
  await page.getByRole("button", { name: "العربية" }).first().click(); await page.waitForTimeout(400);
  await upload(page, "05-manager-effectiveness.xlsx");
  await page.screenshot({ path: `${shots}/import-preview-ar.png`, fullPage: false });
  ok(await page.getByText(/جاهز: ٦|جاهز: 6/).isVisible(), "Arabic preview");
  await b.close();
  console.log(failed ? `${failed} FAILED` : "ALL PASS");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("CRASH", e.message); process.exit(1); });
