import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { uploadRoster } from "@/lib/pulse/api";
import { downloadText } from "@/lib/pulse/format";
import type { RosterUploadSummary } from "@/lib/pulse/results-types";
import type { Department } from "@/lib/types";
import { useT } from "@/lib/store";

/** Same rule the server applies. */
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const CHUNK = 250;

type Row = { email: string; departmentId: string | null };

interface Preview {
  source: string;
  rows: Row[];
  valid: number;
  invalid: string[];
  noEmail: string[];
  duplicates: number;
  byDept: Map<string, number>;
  noDept: number;
  unmatched: Map<string, number>;
}

/**
 * Each line or sheet row: the cell with an "@" is the email; the first other non-empty cell is the department.
 * Non-empty rows with no email are reported (except a first header row such as "Email, Department").
 */
function rowsFromCells(cells: string[][]): { rows: Row[]; noEmail: string[] } {
  const rows: Row[] = [];
  const noEmail: string[] = [];
  let first = true;
  for (const raw of cells) {
    const line = raw.map((c) => c.trim().replace(/^"|"$/g, ""));
    if (!line.some(Boolean)) continue;
    const isFirst = first;
    first = false;
    const email = line.find((c) => c.includes("@"));
    if (!email) {
      if (!(isFirst && line.some((c) => /e-?mail|بريد/i.test(c)))) noEmail.push(line.filter(Boolean).join(", ").slice(0, 60));
      continue;
    }
    const dept = line.find((c) => c && c !== email) ?? null;
    rows.push({ email, departmentId: dept });
  }
  return { rows, noEmail };
}

function cellsFromText(text: string): string[][] {
  return text.split(/\r?\n/).map((line) => line.split(/[,;\t]/));
}

function matchDept(raw: string | null, departments: Department[]): string | null | undefined {
  const v = (raw ?? "").trim();
  if (!v) return null;
  for (const d of departments) {
    if (d.id === v || d.name.en.trim().toLowerCase() === v.toLowerCase() || d.name.ar.trim() === v) return d.id;
  }
  return undefined;
}

function buildPreview(parsed: { rows: Row[]; noEmail: string[] }, source: string, departments: Department[]): Preview {
  const { rows, noEmail } = parsed;
  const seen = new Set<string>();
  const p: Preview = { source, rows, valid: 0, invalid: [], noEmail, duplicates: 0, byDept: new Map(), noDept: 0, unmatched: new Map() };
  for (const r of rows) {
    const email = r.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) {
      p.invalid.push(r.email);
      continue;
    }
    if (seen.has(email)) {
      p.duplicates += 1;
      continue;
    }
    seen.add(email);
    p.valid += 1;
    const d = matchDept(r.departmentId, departments);
    if (d === null) p.noDept += 1;
    else if (d === undefined) p.unmatched.set(r.departmentId ?? "", (p.unmatched.get(r.departmentId ?? "") ?? 0) + 1);
    else p.byDept.set(d, (p.byDept.get(d) ?? 0) + 1);
  }
  return p;
}

export function RosterUpload({
  departments,
  timezone,
  lastUpload,
  onDone,
}: {
  departments: Department[];
  timezone: string;
  lastUpload: RosterUploadSummary | null;
  onDone: () => Promise<void> | void;
}) {
  const { loc, lang } = useT();
  const [paste, setPaste] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [allowUnmatched, setAllowUnmatched] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<RosterUploadSummary | null>(null);
  const [reading, setReading] = useState(false);

  const active = departments.filter((d) => !d.archived);
  const fmt = useMemo(() => {
    const locale = lang === "ar" ? "ar-OM" : "en-GB";
    try {
      return new Intl.DateTimeFormat(locale, { timeZone: timezone || "Asia/Muscat", dateStyle: "full", timeStyle: "short" });
    } catch {
      return new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short" });
    }
  }, [lang, timezone]);
  const deptName = (id: string) => loc(departments.find((d) => d.id === id)?.name ?? { en: id, ar: id });

  function review(parsed: { rows: Row[]; noEmail: string[] }, source: string) {
    const rows = parsed.rows;
    if (!rows.length) {
      toast.error(loc({ en: "No email addresses found.", ar: "لم يُعثر على عناوين بريد." }));
      return;
    }
    if (rows.length > 20000) {
      toast.error(loc({ en: "Too many rows (over 20,000). Split the file.", ar: "عدد الصفوف كبير جداً (أكثر من ٢٠٬٠٠٠). قسّم الملف." }));
      return;
    }
    setResult(null);
    setAllowUnmatched(false);
    setPreview(buildPreview(parsed, source, departments));
  }

  async function readFile(file: File) {
    setReading(true);
    try {
      if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import("read-excel-file/universal");
        const sheet = (await readSheet(file)) as unknown[][];
        review(rowsFromCells(sheet.map((r) => r.map((c) => (c === null || c === undefined ? "" : String(c))))), file.name);
      } else if (/\.xls$/i.test(file.name)) {
        toast.error(loc({ en: "Old .xls files are not supported. Save as .xlsx or .csv.", ar: "ملفات .xls القديمة غير مدعومة. احفظ الملف بصيغة .xlsx أو .csv." }));
      } else {
        review(rowsFromCells(cellsFromText(await file.text())), file.name);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : loc({ en: "Could not read the file.", ar: "تعذّرت قراءة الملف." }));
    } finally {
      setReading(false);
    }
  }

  function downloadTemplate() {
    const examples = active.slice(0, 2);
    const lines = [
      "email,department",
      `first.person@company.com,${examples[0]?.name.en ?? "Department name"}`,
      `second.person@company.com,${examples[1]?.name.en ?? examples[0]?.name.en ?? "Department name"}`,
    ];
    // BOM so Excel opens Arabic department names correctly.
    downloadText("staff-list-template.csv", `\uFEFF${lines.join("\r\n")}\r\n`);
  }

  async function upload() {
    if (!preview) return;
    const rows = preview.rows;
    const count = Math.max(1, Math.ceil(rows.length / CHUNK));
    const id = crypto.randomUUID();
    setProgress({ done: 0, total: rows.length });
    try {
      let summary: RosterUploadSummary | null = null;
      for (let i = 0; i < count; i += 1) {
        const part = rows.slice(i * CHUNK, (i + 1) * CHUNK);
        const res = await uploadRoster({
          data: { rows: part, allowUnmatched, batch: { id, index: i, count, source: preview.source.slice(0, 120) } },
        });
        if (res.summary) summary = res.summary;
        setProgress({ done: Math.min(rows.length, (i + 1) * CHUNK), total: rows.length });
      }
      setResult(summary);
      setPreview(null);
      setPaste("");
      await onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : loc({ en: "Upload failed", ar: "فشل الرفع" }));
    } finally {
      setProgress(null);
    }
  }

  const blocked = !!preview && preview.unmatched.size > 0 && !allowUnmatched;
  const shownSummary = result ?? lastUpload;

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-ink">{loc({ en: "1 · Add people", ar: "١ · إضافة أشخاص" })}</h2>
      <p className="mb-3 text-sm text-muted">
        {loc({
          en: "One person per row: email, and the department name. Upload an Excel (.xlsx) or CSV file, or paste the rows. You will see a check before anything is saved.",
          ar: "شخص في كل صف: البريد واسم الإدارة. ارفع ملف إكسل (.xlsx) أو CSV، أو الصق الصفوف. سترى مراجعة قبل الحفظ.",
        })}
      </p>

      {!preview && !progress ? (
        <>
          <Textarea
            rows={4}
            dir="ltr"
            placeholder={"name@company.com, Culinary & Banqueting\nname2@company.com, Security"}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button disabled={!paste.trim()} onClick={() => review(rowsFromCells(cellsFromText(paste)), loc({ en: "pasted list", ar: "قائمة ملصقة" }))}>
              {loc({ en: "Check list", ar: "مراجعة القائمة" })}
            </Button>
            <label className="inline-flex h-11 cursor-pointer items-center rounded-md border border-border bg-paper px-4 text-sm">
              {reading ? loc({ en: "Reading…", ar: "جارٍ القراءة…" }) : loc({ en: "Upload Excel or CSV", ar: "رفع إكسل أو CSV" })}
              <input
                type="file"
                accept=".xlsx,.csv,.txt"
                className="hidden"
                disabled={reading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void readFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <Button variant="ghost" onClick={downloadTemplate}>
              {loc({ en: "Download template", ar: "تنزيل القالب" })}
            </Button>
          </div>
          <details className="mt-3 text-xs text-muted">
            <summary className="cursor-pointer">{loc({ en: "Department names the file must use", ar: "أسماء الإدارات المعتمدة في الملف" })}</summary>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {active.map((d) => (
                <li key={d.id}>
                  {d.name.en} · <span dir="rtl">{d.name.ar}</span>
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : null}

      {preview && !progress ? (
        <div className="flex flex-col gap-3 text-sm">
          <p className="font-medium text-ink">
            {loc({ en: "Check before saving", ar: "راجع قبل الحفظ" })} · <span dir="ltr">{preview.source}</span>
          </p>
          <ul className="grid gap-1 text-ink">
            <li>✓ {loc({ en: `Ready to add: ${preview.valid}`, ar: `جاهز للإضافة: ${preview.valid}` })}</li>
            {preview.duplicates ? (
              <li className="text-muted">{loc({ en: `Repeated, skipped: ${preview.duplicates}`, ar: `مكرر، سيُتجاهل: ${preview.duplicates}` })}</li>
            ) : null}
            {preview.invalid.length ? (
              <li className="text-score-crit">
                {loc({ en: `Invalid email, skipped: ${preview.invalid.length} —`, ar: `بريد غير صالح، سيُتجاهل: ${preview.invalid.length} —` })}{" "}
                <span dir="ltr">{preview.invalid.slice(0, 5).join(", ")}{preview.invalid.length > 5 ? "…" : ""}</span>
              </li>
            ) : null}
            {preview.noEmail.length ? (
              <li className="text-score-crit">
                {loc({ en: `No email address, skipped: ${preview.noEmail.length} —`, ar: `بلا بريد إلكتروني، سيُتجاهل: ${preview.noEmail.length} —` })}{" "}
                <span dir="auto">{preview.noEmail.slice(0, 3).join(" | ")}{preview.noEmail.length > 3 ? "…" : ""}</span>
              </li>
            ) : null}
            {preview.noDept ? (
              <li className="text-muted">{loc({ en: `No department given: ${preview.noDept}`, ar: `بلا إدارة: ${preview.noDept}` })}</li>
            ) : null}
          </ul>

          {preview.byDept.size ? (
            <div className="rounded-xl bg-sand-2 px-3 py-2">
              <p className="mb-1 text-xs font-medium text-muted">{loc({ en: "By department", ar: "حسب الإدارة" })}</p>
              <ul className="grid gap-x-4 gap-y-0.5 text-xs text-ink sm:grid-cols-2">
                {[...preview.byDept.entries()].map(([id, n]) => (
                  <li key={id} className="flex justify-between gap-2">
                    <span>{deptName(id)}</span>
                    <span className="tabular-nums">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.unmatched.size ? (
            <div className="rounded-xl border border-score-crit/40 px-3 py-2">
              <p className="font-medium text-score-crit">
                {loc({ en: "These department names don't match any department:", ar: "أسماء الإدارات هذه لا تطابق أي إدارة:" })}
              </p>
              <ul className="mt-1 text-xs text-ink">
                {[...preview.unmatched.entries()].slice(0, 15).map(([name, n]) => (
                  <li key={name}>
                    “{name}” × {n}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">
                {loc({
                  en: "Fix the names in the file and upload again (the list of correct names is under the upload box), or add these people without a department. People without a department are left out of department response rates.",
                  ar: "صحّح الأسماء في الملف وارفعه من جديد (قائمة الأسماء الصحيحة تحت مربع الرفع)، أو أضف هؤلاء بلا إدارة. من بلا إدارة لا يُحسب في نسب استجابة الإدارات.",
                })}
              </p>
              <label className="mt-2 flex items-center gap-2 text-xs text-ink">
                <input type="checkbox" checked={allowUnmatched} onChange={(e) => setAllowUnmatched(e.target.checked)} />
                {loc({ en: "Add them without a department", ar: "أضفهم بلا إدارة" })}
              </label>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button disabled={blocked || !preview.valid} onClick={() => void upload()}>
              {loc({ en: `Save list (${preview.valid})`, ar: `حفظ القائمة (${preview.valid})` })}
            </Button>
            <Button variant="outline" onClick={() => setPreview(null)}>
              {loc({ en: "Cancel", ar: "إلغاء" })}
            </Button>
          </div>
        </div>
      ) : null}

      {progress ? (
        <div className="flex flex-col gap-2 text-sm" aria-live="polite">
          <Progress value={(progress.done / Math.max(1, progress.total)) * 100} />
          <p className="text-muted">
            {loc({
              en: `Saving ${progress.done.toLocaleString("en")} of ${progress.total.toLocaleString("en")}…`,
              ar: `جارٍ حفظ ${progress.done} من ${progress.total}…`,
            })}
          </p>
        </div>
      ) : null}

      {shownSummary && !progress && !preview ? (
        <div className={`mt-4 rounded-xl px-3 py-2 text-xs ${result ? "bg-score-good/10 text-ink" : "bg-sand-2 text-muted"}`} role="status">
          <p className="font-medium text-ink">
            {result ? loc({ en: "✓ Upload complete", ar: "✓ اكتمل الرفع" }) : loc({ en: "Last upload", ar: "آخر رفع" })} ·{" "}
            {fmt.format(new Date(shownSummary.at))}
          </p>
          <p className="mt-0.5">
            <span dir="ltr">{shownSummary.source}</span> · <span dir="ltr">{shownSummary.by}</span>
          </p>
          <p className="mt-0.5">
            {loc({
              en: `${shownSummary.added} added · ${shownSummary.skipped} already on the list · ${shownSummary.invalid} invalid${
                shownSummary.noDepartment + shownSummary.unmatched ? ` · ${shownSummary.noDepartment + shownSummary.unmatched} without department` : ""
              }`,
              ar: `أُضيف ${shownSummary.added} · موجود مسبقاً ${shownSummary.skipped} · غير صالح ${shownSummary.invalid}${
                shownSummary.noDepartment + shownSummary.unmatched ? ` · بلا إدارة ${shownSummary.noDepartment + shownSummary.unmatched}` : ""
              }`,
            })}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
