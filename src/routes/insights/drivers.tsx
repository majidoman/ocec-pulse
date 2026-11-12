import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageFrame } from "@/components/page-frame";
import { NeedResults } from "@/components/results";
import { Score } from "@/components/score";
import { Card } from "@/components/ui/card";
import { useCensus } from "@/lib/census";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/insights/drivers")({ component: DriversPage });

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
              <Card className="h-96">
                <h2 className="mb-4 text-sm font-semibold text-ink">{t("driverR")}</h2>
                <ResponsiveContainer width="100%" height="88%">
                  <BarChart data={chart} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid stroke="var(--color-border)" horizontal={false} />
                    <XAxis type="number" domain={[Math.min(0, ...chart.map((c) => c.r)), Math.ceil(max * 10) / 10]} tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={96} tick={{ fill: "var(--color-ink)", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                    <Tooltip contentStyle={{ background: "var(--color-paper)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="r" fill="var(--color-accent)" radius={[0, 4, 4, 0]} name={t("driverR")} />
                  </BarChart>
                </ResponsiveContainer>
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
