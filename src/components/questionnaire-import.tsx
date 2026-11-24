import { useEffect, useRef, useState } from "react";
import { requireSaved } from "@/components/save-bar";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Library, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAdminConfig, getQuestionnaireImportState, importQuestionnaire, restoreQuestionnaireBackup } from "@/lib/pulse/api";
import { formatIsoDate, formatNumber } from "@/lib/pulse/config";
import { parseQuestionnaire, type ImportResult } from "@/lib/pulse/questionnaire-import";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

type ImportState = Awaited<ReturnType<typeof getQuestionnaireImportState>>;

/** One ready-made questionnaire shipped in public/templates/library (index.json, built by templates/questionnaires/build.py). */
interface LibraryItem {
  file: string;
  name: { en: string; ar: string };
  purpose: { en: string; ar: string };
  minutes: string;
  questions: number;
  sections: number;
}

/** Upload a questionnaire workbook, check it, and replace the survey questions (with a backup). */
export function QuestionnaireImport() {
  const { loc, lang } = useT();
  const hydrateAdmin = useSettings((s) => s.hydrateAdmin);
  const [state, setState] = useState<ImportState | null>(null);
  const [file, setFile] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const refresh = () =>
    getQuestionnaireImportState()
      .then(setState)
      .catch(() => setState(null));
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  useEffect(() => {
    void refresh();
    fetch("/templates/library/index.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((items: LibraryItem[]) => setLibrary(Array.isArray(items) ? items : []))
      .catch(() => setLibrary([]));
  }, []);

  /** Loads a ready-made questionnaire through the same check as an uploaded file. */
  async function pick(item: LibraryItem) {
    try {
      const res = await fetch(`/templates/library/${item.file}`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      await read(new File([blob], item.file, { type: blob.type }));
      requestAnimationFrame(() => document.getElementById("questionnaire-check")?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    } catch {
      toast.error(loc({ en: "This questionnaire could not be loaded.", ar: "تعذّر تحميل هذا الاستبيان." }));
    }
  }

  async function reloadSettings() {
    const config = await getAdminConfig();
    hydrateAdmin(config);
  }

  async function read(f: File) {
    setConfirming(false);
    setResult(null);
    setFile(f.name);
    if (!/\.xlsx$/i.test(f.name)) {
      toast.error(loc({ en: "Choose an Excel file (.xlsx), starting from the template.", ar: "اختر ملف إكسل (.xlsx) مبنياً على القالب." }));
      return;
    }
    try {
      const { default: readXlsxFile } = await import("read-excel-file/universal");
      const sheets = (await readXlsxFile(f)) as { sheet: string; data: unknown[][] }[];
      const named = (re: RegExp) => sheets.find((s) => re.test(s.sheet));
      const questions =
        named(/^(questions|الأسئلة)$/i) ??
        sheets.find((s) => s.data.some((r) => r.some((c) => /question.*\(en/i.test(String(c ?? ""))))) ??
        sheets[0];
      const survey = named(/^(survey|الاستبيان)$/i);
      setResult(parseQuestionnaire(questions?.data ?? [], survey?.data ?? null));
    } catch {
      toast.error(loc({ en: "This file could not be read. Save it again as .xlsx and retry.", ar: "تعذّرت قراءة الملف. احفظه مجدداً بصيغة .xlsx وأعد المحاولة." }));
    }
  }

  async function replace() {
    if (!result?.data || !file) return;
    setBusy(true);
    try {
      if (!requireSaved()) return; // unsaved edits would overwrite the import afterwards
      await importQuestionnaire({
        data: { fileName: file, surveyName: result.data.surveyName, dimensions: result.data.dimensions, questions: result.data.questions },
      });
      await reloadSettings();
      toast.success(loc({ en: "Questions replaced. The previous set is kept as a backup.", ar: "تم استبدال الأسئلة، وحُفظت المجموعة السابقة نسخة احتياطية." }));
      setResult(null);
      setFile(null);
      setConfirming(false);
      if (input.current) input.current.value = "";
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : loc({ en: "Could not replace the questions.", ar: "تعذّر استبدال الأسئلة." }));
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    setBusy(true);
    try {
      if (!requireSaved()) return;
      await restoreQuestionnaireBackup();
      await reloadSettings();
      toast.success(loc({ en: "The previous questions are back.", ar: "عادت الأسئلة السابقة." }));
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : loc({ en: "Could not go back.", ar: "تعذّر الرجوع." }));
    } finally {
      setBusy(false);
    }
  }

  const n = (x: number) => formatNumber(x, lang);
  const blocked = state ? state.answers > 0 || state.locked : false;
  const data = result?.data ?? null;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <FileSpreadsheet className="size-4 text-accent" aria-hidden />
            {loc({ en: "Import questions from Excel", ar: "استيراد الأسئلة من إكسل" })}
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted">
            {loc({
              en: "Replace all sections and questions with a prepared workbook. You will see a check of the file before anything changes.",
              ar: "استبدل كل الأقسام والأسئلة بملف جاهز. سترى فحصاً للملف قبل أي تغيير.",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href="/templates/pulse-questions-template.xlsx" download>
              <Download className="size-4" aria-hidden /> {loc({ en: "Blank template", ar: "قالب فارغ" })}
            </a>
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
            <Upload className="size-4" aria-hidden /> {loc({ en: "Choose Excel file", ar: "اختر ملف إكسل" })}
          </Button>
          <input
            ref={input}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            aria-label={loc({ en: "Excel file with survey questions", ar: "ملف إكسل بأسئلة الاستبيان" })}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void read(f);
            }}
          />
        </div>
      </div>

      {state && blocked ? (
        <p className="mt-3 flex gap-2 rounded-md bg-sand-2 px-3 py-2 text-sm text-ink" role="status">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-score-mid" aria-hidden />
          {state.answers > 0
            ? loc({
                en: `This survey already has ${state.answers} answer(s), so its questions cannot be replaced. You can still check a file.`,
                ar: `في هذا الاستبيان ${n(state.answers)} إجابة، لذلك لا يمكن استبدال أسئلته. ما زال بإمكانك فحص ملف.`,
              })
            : loc({
                en: 'The questions are locked. Press "Unlock to edit" above before importing.',
                ar: 'الأسئلة مقفلة. اضغط "فتح للتعديل" في الأعلى قبل الاستيراد.',
              })}
        </p>
      ) : null}

      {library.length ? (
        <details className="group mt-4 border-t border-border pt-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
            <Library className="size-4 text-accent" aria-hidden />
            {loc({ en: `Ready-made questionnaires (${n(library.length)})`, ar: `استبيانات جاهزة (${n(library.length)})` })}
            <span className="text-xs font-normal text-muted group-open:hidden">{loc({ en: "Show", ar: "عرض" })}</span>
          </summary>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {library.map((item) => (
              <li key={item.file} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-ink">{loc(item.name)}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{loc(item.purpose)}</p>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-xs text-muted">
                    {loc({
                      en: `${n(item.questions)} questions · about ${item.minutes} min`,
                      ar: `${n(item.questions)} سؤالاً · حوالي ${item.minutes} دقيقة`,
                    })}
                  </span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" asChild>
                      <a href={`/templates/library/${item.file}`} download aria-label={loc({ en: `Download ${item.name.en}`, ar: `تنزيل ${item.name.ar}` })}>
                        <Download className="size-4" aria-hidden />
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void pick(item)}>
                      {loc({ en: "Check and use", ar: "فحص واستخدام" })}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {result ? (
        <div id="questionnaire-check" className="mt-4 border-t border-border pt-4" aria-live="polite">
          <p className="text-sm font-medium text-ink">
            <bdi dir="ltr">{file}</bdi>
          </p>
          {data ? (
            <>
              <p className="mt-1 flex items-center gap-2 text-sm text-ink">
                <CheckCircle2 className="size-4 text-score-good" aria-hidden />
                {loc({
                  en: `Ready: ${data.counts.sections} sections, ${data.counts.scale} agree 1–5 questions, ${data.counts.enps} recommend 0–10, ${data.counts.comments} comment questions.`,
                  ar: `جاهز: ${n(data.counts.sections)} أقسام، ${n(data.counts.scale)} سؤال موافقة 1–5، ${n(data.counts.enps)} سؤال توصية 0–10، ${n(data.counts.comments)} أسئلة تعليق.`,
                })}
              </p>
              {data.surveyName ? (
                <p className="mt-1 text-sm text-muted">
                  {loc({ en: "Survey name will become:", ar: "سيصبح اسم الاستبيان:" })} <span className="text-ink">{loc(data.surveyName)}</span>
                </p>
              ) : null}
              <ol className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                {data.dimensions.map((d) => (
                  <li key={d.id} className="flex justify-between gap-3 rounded-md bg-sand-2 px-3 py-1.5">
                    <span className="truncate text-ink">{loc(d.name)}</span>
                    <span className="shrink-0 tabular-nums text-muted">{n(data.questions.filter((q) => q.dimension === d.id).length)}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : null}

          {result.errors.length ? (
            <div className="mt-3">
              <p className="text-sm font-medium text-score-crit">
                {loc({ en: `Fix ${result.errors.length} problem(s) in the file, then choose it again:`, ar: `صحّح ${n(result.errors.length)} خطأ في الملف ثم اختره مجدداً:` })}
              </p>
              <ul className="mt-1 flex flex-col gap-1 text-sm text-ink">
                {result.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>
                    {e.row ? <span className="me-1 text-muted">{loc({ en: `Row ${e.row}:`, ar: `الصف ${n(e.row)}:` })}</span> : null}
                    {loc(e)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {result.warnings.length ? (
            <ul className="mt-3 flex flex-col gap-1 text-sm text-muted">
              {result.warnings.slice(0, 10).map((w, i) => (
                <li key={i}>
                  ⚠ {w.row ? loc({ en: `Row ${w.row}: `, ar: `الصف ${n(w.row)}: ` }) : ""}
                  {loc(w)}
                </li>
              ))}
            </ul>
          ) : null}

          {data && !blocked ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {confirming ? (
                <>
                  <span className="text-sm text-ink">
                    {loc({ en: "All current sections and questions will be replaced.", ar: "ستُستبدل كل الأقسام والأسئلة الحالية." })}
                  </span>
                  <Button size="sm" disabled={busy} onClick={() => void replace()}>
                    {loc({ en: "Yes, replace the questions", ar: "نعم، استبدل الأسئلة" })}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
                    {loc({ en: "Cancel", ar: "إلغاء" })}
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setConfirming(true)}>
                  {loc({ en: "Replace the questions", ar: "استبدال الأسئلة" })}
                </Button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {state?.backup && !blocked ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm text-muted">
          <span>
            {loc({ en: "Earlier questions saved on", ar: "الأسئلة السابقة محفوظة بتاريخ" })} {formatIsoDate(state.backup.at.slice(0, 10), lang)} (
            {n(state.backup.questions)} {loc({ en: "questions", ar: "سؤالاً" })})
          </span>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void restore()}>
            <RotateCcw className="size-4" aria-hidden /> {loc({ en: "Go back to them", ar: "الرجوع إليها" })}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
