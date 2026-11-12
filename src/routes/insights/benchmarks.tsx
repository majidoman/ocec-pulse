import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageFrame } from "@/components/page-frame";
import { NeedResults } from "@/components/results";
import { Score } from "@/components/score";
import { Card } from "@/components/ui/card";
import { useCensus } from "@/lib/census";
import { canEditSettings } from "@/lib/pulse/config";
import { signed } from "@/lib/pulse/format";
import { useT } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/insights/benchmarks")({ component: BenchmarksPage });

function BenchmarksPage() {
  const { t, loc } = useT();
  const { likertDimensions, benchmarks, currentRole, orgName } = useCensus();
  // A comparator is shown only when it has both a score and a named source.
  const sources = benchmarks.sources.filter((s) => s.score !== null && Number.isFinite(s.score) && s.licence.trim());

  return (
    <PageFrame title={t("navBench")} hint={t("benchHint")}>
      <NeedResults>
        {(r) => {
          if (!sources.length) {
            return (
              <Card>
                <p className="text-sm leading-relaxed text-muted">
                  {loc({
                    en: "No external benchmark has been entered. Benchmarks are shown only when a score comes with a named source, so nothing here is ever an invented comparison.",
                    ar: "لم تُدخل مقارنة خارجية. تُعرض المقارنات فقط عندما تأتي الدرجة مع مصدر مسمّى، فلا شيء هنا مقارنة مختلقة.",
                  })}
                </p>
                {canEditSettings(currentRole) ? (
                  <Link to="/settings/benchmarks" className="mt-3 inline-block text-sm font-medium text-accent">
                    {t("setBench")}
                  </Link>
                ) : null}
              </Card>
            );
          }
          const chart = [
            { name: loc(orgName), score: Math.round(r.engagement.index) },
            ...sources.map((s) => ({ name: loc(s.name), score: s.score as number })),
          ];
          const withDims = sources.filter((s) => s.dimensions && Object.keys(s.dimensions).length);
          return (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {sources.slice(0, 4).map((s) => {
                  const gap = r.engagement.index - (s.score as number);
                  return (
                    <Card key={s.id}>
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">{loc(s.name)}</p>
                      <p className={cn("mt-2 font-display text-3xl tabular-nums", gap >= 0 ? "text-score-high" : "text-score-crit")}>{signed(gap, 1)}</p>
                      <p className="mt-1 text-xs text-muted">
                        {s.score} · {s.year}
                      </p>
                    </Card>
                  );
                })}
              </div>
              <Card className="h-80">
                <h2 className="mb-4 text-sm font-semibold text-ink">{t("kpiEngage")}</h2>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={chart} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                    <CartesianGrid stroke="var(--color-border)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={150} tick={{ fill: "var(--color-ink)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--color-paper)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="score" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              {withDims.length ? (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[40rem] text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted">
                          <th className="py-2 pe-3 text-start font-medium">{t("dimensionOf")}</th>
                          <th className="px-2 py-2 text-end font-medium">{t("thisCycle")}</th>
                          {withDims.map((s) => (
                            <th key={s.id} className="px-2 py-2 text-end font-medium">
                              {loc(s.name)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {likertDimensions.map((d) => {
                          const own = r.dimensions[d.id]?.score ?? null;
                          return (
                            <tr key={d.id} className="border-b border-border last:border-0">
                              <td className="py-2.5 pe-3 text-ink">{loc(d.short)}</td>
                              <td className="px-2 py-2.5 text-end">
                                <Score value={own} size="sm" />
                              </td>
                              {withDims.map((s) => {
                                const v = s.dimensions?.[d.id];
                                return (
                                  <td key={s.id} className={cn("px-2 py-2.5 text-end tabular-nums", typeof v !== "number" || own === null ? "text-subtle" : own >= v ? "text-score-high" : "text-score-crit")}>
                                    {typeof v === "number" ? v : "—"}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : null}
              <Card>
                <h2 className="mb-2 text-sm font-semibold text-ink">{loc({ en: "Sources", ar: "المصادر" })}</h2>
                <ul className="flex flex-col gap-1 text-sm text-muted">
                  {sources.map((s) => (
                    <li key={s.id}>
                      {loc(s.name)} · {s.year}
                      {s.n ? ` · n=${s.n}` : ""} · {s.licence}
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
