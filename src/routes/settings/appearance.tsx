import { createFileRoute } from "@tanstack/react-router";
import { Check, ExternalLink } from "lucide-react";
import { PreviewFooter, SurveyTabs } from "@/components/survey-tabs";
import { PageFrame } from "@/components/page-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { THEMES, themeStyle } from "@/lib/pulse/themes";
import { openSurveyPreview } from "@/lib/pulse/preview";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/settings/appearance")({ component: AppearancePage });

function AppearancePage() {
  const { loc } = useT();
  const p = useSettings((s) => s.presentation);
  const patch = useSettings((s) => s.patchPresentation);
  const dimensions = useSettings((s) => s.dimensions);
  const patchDimension = useSettings((s) => s.patchDimension);
  const visible = dimensions.filter((d) => d.visible && !d.archived && d.kind === "likert");
  const gridCount = visible.filter((d) => d.display === "matrix").length;

  return (
    <PageFrame
      title={loc({ en: "Look & layout", ar: "الشكل والتخطيط" })}
      hint={loc({
        en: "How the survey looks to employees. Results dashboards keep the standard look.",
        ar: "كيف يظهر الاستبيان للموظفين. تبقى لوحات النتائج بالشكل المعتاد.",
      })}
    >
      <SurveyTabs />
      <Card>
        <h2 className="text-sm font-semibold text-ink">{loc({ en: "Theme", ar: "الثيم" })}</h2>
        <p className="mt-1 text-sm text-muted">
          {loc({
            en: "Every theme passes the WCAG AA contrast check. High contrast suits people with low vision; Night suits screens used in the dark.",
            ar: "كل الثيمات تجتاز فحص التباين WCAG AA. التباين العالي يناسب ضعاف البصر، والليلي يناسب الشاشات في الإضاءة الخافتة.",
          })}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label={loc({ en: "Theme", ar: "الثيم" })}>
          {THEMES.map((th) => {
            const selected = p.theme === th.id;
            return (
              <div key={th.id} className={`flex flex-col overflow-hidden rounded-xl border ${selected ? "border-ink ring-2 ring-ink" : "border-border"}`}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => patch({ theme: th.id })}
                  className="flex flex-col text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div style={themeStyle(th.id)} className="flex flex-col gap-2 bg-sand p-3" aria-hidden>
                    <div className="h-2 w-16 rounded-full bg-ink" />
                    <div className="rounded-lg bg-paper p-2 shadow-[var(--shadow-border)]">
                      <div className="h-1.5 w-24 rounded-full bg-fg/70" />
                      <div className="mt-2 grid grid-cols-5 gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} className={`h-4 rounded ${n === 4 ? "bg-ink" : "border border-border-strong bg-paper"}`} />
                        ))}
                      </div>
                    </div>
                    <div className="h-5 rounded-md bg-ink" />
                  </div>
                  <span className="flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-ink">
                    {loc(th.name)}
                    {selected ? <Check className="size-4 text-accent" aria-hidden /> : null}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-ink">{loc({ en: "Pages", ar: "الصفحات" })}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2" role="radiogroup" aria-label={loc({ en: "Pages", ar: "الصفحات" })}>
          {(
            [
              {
                id: "section",
                title: { en: "One section per page", ar: "قسم في كل صفحة" },
                body: {
                  en: "Recommended for longer surveys (over 20 questions). Shorter pages, a clear sense of progress, and each page is checked before moving on.",
                  ar: "موصى به للاستبيانات الطويلة (أكثر من ٢٠ سؤالاً). صفحات أقصر وإحساس واضح بالتقدم، وتُراجع كل صفحة قبل الانتقال.",
                },
              },
              {
                id: "single",
                title: { en: "Everything on one page", ar: "كل الأسئلة في صفحة واحدة" },
                body: {
                  en: "Best for short surveys. One scroll, one Submit button; on Submit the page jumps to any unanswered question.",
                  ar: "الأنسب للاستبيانات القصيرة. تمرير واحد وزر إرسال واحد؛ وعند الإرسال تنتقل الصفحة إلى أي سؤال بلا إجابة.",
                },
              },
            ] as const
          ).map((m) => {
            const selected = p.pageMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => patch({ pageMode: m.id })}
                className={`rounded-xl border p-4 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-ink ring-2 ring-ink" : "border-border hover:bg-sand-2"}`}
              >
                <span className="flex items-center justify-between text-sm font-semibold text-ink">
                  {loc(m.title)}
                  {selected ? <Check className="size-4 text-accent" aria-hidden /> : null}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">{loc(m.body)}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-ink">{loc({ en: "Question grids", ar: "مصفوفة الأسئلة" })}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {loc({
            en: "Shows a section's agree questions as one table: a row per question, a column per point of the 1–5 scale. Phones always get one card per question, because grids are hard to use on a small screen. Keep grids to about 8 questions; very long grids invite the same answer all the way down.",
            ar: "يعرض أسئلة الموافقة في القسم كجدول واحد: صف لكل سؤال وعمود لكل درجة من ١ إلى ٥. على الجوال تظهر دائماً بطاقة لكل سؤال لأن الجداول صعبة على الشاشة الصغيرة. يُفضّل ألا يزيد الجدول على ٨ أسئلة تقريباً؛ فالجداول الطويلة تدفع إلى اختيار الإجابة نفسها لكل الأسئلة.",
          })}
        </p>
        <p className="mt-3 text-sm text-ink">
          {loc({
            en: `${gridCount} of ${visible.length} sections shown as a grid. Change one section in the Survey builder.`,
            ar: `${gridCount} من ${visible.length} أقسام تُعرض كمصفوفة. لتغيير قسم واحد استخدم منشئ الاستبيان.`,
          })}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => visible.forEach((d) => patchDimension(d.id, { display: "matrix" }))}>
            {loc({ en: "Show every section as a grid", ar: "عرض كل الأقسام كمصفوفة" })}
          </Button>
          <Button size="sm" variant="outline" onClick={() => visible.forEach((d) => patchDimension(d.id, { display: "cards" }))}>
            {loc({ en: "Show every section as cards", ar: "عرض كل الأقسام كبطاقات" })}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted">
          {loc({ en: "Only the layout changes, so this can be switched even while the survey is open; answers stay comparable.", ar: "يتغيّر العرض فقط، لذلك يمكن تبديله حتى أثناء فتح الاستبيان؛ وتبقى الإجابات قابلة للمقارنة." })}
        </p>
      </Card>
      <PreviewFooter />
    </PageFrame>
  );
}
