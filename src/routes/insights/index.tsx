import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageFrame } from "@/components/page-frame";
import { EnpsMix } from "@/components/mix-bar";
import { NeedResults } from "@/components/results";
import { Score, Delta } from "@/components/score";
import { Card } from "@/components/ui/card";
import { useCensus } from "@/lib/census";
import { opportunitiesOf, strengthsOf } from "@/lib/pulse/narrative";
import { signed } from "@/lib/pulse/format";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/insights/")({ component: Overview });

function Overview() {
  const { t, loc } = useT();
  const { likertDimensions, dimensions, benchmarks, cycleName } = useCensus();
  const prior = benchmarks.prior;
  const hasPrior = prior.engagement !== null;

  return (
    <PageFrame title={t("navOverview")} hint={loc(cycleName)}>
      <NeedResults>
        {(r) => {
          const chart = likertDimensions.map((d) => ({
            name: loc(d.short),
            score: r.dimensions[d.id]?.score ?? 0,
            prior: prior.dimensions[d.id] ?? null,
          }));
          const hasPriorDims = chart.some((c) => c.prior !== null);
          return (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi
                  label={t("kpiEngage")}
                  value={r.engagement.index.toFixed(1)}
                  delta={hasPrior ? r.engagement.index - (prior.engagement ?? 0) : undefined}
                  note={`${r.engagement.favorable}% ${t("favorable")}`}
                />
                <Kpi
                  label={t("kpiEnps")}
                  value={r.enps ? signed(r.enps.score) : "—"}
                  delta={r.enps && prior.enps !== null ? r.enps.score - prior.enps : undefined}
                  note={r.enps ? `${r.enps.n} ${t("nPeople")}` : undefined}
                />
                <Kpi
                  label={t("kpiResp")}
                  value={`${r.rate}%`}
                  delta={prior.response !== null ? r.rate - prior.response : undefined}
                  note={`${r.total} / ${r.headcount}`}
                />
                <Card>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">
                    {loc({ en: "Answer mix", ar: "توزيع الإجابات" })}
                  </p>
                  <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-sand-2">
                    <div className="bg-score-high" style={{ width: `${r.engagement.favorable}%` }} />
                    <div className="bg-score-mid" style={{ width: `${r.engagement.neutral}%` }} />
                    <div className="bg-score-crit" style={{ width: `${r.engagement.unfavorable}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {r.engagement.favorable}% {t("favorable")} · {r.engagement.neutral}% {t("neutral")} · {r.engagement.unfavorable}% {t("unfav")}
                  </p>
                </Card>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <Card>
                  <h2 className="mb-3 text-sm font-semibold text-ink">{t("strengths")}</h2>
                  <DimList rows={strengthsOf(r)} />
                </Card>
                <Card>
                  <h2 className="mb-3 text-sm font-semibold text-ink">{t("opportunities")}</h2>
                  <DimList rows={opportunitiesOf(r)} />
                </Card>
              </div>

              <Card>
                <h2 className="mb-3 text-sm font-semibold text-ink">{t("kpiEnps")}</h2>
                <EnpsMix enps={r.enps} />
              </Card>

              <Card className="h-80">
                <h2 className="mb-4 text-sm font-semibold text-ink">
                  {hasPriorDims
                    ? `${loc({ en: "Dimensions", ar: "الأبعاد" })} · ${t("thisCycle")} / ${benchmarks.priorYearLabel || t("lastCycle")}`
                    : loc({ en: "Dimensions · favourable %", ar: "الأبعاد · نسبة الإيجابية" })}
                </h2>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={chart} barCategoryGap={10} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis domain={[0, 100]} tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--color-paper)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                    {hasPriorDims ? (
                      <Bar dataKey="prior" fill="var(--color-sand-2)" radius={[4, 4, 0, 0]} name={benchmarks.priorYearLabel || t("lastCycle")} />
                    ) : null}
                    <Bar dataKey="score" fill="var(--color-accent)" radius={[4, 4, 0, 0]} name={t("thisCycle")} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <div className="grid gap-3 md:grid-cols-3">
                <Link to="/insights/heatmap" className="rounded-2xl bg-paper p-5 shadow-[var(--shadow-border)] hover:bg-sand-2">
                  <div className="text-sm font-semibold text-ink">{t("navHeat")}</div>
                  <p className="mt-1 text-sm text-muted">{loc({ en: "Favourable % by department and dimension.", ar: "نسبة الإيجابية حسب الإدارة والبُعد." })}</p>
                </Link>
                <Link to="/insights/executive" className="rounded-2xl bg-paper p-5 shadow-[var(--shadow-border)] hover:bg-sand-2">
                  <div className="text-sm font-semibold text-ink">{t("navExec")}</div>
                  <p className="mt-1 text-sm text-muted">{loc({ en: "The house story on one page for the leadership team.", ar: "قصة البيت في صفحة واحدة لفريق القيادة." })}</p>
                </Link>
                <Link to="/insights/actions" className="rounded-2xl bg-paper p-5 shadow-[var(--shadow-border)] hover:bg-sand-2">
                  <div className="text-sm font-semibold text-ink">{t("navActions")}</div>
                  <p className="mt-1 text-sm text-muted">{loc({ en: "Owned moves for the next ninety days.", ar: "حركات بمالكين للتسعين يوماً القادمة." })}</p>
                </Link>
              </div>
            </>
          );
        }}
      </NeedResults>
    </PageFrame>
  );

  function DimList({ rows }: { rows: { id: string; score: number }[] }) {
    return (
      <ul className="flex flex-col gap-2">
        {rows.map((row) => {
          const d = dimensions.find((x) => x.id === row.id);
          if (!d) return null;
          return (
            <li key={row.id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink">{loc(d.name)}</span>
              <Score value={row.score} size="sm" />
            </li>
          );
        })}
      </ul>
    );
  }
}

function Kpi({ label, value, delta, note }: { label: string; value: string; delta?: number; note?: string }) {
  const { t } = useT();
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">{label}</p>
      <p className="mt-2 font-display text-3xl font-medium tabular-nums text-ink">{value}</p>
      {typeof delta === "number" ? (
        <p className="mt-1 text-xs text-muted">
          <Delta value={delta} /> {t("kpiDelta")}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted">{note ?? ""}</p>
      )}
    </Card>
  );
}
