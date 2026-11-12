import { scoreTone } from "@/lib/pulse/format";
import type { Results } from "@/lib/pulse/results-types";
import { useCensus } from "@/lib/census";
import { useT } from "@/lib/store";
import { cn } from "@/lib/utils";

function cellClass(score: number | null) {
  if (score == null) return "flex h-10 min-w-10 items-center justify-center rounded-md bg-sand-2 text-xs text-subtle";
  const tone = scoreTone(score);
  return cn(
    "flex h-10 min-w-10 items-center justify-center rounded-md text-xs font-medium tabular-nums",
    tone === "high" && "bg-score-high text-sand",
    tone === "good" && "bg-score-good text-sand",
    tone === "mid" && "bg-score-mid/90 text-ink",
    tone === "low" && "bg-score-low text-sand",
    tone === "crit" && "bg-score-crit text-sand",
  );
}

export function HeatmapGrid({ results }: { results: Results }) {
  const { loc, t } = useT();
  const { likertDimensions, departments } = useCensus();
  const rows = results.departments.filter((d) => results.scopeDepartment === null || d.id === results.scopeDepartment);
  return (
    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <table className="min-w-[64rem] border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="sticky start-0 min-w-36 bg-paper pe-3 text-start text-xs font-medium text-muted">{t("dept")}</th>
            {likertDimensions.map((d) => (
              <th key={d.id} className="px-0.5 text-center text-[10px] font-medium text-muted">
                <span className="inline-block max-w-14 leading-tight">{loc(d.short)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.scopeDepartment === null ? (
            <tr>
              <th className="sticky start-0 min-w-36 bg-paper pe-3 text-start text-xs font-semibold text-ink">
                <div>{t("houseAvg")}</div>
                <div className="font-normal text-subtle">{results.total}</div>
              </th>
              {likertDimensions.map((d) => {
                const score = results.dimensions[d.id]?.score ?? null;
                return (
                  <td key={d.id}>
                    <div className={cellClass(score)}>{score ?? "—"}</div>
                  </td>
                );
              })}
            </tr>
          ) : null}
          {rows.map((row) => {
            const dept = departments.find((d) => d.id === row.id);
            if (!dept) return null;
            return (
              <tr key={row.id}>
                <th className="sticky start-0 min-w-36 bg-paper pe-3 text-start text-xs font-medium text-ink">
                  <div>{loc(dept.name)}</div>
                  <div className="font-normal text-subtle">
                    {row.n === null ? (row.suppressed ? `< ${results.k}` : "0") : `${row.n}${row.rate !== null ? ` · ${row.rate}%` : ""}`}
                  </div>
                </th>
                {likertDimensions.map((d) => {
                  const score = row.dims ? (row.dims[d.id] ?? null) : null;
                  return (
                    <td key={d.id}>
                      <div className={cellClass(score)}>{score ?? "—"}</div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
