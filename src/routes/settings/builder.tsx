import { useMemo, useState } from "react";
import { redirect, createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageFrame } from "@/components/page-frame";
import { QuestionnaireImport } from "@/components/questionnaire-import";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { questionsFor } from "@/lib/census";
import { SurveySwitcher } from "@/components/survey-switcher";
import { FILE_GROUPS, FILE_LIMIT_MB, FILES_MAX, fileRules } from "@/lib/pulse/files";
import { openSurveyPreview } from "@/lib/pulse/preview";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";
import type { Dimension, Question, QuestionType } from "@/lib/types";

export const Route = createFileRoute("/settings/builder")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/surveys", hash: "questions" });
  }, component: BuilderPage });

function BuilderPage() {
  const { t, loc, lang } = useT();
  const dimensions = useSettings((s) => s.dimensions);
  const questions = useSettings((s) => s.questions);
  const status = useSettings((s) => s.instrumentStatus);
  const patchDimension = useSettings((s) => s.patchDimension);
  const setDimensions = useSettings((s) => s.setDimensions);
  const addDimension = useSettings((s) => s.addDimension);
  const patchQuestion = useSettings((s) => s.patchQuestion);
  const addQuestion = useSettings((s) => s.addQuestion);
  const removeQuestion = useSettings((s) => s.removeQuestion);
  const freeze = useSettings((s) => s.freezeInstrument);
  const cloneCycle = useSettings((s) => s.cloneCycle);
  const changelog = useSettings((s) => s.changelog);
  const locked = status === "frozen";
  const [active, setActive] = useState(dimensions[0]?.id ?? "");
  const dim = dimensions.find((d) => d.id === active);
  const items = dim ? questionsFor(dim, questions) : [];
  const ordered = useMemo(() => [...dimensions].sort((a, b) => a.order - b.order), [dimensions]);

  function moveDim(id: string, dir: -1 | 1) {
    const list = [...ordered];
    const i = list.findIndex((d) => d.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    const tmp = list[i].order;
    list[i] = { ...list[i], order: list[j].order };
    list[j] = { ...list[j], order: tmp };
    setDimensions(list);
  }

  function downloadBank() {
    const blob = new Blob([JSON.stringify({ dimensions, questions }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "questionnaire.json";
    a.click();
  }

  return (
    <PageFrame
      title={t("setBuilder")}
      hint={locked ? t("lockedHint") : t("settingsHint")}
      actions={
        <div className="flex flex-wrap gap-2">
          <SurveySwitcher />
          <Button size="sm" variant="outline" onClick={downloadBank}>
            {t("exportJson")}
          </Button>
          {locked ? (
            <Button size="sm" variant="outline" onClick={() => cloneCycle()}>
              {t("cloneCycle")}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                const r = freeze();
                if (!r.ok) toast.error(loc(r.error));
                else toast.success(t("frozen"));
              }}
            >
              {t("freeze")}
            </Button>
          )}
        </div>
      }
    >
      <p className="text-sm text-muted">
        {ordered.filter((d) => d.visible).length} {t("dimensionOf")} · {questions.filter((q) => q.visible).length}{" "}
        {t("questions")} · {status === "frozen" ? t("frozen") : t("draftBank")}
      </p>

      <QuestionnaireImport />


      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <h2 className="mb-3 text-sm font-semibold">{t("dimensionOf")}</h2>
          <ul className="flex flex-col gap-1">
            {ordered.map((d) => (
              <li key={d.id}>
                <div
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-start text-sm ${active === d.id ? "bg-sand-2 font-medium text-ink" : "text-muted hover:bg-sand-2"}`}
                >
                  <button type="button" className="min-w-0 flex-1 text-start" onClick={() => setActive(d.id)}>
                    {d.order}. {loc(d.short)}
                    {!d.visible ? " · —" : ""}
                  </button>
                  <span className="flex gap-1">
                    <button type="button" className="p-1" disabled={locked} onClick={() => moveDim(d.id, -1)}>
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button type="button" className="p-1" disabled={locked} onClick={() => moveDim(d.id, 1)}>
                      <ArrowDown className="size-3.5" />
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <Button
            className="mt-3 w-full"
            variant="outline"
            disabled={locked}
            onClick={() => {
              const id = `dim-${Date.now()}`;
              const d: Dimension = {
                id,
                name: { en: "New dimension", ar: "بُعد جديد" },
                short: { en: "New", ar: "جديد" },
                blurb: { en: "", ar: "" },
                visible: true,
                archived: false,
                order: ordered.length + 1,
                kind: "likert",
              };
              addDimension(d);
              setActive(id);
            }}
          >
            {t("addDimension")}
          </Button>
        </Card>

        <div className="flex flex-col gap-3 lg:col-span-8">
          {dim ? (
            <Card className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input disabled={locked} value={dim.name.en} onChange={(e) => patchDimension(dim.id, { name: { ...dim.name, en: e.target.value } })} />
                <Input disabled={locked} dir="rtl" value={dim.name.ar} onChange={(e) => patchDimension(dim.id, { name: { ...dim.name, ar: e.target.value } })} />
                <Input disabled={locked} value={dim.short.en} onChange={(e) => patchDimension(dim.id, { short: { ...dim.short, en: e.target.value } })} />
                <Input disabled={locked} dir="rtl" value={dim.short.ar} onChange={(e) => patchDimension(dim.id, { short: { ...dim.short, ar: e.target.value } })} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm">{lang === "ar" ? "ظاهر" : "Visible"}</span>
                <Switch checked={dim.visible} disabled={locked} onCheckedChange={(v) => patchDimension(dim.id, { visible: v })} />
              </div>
              {dim.kind === "likert" ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm">{loc({ en: "Show questions as", ar: "عرض الأسئلة" })}</span>
                  <div className="inline-flex rounded-lg border border-border p-0.5" role="radiogroup" aria-label={loc({ en: "Show questions as", ar: "عرض الأسئلة" })}>
                    {(
                      [
                        ["cards", { en: "Cards", ar: "بطاقات" }],
                        ["matrix", { en: "Grid (1–5)", ar: "مصفوفة (1–5)" }],
                      ] as const
                    ).map(([id, label]) => {
                      const on = (dim.display ?? "cards") === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => patchDimension(dim.id, { display: id })}
                          className={`rounded-md px-3 py-1.5 text-sm ${on ? "bg-ink text-sand" : "text-muted hover:bg-sand-2"}`}
                        >
                          {loc(label)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm">
                  {loc({
                    en: `Required answers: ${items.filter((q) => q.required).length} of ${items.length}`,
                    ar: `الإجابات الإجبارية: ${items.filter((q) => q.required).length} من ${items.length}`,
                  })}
                </span>
                <span className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={locked} onClick={() => items.forEach((q) => patchQuestion(q.id, { required: true }))}>
                    {loc({ en: "Make all required", ar: "اجعل الكل إجبارياً" })}
                  </Button>
                  <Button size="sm" variant="outline" disabled={locked} onClick={() => items.forEach((q) => patchQuestion(q.id, { required: false }))}>
                    {loc({ en: "Make all optional", ar: "اجعل الكل اختيارياً" })}
                  </Button>
                </span>
              </div>
            </Card>
          ) : null}

          {items.map((q) => (
            <QuestionEditor key={q.id} q={q} locked={locked} onPatch={(p) => patchQuestion(q.id, p)} onRemove={() => removeQuestion(q.id)} />
          ))}

          {dim && !locked ? (
            <Button
              variant="outline"
              onClick={() => {
                const q: Question = {
                  id: `Q${Date.now()}`,
                  dimension: dim.id,
                  type: dim.kind === "enps" ? "enps" : "likert",
                  text: { en: "", ar: "" },
                  required: true,
                  visible: true,
                  order: questions.length,
                };
                addQuestion(q);
              }}
            >
              {t("addItem")}
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <h2 className="mb-2 text-sm font-semibold">Change log</h2>
        <ul className="text-sm text-muted">
          {changelog.slice(0, 8).map((c) => (
            <li key={c.id} className="border-b border-border py-2">
              {loc(c.summary)}
            </li>
          ))}
        </ul>
      </Card>
    </PageFrame>
  );
}

function QuestionEditor({
  q,
  locked,
  onPatch,
  onRemove,
}: {
  q: Question;
  locked: boolean;
  onPatch: (p: Partial<Question>) => void;
  onRemove: () => void;
}) {
  const { t, loc } = useT();
  const missing = !q.text.en.trim() || !q.text.ar.trim();
  return (
    <Card className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs tabular-nums text-subtle">{q.id}</span>
        {missing ? <span className="text-xs text-score-crit">{t("missingLang")}</span> : null}
      </div>
      <Textarea disabled={locked} value={q.text.en} onChange={(e) => onPatch({ text: { ...q.text, en: e.target.value } })} />
      <Textarea disabled={locked} dir="rtl" value={q.text.ar} onChange={(e) => onPatch({ text: { ...q.text, ar: e.target.value } })} />
      <div className="grid gap-3 sm:grid-cols-3">
        <select
          disabled={locked}
          className="h-11 rounded-md border border-border bg-paper px-3 text-sm"
          value={q.type}
          onChange={(e) => onPatch({ type: e.target.value as QuestionType })}
        >
          <option value="likert">Likert 5</option>
          <option value="enps">eNPS 0–10</option>
          <option value="choice">Single choice</option>
          <option value="multi">Multi choice</option>
          <option value="short">Short text</option>
          <option value="long">Long text</option>
          <option value="text">Comment</option>
          <option value="file">{loc({ en: "File upload", ar: "رفع ملف" })}</option>
        </select>
        <label className="flex h-11 items-center justify-between gap-2 rounded-md border border-border px-3 text-sm">
          {t("requiredMark")}
          <Switch checked={q.required} disabled={locked} onCheckedChange={(v) => onPatch({ required: v })} />
        </label>
        <label className="flex h-11 items-center justify-between gap-2 rounded-md border border-border px-3 text-sm">
          Reverse
          <Switch checked={!!q.reverse} disabled={locked} onCheckedChange={(v) => onPatch({ reverse: v })} />
        </label>
      </div>
      {q.type === "file" ? <FileSettings q={q} locked={locked} onPatch={onPatch} /> : null}
      {!locked ? (
        <Button size="sm" variant="ghost" onClick={onRemove}>
          {t("close")}
        </Button>
      ) : null}
    </Card>
  );
}

/** Allowed kinds, size and number of files for a "file upload" question. */
function FileSettings({ q, locked, onPatch }: { q: Question; locked: boolean; onPatch: (p: Partial<Question>) => void }) {
  const { loc } = useT();
  const rules = fileRules(q);
  const toggle = (exts: string[], on: boolean) => {
    const next = on ? [...new Set([...rules.types, ...exts])] : rules.types.filter((e) => !exts.includes(e));
    if (next.length) onPatch({ fileTypes: next });
  };
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-sand p-3">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">{loc({ en: "Accepted files", ar: "الملفات المقبولة" })}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {FILE_GROUPS.map((g) => {
            const on = g.exts.every((e) => rules.types.includes(e));
            return (
              <label key={g.id} className="flex items-center gap-2 text-sm text-fg">
                <input type="checkbox" disabled={locked} checked={on} onChange={(e) => toggle(g.exts, e.target.checked)} className="size-4 accent-[var(--color-ink)]" />
                {loc(g.label)}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-fg">
          {loc({ en: "Largest file", ar: "أكبر حجم للملف" })}
          <select
            disabled={locked}
            className="h-9 rounded-md border border-border bg-paper px-2 text-sm"
            value={String(rules.maxMb)}
            onChange={(e) => onPatch({ maxSizeMb: Number(e.target.value) })}
          >
            {[0.5, 1, 2, 3, FILE_LIMIT_MB].map((n) => (
              <option key={n} value={String(n)}>
                {n} MB
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-fg">
          {loc({ en: "Files per person", ar: "عدد الملفات للشخص" })}
          <select
            disabled={locked}
            className="h-9 rounded-md border border-border bg-paper px-2 text-sm"
            value={String(rules.maxFiles)}
            onChange={(e) => onPatch({ maxFiles: Number(e.target.value) })}
          >
            {Array.from({ length: FILES_MAX }, (_, i) => i + 1).map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs leading-relaxed text-muted">
        {loc({
          en: `Programs, scripts and web pages are never accepted, and each file is checked to be what its name says. The hosting limit is ${FILE_LIMIT_MB} MB per file. Files are kept apart from the person's answers, like comments, and only People & Culture, executives and (for their own department) department heads can download them. Remind people that a document or photo can carry their name.`,
          ar: `لا تُقبل البرامج أو النصوص البرمجية أو صفحات الويب أبداً، ويُفحص كل ملف للتأكد من أنه كما يدل اسمه. الحد الأقصى للاستضافة ${FILE_LIMIT_MB} ميغابايت للملف. تُحفظ الملفات منفصلة عن إجابات الشخص مثل التعليقات، ولا يحمّلها إلا الموارد البشرية والقيادة التنفيذية ورؤساء الأقسام (لقسمهم فقط). ذكّر الموظفين بأن المستند أو الصورة قد يحمل اسمهم.`,
        })}
      </p>
    </div>
  );
}
