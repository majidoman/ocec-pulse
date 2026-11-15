const { chromium } = require("playwright");
const { execSync } = require("child_process");
const base = "http://localhost:8080";
let failed = 0;
const ok = (c, l, x = "") => { if (!c) failed++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  → " + x : ""}`); };
const psql = (q) => execSync(`su postgres -c "psql -p 5433 -h 127.0.0.1 -d pulse -Atc \\"${q}\\""`).toString().trim();
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto(`${base}/api/test-access?key=local-test-key-0123456789abcdef&as=super&next=/settings/builder`, { waitUntil: "networkidle" });
  await page.goto(`${base}/settings/builder`, { waitUntil: "networkidle" });
  await page.getByText(/Ready-made questionnaires \(11\)/).click();
  const items = page.locator("li").filter({ has: page.getByRole("button", { name: "Check and use" }) });
  ok((await items.count()) === 11, "library lists 11 questionnaires", String(await items.count()));
  for (let i = 0; i < 11; i++) {
    await items.nth(i).getByRole("button", { name: "Check and use" }).click();
    await page.waitForTimeout(1200);
    const ready = await page.getByText(/^Ready: /).isVisible().catch(() => false);
    const name = (await items.nth(i).locator("p").first().textContent()).trim();
    ok(ready, `library: ${name} passes the check`);
  }
  await page.screenshot({ path: process.argv[2] + "/library.png" });
  // Use "Overall Employee Satisfaction"
  await items.filter({ hasText: "Overall Employee Satisfaction" }).getByRole("button", { name: "Check and use" }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Replace the questions" }).click();
  await page.getByRole("button", { name: "Yes, replace the questions" }).click();
  await page.waitForTimeout(2500);
  const cfg = JSON.parse(psql("select value::text from pulse_settings where key='config'"));
  ok(cfg.general.cycleName.en === "Overall Employee Satisfaction" && cfg.questions.length === 51, "satisfaction survey is now in use", `${cfg.general.cycleName.en} / ${cfg.questions.length}`);
  psql("update pulse_settings set value = jsonb_set(jsonb_set(jsonb_set(jsonb_set(value, '{general,status}', to_jsonb('open'::text)), '{calendar,fieldOpen}', to_jsonb('2026-01-01'::text)), '{calendar,fieldClose}', to_jsonb('2026-12-31'::text)), '{general,orgShort}', jsonb_build_object('en','OCEC','ar','المركز')) where key='config'");
  const s = await (await b.newContext({ viewport: { width: 420, height: 860 } })).newPage();
  await s.goto(`${base}/survey`, { waitUntil: "networkidle" });
  await s.getByRole("button", { name: "Start the survey" }).last().click();
  ok(await s.getByRole("heading", { name: "Senior Leadership" }).isVisible(), "survey opens on 'Senior Leadership'");
  ok(await s.getByText("I trust the vision of senior leadership for OCEC.").isVisible(), "organisation name filled into the question");
  await s.getByRole("button", { name: "العربية" }).first().click(); await s.waitForTimeout(400);
  ok(await s.getByText("أثق في رؤية القيادة العليا في المركز.").isVisible(), "Arabic question with the organisation name");
  await s.screenshot({ path: process.argv[2] + "/satisfaction-ar.png" });
  await b.close();
  console.log(failed ? `${failed} FAILED` : "ALL PASS");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("CRASH", e.message); process.exit(1); });
