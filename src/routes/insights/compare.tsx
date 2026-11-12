import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageFrame } from "@/components/page-frame";
import { NeedResults } from "@/components/results";
import { Delta, Score } from "@/components/score";
import { Card } from "@/components/ui/card";
import { useCensus } from "@/lib/census";
import { canEditSettings } from "@/lib/pulse/config";
import { signed } from "@/lib/pulse/format";
import { useT } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/insights/compare")({ component: ComparePage });

function ComparePage() {
  const { t, loc } = useT();
  const { likertDimensions, benchmarks, currentRole } = useCensus();
  const prior = benchmarks.prior;
  const label = benchmarks.priorYearLabel || t("lastCycle");
  const hasPrior = prior.engagement !== null || prior.enps !== null || Object.keys(prior.dimensions).length > 0;

  return (
    <PageFrame title={t("navCompare")} hint={hasPrior ? t("compareHint") : t("baselineOnly")}>
      <NeedResults>
        {(r) => {
          if (!hasPrior) {
            return (
              <Card>
                <p className="text-sm leading-relaxed text-muted">
                  {loc({
                    en: "No earlier cycle has been loaded, so there is nothing to compare with yet. This cycle is the baseline for next year.",
                    ar: "لم تُحمَّل دورة سابقة، فلا مقارنة بعد. هذه الدورة خط الأساس للعام القادم.",
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
          const rows = likertDimensions
            .map((d) => ({ d, now: r.dimensions[d.id]?.score ?? null, was: prior.dimensions[d.id] }))
            .filter((x) => typeof x.was === "number" && x.now !== null);
          const chart = rows.map((x) => ({ name: loc(x.d.short), prior: x.was, now: x.now }));
          return (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Kpi label={t("kpiEngage")} value={r.engagement.index.toFixed(1)} delta={prior.engagement !== null ? r.engagement.index - prior.engagement : null} />
                <Kpi label={t("kpiEnps")} value={r.enps ? signed(r.enps.score) : "—"} delta={r.enps && prior.enps !== null ? r.enps.score - prior.enps : null} />
                <Kpi label={t("kpiResp")} value={`${r.rate}%`} delta={prior.response !== null ? r.rate - prior.response : null} />
              </div>
              {rows.length ? (
                <>
                  <Card className="h-80">
                    <h2 className="mb-4 text-sm font-semibold text-ink">
                      {label} → {t("thisCycle")}
                    </h2>
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart data={chart} barCategoryGap={8} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                        <CartesianGrid stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                        <YAxis domain={[0, 100]} tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: "var(--color-paper)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="prior" fill="var(--color-sand-2)" radius={[4, 4, 0, 0]} name={label} />
                        <Bar dataKey="now" fill="var(--color-accent)" radius={[4, 4, 0, 0]} name={t("thisCycle")} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                  <Card>
                    <ul className="flex flex-col">
                      {rows.map((x) => {
                        const delta = (x.now as number) - (x.was as number);
                        return (
                          <li key={x.d.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-border py-2.5 last:border-0">
                            <span className="text-sm text-ink">{loc(x.d.name)}</span>
                            <span className="text-xs tabular-nums text-subtle">{x.was}</span>
                            <Score value={x.now} size="sm" />
                            <span className={cn("min-w-12 text-end text-sm tabular-nums", delta >= 0 ? "text-score-high" : "text-score-crit")}>{signed(delta)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                </>
              ) : null}
              <p className="text-xs text-subtle">
                {loc({
                  en: "A comparison is fair only where the earlier survey asked about the same thing in a similar way. Treat differences in question wording as a reason for caution.",
                  ar: "المقارنة عادلة فقط حيث سأل الاستبيان السابق عن الشيء نفسه بطريقة مشابهة. اختلاف صياغة الأسئلة سبب للحذر.",
                })}
              </p>
            </>
          );
        }}
      </NeedResults>
    </PageFrame>
  );
}

function Kpi({ label, value, delta }: { label: string; value: string; delta: number | null }) {
  const { t } = useT();
  return (
    <Card>
      <p className="text-xs text-subtle">{label}</p>
      <p className="mt-2 font-display text-3xl text-ink">{value}</p>
      {delta !== null ? (
        <p className="mt-1 text-sm">
          <Delta value={delta} /> {t("kpiDelta")}
        </p>
      ) : null}
    </Card>
  );
}
