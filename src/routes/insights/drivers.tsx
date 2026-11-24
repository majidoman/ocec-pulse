import { Route as ActionsRoute } from "./actions";
import { createFileRoute } from "@tanstack/react-router";
import { BarList } from "@/components/bar-list";
import { PageFrame } from "@/components/page-frame";
import { NeedResults } from "@/components/results";
import { Score } from "@/components/score";
import { Card } from "@/components/ui/card";
import { useCensus } from "@/lib/census";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/insights/drivers")({ component: CombinedPage });

function DriversPage() {
  const { t, loc, lang } = useT();
  const { likertDimensions } = useCensus();

  return (
    <PageFrame
      title={t("navDrivers")}
      hint={loc({
        en: "Correlation between each dimension and eNPS. Higher means a stronger link with whether people recommend working here.",
        ar: "الارتباط بين كل بُعد ومؤشر التوصية. الأعلى يعني صلة أقوى بتوصية الموظفين بالعمل هنا.",
      })}
    >
      <NeedResults>
        {(r) => {
          if (!r.drivers) {
            return (
              <Card>
                <p className="text-sm leading-relaxed text-muted">
                  {loc({
                    en: "Driver analysis needs at least 10 responses that include the eNPS question. It appears automatically once there are enough.",
                    ar: "يحتاج تحليل المحركات إلى عشر إجابات على الأقل تتضمن سؤال التوصية. يظهر تلقائياً عند توفر العدد الكافي.",
                  })}
                </p>
              </Card>
            );
          }
          const ranked = r.drivers
            .map((d) => ({ ...d, def: likertDimensions.find((x) => x.id === d.dimension) }))
            .filter((d) => d.def);
          const chart = ranked.map((d) => ({ name: loc(d.def!.short), r: d.r }));
          const top = ranked.slice(0, 3);
          const max = Math.max(0.2, ...chart.map((c) => Math.abs(c.r)));
          return (
            <>
              <Card>
                <h2 className="mb-4 text-sm font-semibold text-ink">{t("driverR")}</h2>
                <BarList
                  max={Math.ceil(max * 10) / 10}
                  showScale={false}
                  items={ranked.map((d) => ({ id: d.dimension, label: loc(d.def!.short), value: Math.max(0, d.r), display: d.r.toFixed(2), color: "var(--color-primary)" }))}
                />
              </Card>
              <div className="grid gap-3 md:grid-cols-3">
                {top.map((d, i) => (
                  <Card key={d.dimension}>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">
                      {lang === "ar" ? `الرافعة ${i + 1}` : `Lever ${i + 1}`}
                    </p>
                    <h3 className="mt-2 font-display text-xl text-ink">{loc(d.def!.name)}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{loc(d.def!.blurb)}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-muted">r {d.r.toFixed(2)}</span>
                      <Score value={r.dimensions[d.dimension]?.score ?? null} size="sm" />
                    </div>
                  </Card>
                ))}
              </div>
              <Card>
                <p className="text-sm leading-relaxed text-muted">
                  {loc({
                    en: `Read the two numbers together: a dimension with a high correlation and a low score is where improvement is most likely to move eNPS. Correlation shows what moves together, not what causes what. Based on ${r.total} responses.`,
                    ar: `اقرأ الرقمين معاً: البُعد ذو الارتباط المرتفع والدرجة المنخفضة هو الأرجح أثراً على مؤشر التوصية عند تحسينه. الارتباط يبيّن ما يتحرك معاً لا ما يسبّب ماذا. بناءً على ${r.total} إجابة.`,
                  })}
                </p>
              </Card>
            </>
          );
        }}
      </NeedResults>
    </PageFrame>
  );
}

const ActionsSection = ActionsRoute.options.component!;

/** All related pages on one page, one after another (no tabs). */
function CombinedPage() {
  return (
    <>
      <DriversPage />
      <section id="actions">
        <ActionsSection />
      </section>
    </>
  );
}
