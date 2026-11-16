// Run against a local dev server (PULSE_CAPTCHA=off): node scripts/file-question-check.cjs <screenshot-dir> <temp-dir>
// File-upload question: limits, content check, required, submission, staff download, privacy.
const { chromium } = require("playwright");
const fs = require("fs");
const base = "http://localhost:8080"; const shots = process.argv[2]; const tmp = process.argv[3];
let failed = 0;
const ok = (c, l, x = "") => { if (!c) failed++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  → " + x : ""}`); };
const api = (page, fn, data) => page.evaluate(async ([fn, data]) => { const m = await import("/src/lib/pulse/api.ts"); try { return { ok: true, value: await m[fn](data === undefined ? undefined : { data }) }; } catch (e) { return { ok: false, error: String(e && e.message) }; } }, [fn, data]);
fs.writeFileSync(`${tmp}/report.pdf`, Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(3000, 65), Buffer.from("\n%%EOF")]));
fs.writeFileSync(`${tmp}/fake.pdf`, Buffer.concat([Buffer.from("MZ\x90\x00"), Buffer.alloc(2000, 1)]));
fs.writeFileSync(`${tmp}/big.pdf`, Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(1.5 * 1024 * 1024, 66)]));
fs.writeFileSync(`${tmp}/run.exe`, Buffer.from("MZ\x90\x00"));
(async () => {
  const b = await chromium.launch();
  const admin = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await admin.goto(`${base}/api/test-access?key=local-test-key-0123456789abcdef&as=super&next=/settings/builder`, { waitUntil: "networkidle" });
  let cfg = (await api(admin, "getAdminConfig")).value;
  cfg.questions.push({ id: "F1", dimension: "open", type: "file", text: { en: "Attach a document that shows the problem", ar: "أرفق مستنداً يوضح المشكلة" }, required: true, visible: true, order: 999, fileTypes: ["pdf", "png"], maxSizeMb: 1, maxFiles: 2 });
  cfg.general.status = "open"; cfg.general.allowOpenLink = true; cfg.calendar.fieldOpen = "2026-01-01"; cfg.calendar.fieldClose = "2027-12-31";
  let r = await api(admin, "saveAdminConfig", { config: cfg });
  ok(r.ok, "file question added (PDF/PNG, 1 MB, up to 2 files, required)", r.error);
  // builder shows the file settings
  await admin.reload({ waitUntil: "networkidle" });
  const emp = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await emp.goto(`${base}/survey`, { waitUntil: "networkidle" });
  await emp.getByRole("button", { name: "Start the survey" }).click();
  for (let i = 0; i < 30; i++) {
    if (await emp.getByText("Attach a document that shows the problem").count()) break;
    const groups = emp.getByRole("radiogroup"); const n = await groups.count();
    for (let k = 0; k < n; k++) { const radios = groups.nth(k).getByRole("radio"); const c = await radios.count(); if (c) await radios.nth(c === 11 ? 8 : 3).click(); }
    await emp.getByRole("button", { name: "Next", exact: true }).click();
  }
  ok(await emp.getByText("Attach a document that shows the problem").isVisible(), "file question shown on the comments page");
  ok(await emp.getByText(/PDF, PNG · up to 1 MB each · up to 2 files/).isVisible(), "limits shown to the employee");
  ok(await emp.getByText(/Files can carry your name/).isVisible(), "privacy reminder shown");
  // Next without the required file → stays and highlights it
  await emp.getByRole("button", { name: "Next", exact: true }).click();
  await emp.waitForTimeout(500);
  ok(await emp.getByText("Attach a document that shows the problem").isVisible() && (await emp.locator('[data-missing="true"]').count()) === 1, "required file: Next stops at it");
  const input = emp.locator('input[type="file"]');
  await input.setInputFiles(`${tmp}/run.exe`);
  ok(await emp.getByText(/This kind of file is not accepted/).isVisible(), "program file refused in the browser");
  await input.setInputFiles(`${tmp}/big.pdf`);
  ok(await emp.getByText(/the limit is 1 MB/).isVisible(), "too-large file refused in the browser");
  await input.setInputFiles(`${tmp}/fake.pdf`);
  await emp.getByText(/does not match its type/).waitFor({ timeout: 8000 }).catch(() => {});
  ok(await emp.getByText(/does not match its type/).isVisible(), "renamed program refused by the server (content check)");
  // server-side size limit bypassing the browser
  const direct = await emp.evaluate(async () => { const f = new FormData(); f.append("file", new File([new Uint8Array(1.5 * 1024 * 1024).fill(37)], "x.pdf")); f.append("question", "F1"); const r = await fetch("/api/upload", { method: "POST", body: f }); return r.status; });
  ok(direct === 413 || direct === 415, "server enforces the size limit too", String(direct));
  await input.setInputFiles(`${tmp}/report.pdf`);
  await emp.getByText("report.pdf").waitFor({ timeout: 10000 });
  ok(true, "valid PDF uploaded and listed");
  await emp.screenshot({ path: `${shots}/file-question.png`, fullPage: true });
  ok(await emp.getByRole("button", { name: "Add another file" }).isVisible(), "can add a second file (limit 2)");
  // pending until sent: not visible to staff
  let L = (await api(admin, "listAttachments")).value;
  ok(L.allowed && (L.questions[0]?.files.length ?? 0) === 0, "staff see nothing before the survey is sent");
  await emp.getByRole("button", { name: "Next", exact: true }).click();
  await emp.getByRole("button", { name: "Submit confidentially" }).click();
  await emp.waitForURL("**/survey/complete", { timeout: 15000 }).catch(() => {});
  ok(emp.url().includes("/survey/complete"), "survey with the file submitted");
  L = (await api(admin, "listAttachments")).value;
  const f = L.questions.find((q) => q.id === "F1")?.files[0];
  ok(f && f.filename === "report.pdf" && f.size > 3000, "staff see the file after sending", JSON.stringify(f).slice(0, 120));
  ok(f && f.departmentId === null, "department hidden for a single file (anonymity)");
  const dl = await admin.evaluate(async (id) => { const r = await fetch(`/api/attachment?id=${id}`); const t = await r.arrayBuffer(); return { s: r.status, cd: r.headers.get("content-disposition"), ct: r.headers.get("content-type"), n: t.byteLength }; }, f.id);
  ok(dl.s === 200 && /attachment/.test(dl.cd) && dl.ct === "application/octet-stream" && dl.n === fs.statSync(`${tmp}/report.pdf`).size, "download works, always as a file", JSON.stringify(dl));
  const anon = await (await b.newContext()).newPage();
  await anon.goto(base + "/", { waitUntil: "networkidle" });
  const st = await anon.evaluate(async (id) => (await fetch(`/api/attachment?id=${id}`)).status, f.id);
  ok(st === 401, "not signed in: download refused", String(st));
  await admin.goto(`${base}/insights/files`, { waitUntil: "networkidle" });
  await admin.getByText("report.pdf").waitFor({ timeout: 10000 }).catch(() => {});
  ok(await admin.getByText("report.pdf").isVisible(), "Attached files page lists it");
  await admin.screenshot({ path: `${shots}/files-page.png` });
  // builder file settings
  await admin.goto(`${base}/settings/builder`, { waitUntil: "networkidle" });
  ok((await admin.locator('option[value="file"]').count()) > 0, "builder offers 'File upload' type");
  await b.close();
  console.log(failed ? `${failed} FAILED` : "ALL PASS"); process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("CRASH", e.message.split("\n").slice(0, 6).join(" | ")); process.exit(1); });
