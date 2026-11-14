import { createFileRoute, Link } from "@tanstack/react-router";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageFrame } from "@/components/page-frame";
import { NeedResults } from "@/components/results";
import { Score } from "@/components/score";
import { Card } from "@/components/ui/card";
import { useCensus } from "@/lib/census";
import { canEditSettings } from "@/lib/pulse/config";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/insights/trends")({ component: TrendsPage });

function TrendsPage() {
  const { t, loc } = useT();
  const { likertDimensions, benchmarks, currentRole } = useCensus();
  const earlier = [...benchmarks.trend].filter((p) => Number.isFinite(p.year)).sort((a, b) => a.year - b.year);

  return (
    <PageFrame title={t("navTrends")} hint={earlier.length ? t("trendHint") : t("baselineOnly")}>
      <NeedResults>
        {(r) => {
          const thisYear = new Date(r.generatedAt).getFullYear();
          const series = [
            ...earlier.map((p) => ({ year: String(p.year), engagement: p.engagement, enps: p.enps, response: p.response })),
            { year: String(thisYear), engagement: Math.round(r.engagement.index), enps: r.enps?.score ?? null, response: r.rate },
          ];
          return (
            <>
              {earlier.length ? (
                <Card className="h-80">
                  <h2 className="mb-4 text-sm font-semibold text-ink">{loc({ en: "Across cycles", ar: "عبر الدورات" })}</h2>
                  <ResponsiveContainer width="100%" height="85%">
                    <LineChart data={series} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="year" tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[-100, 100]} tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "var(--color-paper)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="engagement" name={t("kpiEngage")} stroke="var(--color-accent)" strokeWidth={2.25} dot={{ r: 3 }} connectNulls />
                      <Line type="monotone" dataKey="enps" name={t("kpiEnps")} stroke="var(--color-ink)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      <Line type="monotone" dataKey="response" name={t("kpiResp")} stroke="var(--color-score-mid)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              ) : (
                <Card>
                  <p className="text-sm leading-relaxed text-muted">
                    {loc({
                      en: "No earlier cycle has been loaded, so there is no trend to draw. This cycle becomes the baseline. If {org} has results from an earlier survey, an administrator can enter them under Settings → Benchmarks & prior year.",
                      ar: "لم تُحمَّل دورة سابقة، فلا اتجاه يُرسم. هذه الدورة تصبح خط الأساس. إن كانت لدى المركز نتائج استبيان سابق فيمكن للمدير إدخالها من الإعدادات ← المقارنات والسنة السابقة.",
                    })}
                  </p>
                  {canEditSettings(currentRole) ? (
                    <Link to="/settings/benchmarks" className="mt-3 inline-block text-sm font-medium text-accent">
                      {t("setBench")}
                    </Link>
                  ) : null}
                </Card>
              )}
              <Card>
                <h2 className="mb-3 text-sm font-semibold text-ink">{loc({ en: "This cycle by dimension", ar: "هذه الدورة حسب البُعد" })}</h2>
                <ul className="flex flex-col">
                  {likertDimensions.map((d) => (
                    <li key={d.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                      <span className="text-sm">{loc(d.name)}</span>
                      <Score value={r.dimensions[d.id]?.score ?? null} size="sm" />
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          );
        }}
      </NeedResults>
    </PageFrame>
  );
}
