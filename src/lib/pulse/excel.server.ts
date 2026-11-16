/**
 * Excel workbook of the results (Reports → Download for Excel). Built on the server from the same
 * anonymised figures as the screens: hidden groups stay hidden, no individual answers, no comments.
 * Sheets: Summary, Departments, Questions, Drivers, Actions, Data (a flat table for Power BI).
 */
import ExcelJS from "exceljs";
import type { PulseConfig } from "./config";
import type { Results } from "./results-types";

const INK = "FF142A32";
const PAPER = "FFFBF8F2";
const MUTED = "FF5B6B70";

function header(ws: ExcelJS.Worksheet, row: number, labels: string[]) {
  const r = ws.getRow(row);
  r.values = labels;
  r.font = { bold: true, color: { argb: PAPER }, size: 11 };
  r.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  r.height = 26;
  r.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
  });
}

function title(ws: ExcelJS.Worksheet, text: string, subtitle: string) {
  ws.getCell("A1").value = text;
  ws.getCell("A1").font = { bold: true, size: 16, color: { argb: INK } };
  ws.getCell("A2").value = subtitle;
  ws.getCell("A2").font = { italic: true, size: 10, color: { argb: MUTED } };
}

function scale(ws: ExcelJS.Worksheet, range: string) {
  ws.addConditionalFormatting({
    ref: range,
    rules: [
      {
        type: "colorScale",
        priority: 1,
        cfvo: [
          { type: "num", value: 40 },
          { type: "num", value: 60 },
          { type: "num", value: 80 },
        ],
        color: [{ argb: "FFF4C7C3" }, { argb: "FFFFF2CC" }, { argb: "FFC6E9C6" }],
      } as never,
    ],
  });
}

function widths(ws: ExcelJS.Worksheet, w: number[]) {
  ws.columns = w.map((width) => ({ width }));
}

export async function buildResultsWorkbook(r: Results, config: PulseConfig): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "OCEC Pulse";
  wb.created = new Date();
  const cycle = config.general.cycleName.en || "Survey results";
  const dims = config.dimensions.filter((d) => d.visible && !d.archived && d.kind === "likert");
  const dimName = (id: string) => config.dimensions.find((d) => d.id === id)?.name.en ?? id;
  const deptName = (id: string) => config.departments.find((d) => d.id === id)?.name.en ?? id;
  const subtitle = `${r.total} of ${r.headcount} answered (${r.rate}%) · anonymity floor k = ${r.k} · generated ${new Date().toISOString().slice(0, 10)}`;

  if (!r.enough || !r.engagement) {
    const ws = wb.addWorksheet("Summary");
    title(ws, cycle, subtitle);
    ws.getCell("A4").value = `Fewer than ${r.k} responses so far, so no scores can be shown. This keeps individual answers private.`;
    ws.getCell("A4").alignment = { wrapText: true };
    widths(ws, [90]);
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const sum = wb.addWorksheet("Summary", { views: [{ showGridLines: false }] });
  title(sum, cycle, subtitle);
  const prior = config.benchmarks.prior;
  header(sum, 4, ["Indicator", "This survey", prior.engagement !== null ? config.benchmarks.priorYearLabel || "Prior year" : "Prior year", "Change"]);
  const kpis: [string, number | string, number | null, string][] = [
    ["Engagement index (average favourable %)", Number(r.engagement.index.toFixed(1)), prior.engagement, "0.0"],
    ["Favourable answers %", r.engagement.favorable, null, "0"],
    ["Neutral answers %", r.engagement.neutral, null, "0"],
    ["Unfavourable answers %", r.engagement.unfavorable, null, "0"],
    ["eNPS", r.enps?.score ?? "", prior.enps, "+0;-0;0"],
    ["Response rate %", r.rate, prior.response, "0"],
  ];
  kpis.forEach(([label, value, before, fmt], i) => {
    const row = sum.getRow(5 + i);
    row.values = [label, value, before ?? "", typeof value === "number" && typeof before === "number" ? Number((value - before).toFixed(1)) : ""];
    row.getCell(2).numFmt = fmt;
    row.getCell(3).numFmt = fmt;
    row.getCell(4).numFmt = "+0.0;-0.0;0.0";
    row.getCell(2).font = { bold: true, size: 12, color: { argb: INK } };
  });
  const dimStart = 5 + kpis.length + 2;
  header(sum, dimStart, ["Dimension", "Favourable %", "Answers", ""]);
  dims.forEach((d, i) => {
    const s = r.dimensions[d.id];
    const row = sum.getRow(dimStart + 1 + i);
    row.values = [d.name.en, s?.score ?? "", s?.n ?? ""];
    row.getCell(2).numFmt = "0";
  });
  if (dims.length) scale(sum, `B${dimStart + 1}:B${dimStart + dims.length}`);
  widths(sum, [44, 16, 18, 14]);
  sum.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];

  // ── Departments ───────────────────────────────────────────────────────────
  const dep = wb.addWorksheet("Departments");
  title(dep, "Departments", "Hidden groups show as hidden; their figures are never shown or derived.");
  const depHead = ["Department", "Respondents", "Headcount", "Response rate %", "Engagement index", "eNPS", ...dims.map((d) => d.name.en)];
  header(dep, 4, depHead);
  r.departments.forEach((d, i) => {
    const row = dep.getRow(5 + i);
    const shown = d.dims !== null;
    row.values = shown
      ? [deptName(d.id), d.n ?? "", d.headcount, d.rate ?? "", d.index !== null ? Number(d.index.toFixed(1)) : "", d.enps ?? "", ...dims.map((x) => d.dims?.[x.id] ?? "")]
      : [deptName(d.id), "Hidden", d.headcount, "", "", "", ...dims.map(() => "")];
  });
  if (r.departments.length && dims.length) {
    const first = String.fromCharCode(71); // column G, the first dimension
    const last = String.fromCharCode(70 + dims.length);
    scale(dep, `${first}5:${last}${4 + r.departments.length}`);
  }
  widths(dep, [28, 14, 12, 16, 18, 10, ...dims.map(() => 16)]);
  dep.views = [{ state: "frozen", xSplit: 1, ySplit: 4, showGridLines: false }];

  // ── Questions ─────────────────────────────────────────────────────────────
  const qs = wb.addWorksheet("Questions");
  title(qs, "Questions", "Sorted from most to least favourable. Strengths and opportunities are the top and bottom five.");
  header(qs, 4, ["Rank", "Question", "Dimension", "Favourable %", "Answers", "Highlight"]);
  const sorted = [...r.items].sort((a, b) => b.favorable - a.favorable);
  sorted.forEach((it, i) => {
    const row = qs.getRow(5 + i);
    const label = i < 5 ? "Strength" : i >= sorted.length - 5 ? "Opportunity" : "";
    row.values = [i + 1, it.id, dimName(it.dimension), it.favorable, it.n, label];
    row.getCell(4).numFmt = "0";
  });
  if (sorted.length) scale(qs, `D5:D${4 + sorted.length}`);
  widths(qs, [8, 22, 28, 14, 12, 16]);
  qs.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];

  // ── Drivers ───────────────────────────────────────────────────────────────
  const dr = wb.addWorksheet("Drivers");
  title(dr, "What drives recommendation (eNPS)", "Correlation between each dimension and eNPS: closer to +1 means a stronger link.");
  header(dr, 4, ["Dimension", "Correlation (r)", "Reading"]);
  (r.drivers ?? []).forEach((d, i) => {
    const row = dr.getRow(5 + i);
    const reading = Math.abs(d.r) >= 0.5 ? "Strong link" : Math.abs(d.r) >= 0.3 ? "Moderate link" : "Weak link";
    row.values = [dimName(d.dimension), Number(d.r.toFixed(2)), reading];
    row.getCell(2).numFmt = "0.00";
  });
  if (!r.drivers?.length) dr.getCell("A5").value = "Not enough answers yet to measure drivers.";
  widths(dr, [30, 18, 20]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const ac = wb.addWorksheet("Actions");
  title(ac, "Action plans", "Owner, timing and status as set in the app.");
  header(ac, 4, ["Action", "Owner", "Timing", "Status", "Why it matters", "Steps"]);
  config.actions.forEach((a, i) => {
    const row = ac.getRow(5 + i);
    row.values = [a.title.en, a.owner.en, a.horizon.en, a.status, a.why.en, a.steps.map((s) => s.en).join(" · ")];
    row.alignment = { wrapText: true, vertical: "top" };
  });
  widths(ac, [34, 22, 18, 14, 50, 60]);
  ac.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];

  // ── Data (flat table for Power BI / pivots) ───────────────────────────────
  const data = wb.addWorksheet("Data");
  const rows: (string | number)[][] = [];
  for (const d of r.departments) {
    if (!d.dims) continue;
    for (const x of dims) {
      rows.push([deptName(d.id), x.name.en, d.dims[x.id] ?? "", d.index !== null ? Number(d.index.toFixed(1)) : "", d.enps ?? "", d.rate ?? ""]);
    }
  }
  data.addTable({
    name: "PulseData",
    ref: "A1",
    headerRow: true,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: ["Department", "Dimension", "Favourable %", "Engagement index", "eNPS", "Response rate %"].map((name) => ({ name })),
    rows: rows.length ? rows : [["Hidden", "", "", "", "", ""]],
  });
  widths(data, [28, 28, 14, 18, 10, 16]);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
