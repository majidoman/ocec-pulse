import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageFrame } from "@/components/page-frame";
import { HiddenNote, NeedResults } from "@/components/results";
import { Score } from "@/components/score";
import { Card } from "@/components/ui/card";
import { useCensus } from "@/lib/census";
import { signed } from "@/lib/pulse/format";
import { useT } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/insights/departments")({ component: DepartmentsPage });

function DepartmentsPage() {
  const { t, loc } = useT();
  const { likertDimensions, departments } = useCensus();
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <PageFrame title={t("navDepts")} hint={t("deptHint")}>
      <NeedResults>
        {(r) => {
          const rows = r.departments
            .filter((d) => r.scopeDepartment === null || d.id === r.scopeDepartment)
            .sort((a, b) => (b.index ?? -1) - (a.index ?? -1));
          const sel = rows.find((d) => d.id === picked) ?? rows.find((d) => d.dims) ?? rows[0];
          const name = (id: string) => loc(departments.find((d) => d.id === id)?.name ?? { en: id, ar: id });
          return (
            <>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <Card className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[36rem] text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted">
                          <th className="px-5 py-3 text-start font-medium">{t("dept")}</th>
                          <th className="px-3 py-3 text-end font-medium">{t("kpiEngage")}</th>
                          <th className="px-3 py-3 text-end font-medium">{t("kpiEnps")}</th>
                          <th className="px-3 py-3 text-end font-medium">{t("response")}</th>
                          <th className="px-5 py-3 text-end font-medium">{t("vsHouse")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((d) => {
                          const delta = d.index !== null ? d.index - r.engagement.index : null;
                          return (
                            <tr
                              key={d.id}
                              onClick={() => setPicked(d.id)}
                              className={cn("cursor-pointer border-b border-border last:border-0 hover:bg-sand-2", sel?.id === d.id && "bg-sand-2")}
                            >
                              <td className="px-5 py-3">
                                <div className="font-medium text-ink">{name(d.id)}</div>
                                <div className="text-xs text-subtle">
                                  {d.headcount} {t("nPeople")}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-end">
                                <Score value={d.index} size="sm" />
                              </td>
                              <td className="px-3 py-3 text-end tabular-nums text-ink">{d.enps !== null ? signed(d.enps) : "—"}</td>
                              <td className="px-3 py-3 text-end tabular-nums text-muted">
                                {d.n !== null ? `${d.n}${d.rate !== null ? ` · ${d.rate}%` : ""}` : d.suppressed ? `< ${r.k}` : "0"}
                              </td>
                              <td className={cn("px-5 py-3 text-end tabular-nums", delta === null ? "text-subtle" : delta >= 0 ? "text-score-high" : "text-score-crit")}>
                                {delta === null ? "—" : signed(delta, 1)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
                {sel ? (
                  <Card>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">{t("selectedDept")}</p>
                    <h2 className="mt-2 font-display text-2xl text-ink">{name(sel.id)}</h2>
                    {sel.dims ? (
                      <>
                        <p className="mt-1 text-sm text-muted">
                          {sel.n} / {sel.headcount}
                          {sel.rate !== null ? ` · ${sel.rate}%` : ""}
                        </p>
                        <ul className="mt-5 flex flex-col gap-1.5">
                          {likertDimensions.map((dim) => (
                            <li key={dim.id} className="flex items-center justify-between gap-3">
                              <span className="text-sm text-ink">{loc(dim.short)}</span>
                              <Score value={sel.dims?.[dim.id] ?? null} size="sm" />
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="mt-6 text-sm leading-relaxed text-muted">
                        {sel.suppressed
                          ? loc({
                              en: `Hidden. Fewer than ${r.k} people from this department have answered, or showing it would reveal another small group.`,
                              ar: `محجوبة. أجاب أقل من ${r.k} أشخاص من هذه الإدارة، أو أن عرضها يكشف مجموعة صغيرة أخرى.`,
                            })
                          : loc({ en: "No responses from this department yet.", ar: "لا إجابات من هذه الإدارة بعد." })}
                      </p>
                    )}
                  </Card>
                ) : null}
              </div>
              <HiddenNote count={rows.filter((d) => d.suppressed).length} />
              {r.unspecified ? (
                <p className="text-xs text-subtle">
                  {loc({
                    en: `${r.unspecified} people chose not to state a department. They are counted in the house figures only.`,
                    ar: `${r.unspecified} شخصاً فضّلوا عدم ذكر الإدارة. يُحتسبون في أرقام البيت فقط.`,
                  })}
                </p>
              ) : null}
            </>
          );
        }}
      </NeedResults>
    </PageFrame>
  );
}
