import { useEffect, useState } from "react";
import { requireSaved } from "@/components/save-bar";
import { Route as BuilderRoute } from "./builder";
import { Route as AppearanceRoute } from "./appearance";
import { createFileRoute } from "@tanstack/react-router";
import { FlaskConical, Link2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageFrame } from "@/components/page-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCensus } from "@/lib/census";
import { createDemoSurvey, createSurvey, deleteSurvey, setPublicSurvey } from "@/lib/pulse/api";
import { formatIsoDate, formatNumber, type SurveySummary } from "@/lib/pulse/config";
import { useSurveys } from "@/lib/pulse/surveys-store";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/settings/surveys")({
  validateSearch: (s: Record<string, unknown>): { new?: boolean } => (s.new === true || s.new === "true" || s.new === 1 ? { new: true } : {}),
  component: CombinedPage,
});

function SurveysPage() {
  const { loc, lang } = useT();
  const search = Route.useSearch();
  const { surveys, current, state, load, switchTo } = useSurveys();
  const { currentRole } = useCensus();
  const isSuper = currentRole === "super";
  const canEdit = currentRole === "super" || currentRole === "pc";
  const [showNew, setShowNew] = useState(Boolean(search.new));
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    void load(true);
  }, [load]);
  useEffect(() => {
    if (search.new) setShowNew(true);
  }, [search.new]);
  const demo = surveys.find((s) => s.isDemo);
  const num = (n: number) => formatNumber(n, lang);

  async function loadDemo() {
    setBusy("demo");
    try {
      const r = await createDemoSurvey();
      toast.success(loc({ en: `Demo survey ready with ${r.responses} sample answers.`, ar: `الاستبيان التجريبي جاهز بـ ${r.responses} إجابة تجريبية.` }));
      window.location.href = "/insights";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the demo");
      setBusy(null);
    }
  }

  return (
    <PageFrame
      title={loc({ en: "Surveys", ar: "الاستبيانات" })}
      hint={loc({
        en: "Each survey has its own questions, dates, look, invitation list and results. Organisation settings (names, branding, email, privacy rules, departments, users) are shared.",
        ar: "لكل استبيان أسئلته وتواريخه وشكله وقائمة دعواته ونتائجه. أما إعدادات الجهة (الأسماء والهوية والبريد وقواعد الخصوصية والأقسام والمستخدمون) فمشتركة.",
      })}
      actions={
        canEdit ? (
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="size-4" /> {loc({ en: "New survey", ar: "استبيان جديد" })}
          </Button>
        ) : null
      }
    >
      {showNew && canEdit ? <NewSurvey onCancel={() => setShowNew(false)} /> : null}

      <Card>
        <h2 className="text-sm font-semibold text-ink">{loc({ en: "All surveys", ar: "كل الاستبيانات" })}</h2>
        {state !== "ready" ? (
          <div className="mt-4 h-24 animate-pulse rounded-lg bg-sand-2" aria-busy="true" />
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {surveys.map((s) => (
              <SurveyRow
                key={s.id}
                s={s}
                isCurrent={s.id === current}
                isSuper={isSuper}
                canEdit={canEdit}
                busy={busy}
                setBusy={setBusy}
                onOpen={(then) => requireSaved() && void switchTo(s.id, then)}
                num={num}
              />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <FlaskConical className="size-4 text-accent" aria-hidden /> {loc({ en: "Demo survey", ar: "الاستبيان التجريبي" })}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {loc({
            en: "A finished past survey with realistic sample answers, so you can walk through every stage: questions, invitation list and sending history, reminders, results by department, comments, drivers and action plans. It is a separate survey, so it never mixes with real answers, and employees can never reach it.",
            ar: "استبيان سابق مكتمل بإجابات تجريبية واقعية، لتتمكن من المرور بكل المراحل: الأسئلة، وقائمة الدعوات وسجل الإرسال، والتذكيرات، والنتائج حسب القسم، والتعليقات، والمؤثرات، وخطط العمل. هو استبيان منفصل، فلا يختلط أبداً بالإجابات الحقيقية، ولا يمكن للموظفين الوصول إليه.",
          })}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {demo ? (
            <Button size="sm" variant="outline" onClick={() => requireSaved() && void switchTo(demo.id, "/insights")}>
              {loc({ en: "Open the demo results", ar: "فتح نتائج الاستبيان التجريبي" })}
            </Button>
          ) : canEdit ? (
            <Button size="sm" disabled={busy === "demo"} onClick={() => void loadDemo()}>
              {busy === "demo" ? loc({ en: "Creating… (about 20 seconds)", ar: "جارٍ الإنشاء… (حوالي 20 ثانية)" }) : loc({ en: "Load the demo survey", ar: "تحميل الاستبيان التجريبي" })}
            </Button>
          ) : null}
          {demo ? (
            <p className="self-center text-xs text-muted">
              {loc({ en: "To remove it, use Delete on its row above.", ar: "لحذفه استخدم زر الحذف في صفه أعلاه." })}
            </p>
          ) : null}
        </div>
      </Card>
    </PageFrame>
  );
}

function SurveyRow({
  s,
  isCurrent,
  isSuper,
  canEdit,
  busy,
  setBusy,
  onOpen,
  num,
}: {
  s: SurveySummary;
  isCurrent: boolean;
  isSuper: boolean;
  canEdit: boolean;
  busy: string | null;
  setBusy: (v: string | null) => void;
  onOpen: (then?: string) => void;
  num: (n: number) => string;
}) {
  const { loc, lang } = useT();
  const { load } = useSurveys();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const status =
    s.status === "open"
      ? loc({ en: "Open", ar: "مفتوح" })
      : s.status === "closed"
        ? loc({ en: "Closed", ar: "مغلق" })
        : s.status === "archived"
          ? loc({ en: "Archived", ar: "مؤرشف" })
          : loc({ en: "Draft", ar: "مسودة" });
  const dates =
    s.fieldOpen || s.fieldClose
      ? `${s.fieldOpen ? formatIsoDate(s.fieldOpen, lang) : "…"} – ${s.fieldClose ? formatIsoDate(s.fieldClose, lang) : "…"}`
      : loc({ en: "No dates yet", ar: "لا تواريخ بعد" });

  return (
    <li className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
          {loc(s.name)}
          {isCurrent ? <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-sand">{loc({ en: "Working on", ar: "قيد العمل" })}</span> : null}
          {s.isDemo ? <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-fg">{loc({ en: "Demo", ar: "تجريبي" })}</span> : null}
          {s.isPublicDefault ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sand-2 px-2 py-0.5 text-[11px] font-medium text-ink">
              <Link2 className="size-3" aria-hidden /> {loc({ en: "Opens from the plain survey link", ar: "يفتح من رابط الاستبيان العام" })}
            </span>
          ) : null}
        </p>
        <p className="mt-1 text-xs text-muted">
          {status} · {dates} · {loc({ en: `${num(s.responses)} answers`, ar: `${num(s.responses)} إجابة` })}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {!isCurrent ? (
          <Button size="sm" variant="outline" onClick={() => onOpen("/settings/builder")}>
            {loc({ en: "Work on this survey", ar: "العمل على هذا الاستبيان" })}
          </Button>
        ) : null}
        <Button size="sm" variant="outline" onClick={() => onOpen("/insights")}>
          {loc({ en: "Results", ar: "النتائج" })}
        </Button>
        {canEdit && !s.isDemo && !s.isPublicDefault ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy === `pub-${s.id}`}
            onClick={async () => {
              setBusy(`pub-${s.id}`);
              try {
                await setPublicSurvey({ data: { id: s.id } });
                toast.success(loc({ en: "The plain survey link and QR code now open this survey.", ar: "رابط الاستبيان العام ورمز QR يفتحان هذا الاستبيان الآن." }));
                await load(true);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusy(null);
              }
            }}
          >
            {loc({ en: "Use for the plain link", ar: "اجعله للرابط العام" })}
          </Button>
        ) : null}
        {isSuper && s.id !== "main" ? (
          confirming ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(`del-${s.id}`);
                try {
                  await deleteSurvey({ data: { id: s.id, confirm: "DELETE" } });
                  toast.success(loc({ en: "Survey deleted.", ar: "تم حذف الاستبيان." }));
                  if (isCurrent) window.location.reload();
                  else await load(true);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed");
                } finally {
                  setBusy(null);
                  setConfirming(false);
                }
              }}
            >
              <Label htmlFor={`del-${s.id}`} className="text-xs text-score-crit">
                {loc({ en: "Type DELETE to remove it with all its answers", ar: "اكتب DELETE لحذفه مع كل إجاباته" })}
              </Label>
              <Input id={`del-${s.id}`} dir="ltr" className="h-9 w-28" value={typed} onChange={(e) => setTyped(e.target.value)} />
              <Button size="sm" className="bg-score-crit text-paper hover:bg-score-crit/90" disabled={typed !== "DELETE" || busy === `del-${s.id}`}>
                {loc({ en: "Delete", ar: "حذف" })}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                {loc({ en: "Cancel", ar: "إلغاء" })}
              </Button>
            </form>
          ) : (
            <Button size="sm" variant="ghost" className="text-score-crit" onClick={() => setConfirming(true)} aria-label={loc({ en: `Delete ${loc(s.name)}`, ar: `حذف ${loc(s.name)}` })}>
              <Trash2 className="size-4" /> {loc({ en: "Delete", ar: "حذف" })}
            </Button>
          )
        ) : null}
      </div>
    </li>
  );
}

function NewSurvey({ onCancel }: { onCancel: () => void }) {
  const { loc } = useT();
  const [en, setEn] = useState("");
  const [ar, setAr] = useState("");
  const [start, setStart] = useState<"copy" | "standard">("copy");
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!en.trim()) return;
          setBusy(true);
          try {
            await createSurvey({ data: { name: { en: en.trim(), ar: ar.trim() }, start } });
            window.location.href = "/settings/builder";
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
            setBusy(false);
          }
        }}
      >
        <h2 className="text-sm font-semibold text-ink">{loc({ en: "New survey", ar: "استبيان جديد" })}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ns-en">{loc({ en: "Name (English)", ar: "الاسم (بالإنجليزية)" })}</Label>
            <Input id="ns-en" required value={en} onChange={(e) => setEn(e.target.value)} placeholder="Pulse check — Q1 2027" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ns-ar">{loc({ en: "Name (Arabic)", ar: "الاسم (بالعربية)" })}</Label>
            <Input id="ns-ar" dir="rtl" value={ar} onChange={(e) => setAr(e.target.value)} placeholder="استبيان نبض — الربع الأول 2027" />
          </div>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-ink">{loc({ en: "Start from", ar: "البدء من" })}</legend>
          {(
            [
              ["copy", { en: "A copy of the current survey's questions and look", ar: "نسخة من أسئلة الاستبيان الحالي وشكله" }],
              ["standard", { en: "The standard questionnaire", ar: "الاستبيان القياسي" }],
            ] as const
          ).map(([id, label]) => (
            <label key={id} className="flex items-center gap-2 text-sm text-fg">
              <input type="radio" name="ns-start" value={id} checked={start === id} onChange={() => setStart(id)} className="size-4 accent-[var(--color-ink)]" />
              {loc(label)}
            </label>
          ))}
          <p className="text-xs text-muted">
            {loc({
              en: "You can switch to any of the ready-made questionnaires (or your own Excel file) in the Survey builder afterwards.",
              ar: "يمكنك بعد ذلك التبديل إلى أي استبيان جاهز (أو ملف Excel خاص بك) من منشئ الاستبيان.",
            })}
          </p>
        </fieldset>
        <div className="flex gap-2">
          <Button disabled={busy || !en.trim()}>{busy ? loc({ en: "Creating…", ar: "جارٍ الإنشاء…" }) : loc({ en: "Create and open the builder", ar: "إنشاء وفتح منشئ الاستبيان" })}</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {loc({ en: "Cancel", ar: "إلغاء" })}
          </Button>
        </div>
      </form>
    </Card>
  );
}

const BuilderSection = BuilderRoute.options.component!;
const AppearanceSection = AppearanceRoute.options.component!;

/** All related pages on one page, one after another (no tabs). */
function CombinedPage() {
  return (
    <>
      <SurveysPage />
      <section id="questions">
        <BuilderSection />
      </section>
      <section id="look">
        <AppearanceSection />
      </section>
    </>
  );
}
