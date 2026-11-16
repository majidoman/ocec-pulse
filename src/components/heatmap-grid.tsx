import { scoreTone } from "@/lib/pulse/format";
import type { Results } from "@/lib/pulse/results-types";
import { useCensus } from "@/lib/census";
import { useT } from "@/lib/store";
import { cn } from "@/lib/utils";

function cellClass(score: number | null) {
  if (score == null)
    return "flex h-10 min-w-10 items-center justify-center rounded-md bg-sand-2 text-xs text-subtle";
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
  const rows = results.departments.filter(
    (d) => results.scopeDepartment === null || d.id === results.scopeDepartment,
  );
  // Phones: one card per department with a grid of section scores. Wider screens: the full table.
  const card = (
    key: string,
    title: string,
    sub: string,
    score: (dimId: string) => number | null,
    strong = false,
  ) => (
    <div key={key} className="rounded-xl border border-border bg-paper p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className={cn("text-sm text-ink", strong ? "font-semibold" : "font-medium")}>
          {title}
        </span>
        <span className="text-xs text-subtle">{sub}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 min-[400px]:grid-cols-4">
        {likertDimensions.map((d) => (
          <div key={d.id} className="flex flex-col gap-0.5">
            <span className="truncate text-[10px] text-muted">{loc(d.short)}</span>
            <div className={cellClass(score(d.id))}>{score(d.id) ?? "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
  const mobile = (
    <div className="flex flex-col gap-3 md:hidden">
      {results.scopeDepartment === null
        ? card(
            "all",
            t("houseAvg"),
            String(results.total),
            (id) => results.dimensions[id]?.score ?? null,
            true,
          )
        : null}
      {rows.map((row) => {
        const dept = departments.find((d) => d.id === row.id);
        if (!dept) return null;
        const sub =
          row.n === null
            ? row.suppressed
              ? `< ${results.k}`
              : "0"
            : `${row.n}${row.rate !== null ? ` · ${row.rate}%` : ""}`;
        return card(row.id, loc(dept.name), sub, (id) =>
          row.dims ? (row.dims[id] ?? null) : null,
        );
      })}
    </div>
  );
  return (
    <>
      {mobile}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[64rem] border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="sticky start-0 min-w-36 bg-paper pe-3 text-start text-xs font-medium text-muted">
                {t("dept")}
              </th>
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
                      {row.n === null
                        ? row.suppressed
                          ? `< ${results.k}`
                          : "0"
                        : `${row.n}${row.rate !== null ? ` · ${row.rate}%` : ""}`}
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
    </>
  );
}
