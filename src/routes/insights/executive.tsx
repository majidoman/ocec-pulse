import { createFileRoute } from "@tanstack/react-router";
import { EnpsMix } from "@/components/mix-bar";
import { PageFrame } from "@/components/page-frame";
import { NeedResults } from "@/components/results";
import { PlanBadge } from "@/components/status-badge";
import { Score } from "@/components/score";
import { Card } from "@/components/ui/card";
import { useCensus } from "@/lib/census";
import { signed } from "@/lib/pulse/format";
import { buildNarrative, opportunitiesOf, strengthsOf } from "@/lib/pulse/narrative";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/insights/executive")({ component: ExecutivePage });

function ExecutivePage() {
  const { t, loc, lang } = useT();
  const { dimensions, departments, benchmarks, cycleName } = useCensus();
  const general = useSettings((s) => s.general);
  const actions = useSettings((s) => s.actions);
  const prior = benchmarks.prior;
  const best = benchmarks.sources.find((s) => s.id === "best" && s.score !== null && s.licence.trim());

  return (
    <PageFrame title={t("navExec")} hint={t("execHint")}>
      <NeedResults>
        {(r) => {
          const story = buildNarrative(r, { dimensions, departments, general, benchmarks }, lang);
          const list = (rows: { id: string; score: number }[]) => (
            <ul className="flex flex-col gap-2">
              {rows.map((row) => {
                const d = dimensions.find((x) => x.id === row.id);
                if (!d) return null;
                return (
                  <li key={row.id} className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-ink">{loc(d.name)}</div>
                      <div className="text-xs text-muted">{loc(d.blurb)}</div>
                    </div>
                    <Score value={row.score} size="sm" />
                  </li>
                );
              })}
            </ul>
          );
          return (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">{t("kpiEngage")}</p>
                  <p className="mt-2 font-display text-3xl text-ink">{r.engagement.index.toFixed(1)}</p>
                  <p className="mt-1 text-xs text-muted">
                    {prior.engagement !== null ? `${signed(r.engagement.index - prior.engagement, 1)} ${t("kpiDelta")}` : `${r.engagement.favorable}% ${t("favorable")}`}
                  </p>
                </Card>
                <Card>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">{t("kpiEnps")}</p>
                  <p className="mt-2 font-display text-3xl text-ink">{r.enps ? signed(r.enps.score) : "—"}</p>
                  <p className="mt-1 text-xs text-muted">
                    {r.enps && prior.enps !== null ? `${signed(r.enps.score - prior.enps)} ${t("kpiDelta")}` : ""}
                  </p>
                </Card>
                <Card>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">{t("kpiResp")}</p>
                  <p className="mt-2 font-display text-3xl text-ink">{r.rate}%</p>
                  <p className="mt-1 text-xs text-muted">
                    {r.total}/{r.headcount}
                  </p>
                </Card>
                <Card>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">
                    {best ? loc({ en: `Gap to ${best.name.en}`, ar: `الفجوة عن ${best.name.ar}` }) : loc({ en: "Departments shown", ar: "الإدارات المعروضة" })}
                  </p>
                  <p className="mt-2 font-display text-3xl text-ink">
                    {best ? `${signed(r.engagement.index - (best.score ?? 0), 1)}` : `${r.departments.filter((d) => d.dims).length}/${r.departments.length}`}
                  </p>
                  <p className="mt-1 text-xs text-muted">{best ? `${best.score} · ${best.year}` : `k≥${r.k}`}</p>
                </Card>
              </div>

              <Card>
                <EnpsMix enps={r.enps} />
              </Card>

              <Card>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">{loc(cycleName)}</p>
                <div className="mt-4 flex flex-col gap-4 text-sm leading-relaxed text-ink">
                  {story.map((p) => (
                    <p key={p.slice(0, 32)}>{p}</p>
                  ))}
                </div>
              </Card>

              <div className="grid gap-3 lg:grid-cols-2">
                <Card>
                  <h2 className="mb-3 text-sm font-semibold text-ink">{t("strengths")}</h2>
                  {list(strengthsOf(r))}
                </Card>
                <Card>
                  <h2 className="mb-3 text-sm font-semibold text-ink">{t("opportunities")}</h2>
                  {list(opportunitiesOf(r))}
                </Card>
              </div>

              {actions.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {actions.map((a) => (
                    <Card key={a.id}>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="font-display text-lg text-ink">{loc(a.title)}</h3>
                        <PlanBadge status={a.status} />
                      </div>
                      <p className="text-sm leading-relaxed text-muted">{loc(a.why)}</p>
                      <p className="mt-3 text-xs text-subtle">
                        {t("owner")}: {loc(a.owner)} · {loc(a.horizon)}
                      </p>
                    </Card>
                  ))}
                </div>
              ) : null}
            </>
          );
        }}
      </NeedResults>
    </PageFrame>
  );
}
