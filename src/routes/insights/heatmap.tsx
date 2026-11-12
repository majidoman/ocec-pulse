import { createFileRoute } from "@tanstack/react-router";
import { HeatmapGrid } from "@/components/heatmap-grid";
import { ScoreLegend } from "@/components/mix-bar";
import { PageFrame } from "@/components/page-frame";
import { HiddenNote, NeedResults } from "@/components/results";
import { Card } from "@/components/ui/card";
import { useCensus } from "@/lib/census";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/insights/heatmap")({ component: HeatmapPage });

function HeatmapPage() {
  const { t, loc } = useT();
  const { likertDimensions, departments } = useCensus();

  return (
    <PageFrame
      title={t("navHeat")}
      hint={loc({
        en: "Favourable % by department and dimension. A department stays blank until enough people have answered.",
        ar: "نسبة الإيجابية حسب الإدارة والبُعد. تبقى الإدارة فارغة حتى يجيب عدد كافٍ.",
      })}
    >
      <NeedResults>
        {(r) => {
          let low: { dept: string; dim: string; score: number } | null = null;
          let high: { dept: string; dim: string; score: number } | null = null;
          for (const d of r.departments) {
            if (!d.dims) continue;
            for (const dim of likertDimensions) {
              const s = d.dims[dim.id];
              if (typeof s !== "number") continue;
              if (!low || s < low.score) low = { dept: d.id, dim: dim.id, score: s };
              if (!high || s > high.score) high = { dept: d.id, dim: dim.id, score: s };
            }
          }
          const name = (id: string) => loc(departments.find((d) => d.id === id)?.name ?? { en: id, ar: id });
          const dimName = (id: string) => loc(likertDimensions.find((d) => d.id === id)?.name ?? { en: id, ar: id });
          return (
            <>
              <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <ScoreLegend />
                  <p className="text-xs text-subtle">
                    {t("anonymityTitle")} · k≥{r.k}
                  </p>
                </div>
                <HeatmapGrid results={r} />
                <div className="mt-3">
                  <HiddenNote count={r.departments.filter((d) => d.suppressed).length} />
                </div>
              </Card>
              {high && low ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <Card>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">{loc({ en: "Highest cell", ar: "أعلى خانة" })}</p>
                    <p className="mt-2 font-display text-xl text-ink">{name(high.dept)}</p>
                    <p className="text-sm text-muted">{dimName(high.dim)}</p>
                    <p className="mt-3 font-display text-3xl tabular-nums text-score-high">{high.score}</p>
                  </Card>
                  <Card>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">{loc({ en: "Lowest cell", ar: "أدنى خانة" })}</p>
                    <p className="mt-2 font-display text-xl text-ink">{name(low.dept)}</p>
                    <p className="text-sm text-muted">{dimName(low.dim)}</p>
                    <p className="mt-3 font-display text-3xl tabular-nums text-score-crit">{low.score}</p>
                  </Card>
                </div>
              ) : null}
            </>
          );
        }}
      </NeedResults>
    </PageFrame>
  );
}
