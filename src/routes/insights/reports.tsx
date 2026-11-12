import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { HeatmapGrid } from "@/components/heatmap-grid";
import { EnpsMix } from "@/components/mix-bar";
import { PageFrame } from "@/components/page-frame";
import { HiddenNote, NeedResults } from "@/components/results";
import { Score } from "@/components/score";
import { PlanBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCensus } from "@/lib/census";
import { exportData } from "@/lib/pulse/api";
import { downloadText, signed } from "@/lib/pulse/format";
import { buildNarrative } from "@/lib/pulse/narrative";
import type { CutRow } from "@/lib/pulse/results-types";
import { CONTRACTS, LEVELS, TENURE } from "@/lib/questionnaire";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/insights/reports")({ component: ReportsPage });

type Pack = "exec" | "dept" | "board";

function ReportsPage() {
  const { t, loc, lang } = useT();
  const { dimensions, departments, benchmarks, questions, likertDimensions, currentRole, cycleName } = useCensus();
  const general = useSettings((s) => s.general);
  const actions = useSettings((s) => s.actions);
  const [pack, setPack] = useState<Pack>("exec");
  const canExport = currentRole === "super" || currentRole === "pc" || currentRole === "exec";

  async function download(kind: "departments" | "items" | "comments") {
    try {
      const res = await exportData({ data: { kind } });
      downloadText(res.filename, res.csv);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  const packs: { id: Pack; title: string; body: string }[] = [
    { id: "exec", title: t("execPack"), body: loc({ en: "Summary, headline figures, strongest and weakest items, action plan.", ar: "الملخص والأرقام الرئيسية وأقوى وأضعف البنود وخطة العمل." }) },
    { id: "dept", title: t("deptPack"), body: loc({ en: "Heat map by department, demographic cuts, comments.", ar: "الخريطة الحرارية حسب الإدارة والفئات والتعليقات." }) },
    { id: "board", title: t("boardPack"), body: loc({ en: "Headline figures, dimension scores, comparisons where sourced.", ar: "الأرقام الرئيسية ودرجات الأبعاد والمقارنات الموثّقة." }) },
  ];

  return (
    <PageFrame
      title={t("navReports")}
      hint={t("reportHint")}
      actions={
        <Button className="print:hidden" onClick={() => window.print()}>
          {t("print")}
        </Button>
      }
    >
      <div className="grid gap-3 print:hidden md:grid-cols-3">
        {packs.map((p) => (
          <button key={p.id} type="button" className="w-full text-start" onClick={() => setPack(p.id)}>
            <Card className={pack === p.id ? "ring-2 ring-ink" : ""}>
              <h2 className="font-display text-lg text-ink">{p.title}</h2>
              <p className="mt-1 text-sm text-muted">{p.body}</p>
            </Card>
          </button>
        ))}
      </div>

      {canExport ? (
        <Card className="print:hidden">
          <h2 className="mb-1 text-sm font-semibold text-ink">{loc({ en: "Download for Excel", ar: "تنزيل لإكسل" })}</h2>
          <p className="mb-3 text-sm text-muted">
            {loc({ en: "Anonymised totals only. Hidden groups stay hidden in the files.", ar: "مجاميع مجهولة فقط. المجموعات المحجوبة تبقى محجوبة في الملفات." })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void download("departments")}>{loc({ en: "Departments × dimensions", ar: "الإدارات × الأبعاد" })}</Button>
            <Button variant="outline" size="sm" onClick={() => void download("items")}>{loc({ en: "Every question", ar: "كل سؤال" })}</Button>
            <Button variant="outline" size="sm" onClick={() => void download("comments")}>{t("themesTitle")}</Button>
          </div>
        </Card>
      ) : null}

      <NeedResults>
        {(r) => {
          const story = buildNarrative(r, { dimensions, departments, general, benchmarks }, lang);
          const withText = r.items.map((row) => ({ ...row, text: questions.find((q) => q.id === row.id)?.text })).filter((x) => x.text);
          const high = withText.slice(0, 5);
          const low = [...withText].reverse().slice(0, 5);
          const label = (rows: { id: string; name: { en: string; ar: string } }[], id: string) => loc(rows.find((x) => x.id === id)?.name ?? { en: id, ar: id });
          const sources = benchmarks.sources.filter((s) => s.score !== null && s.licence.trim());
          const openQs = questions.filter((q) => q.type === "text");
          return (
            <>
              <Card>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">{loc(cycleName)}</p>
                <h2 className="mt-2 font-display text-2xl text-ink">{packs.find((p) => p.id === pack)?.title}</h2>
                <p className="mt-2 text-sm text-muted">
                  {t("kpiEngage")} {r.engagement.index.toFixed(1)} · {t("kpiEnps")} {r.enps ? signed(r.enps.score) : "—"} · {t("kpiResp")} {r.rate}% ({r.total}/{r.headcount})
                </p>
                <div className="mt-4 flex flex-col gap-3 text-sm leading-relaxed text-ink">
                  {story.slice(0, pack === "board" ? 2 : story.length).map((p) => (
                    <p key={p.slice(0, 20)}>{p}</p>
                  ))}
                </div>
                <div className="mt-4">
                  <EnpsMix enps={r.enps} />
                </div>
              </Card>

              {pack !== "dept" ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  <ItemList title={t("itemHigh")} rows={high} />
                  <ItemList title={t("itemLow")} rows={low} />
                </div>
              ) : null}

              {pack === "dept" ? (
                <Card>
                  <h2 className="mb-3 text-sm font-semibold text-ink">{t("navHeat")}</h2>
                  <HeatmapGrid results={r} />
                  <div className="mt-3">
                    <HiddenNote count={r.departments.filter((d) => d.suppressed).length} />
                  </div>
                </Card>
              ) : null}

              {pack !== "board" ? (
                <Card>
                  <h2 className="mb-4 text-sm font-semibold text-ink">{t("cutsTitle")}</h2>
                  <div className="grid gap-6 md:grid-cols-3">
                    <CutList title={t("byLevel")} rows={r.cuts.level} name={(id) => label(LEVELS, id)} />
                    <CutList title={t("byTenure")} rows={r.cuts.tenure} name={(id) => label(TENURE, id)} />
                    <CutList title={t("byContract")} rows={r.cuts.contract} name={(id) => label(CONTRACTS, id)} />
                  </div>
                  <p className="mt-4 text-xs text-subtle">k≥{r.k}</p>
                </Card>
              ) : null}

              {pack === "board" ? (
                <Card>
                  <h2 className="mb-3 text-sm font-semibold text-ink">{loc({ en: "Dimension scores", ar: "درجات الأبعاد" })}</h2>
                  <ul className="flex flex-col gap-1.5">
                    {likertDimensions.map((d) => (
                      <li key={d.id} className="flex justify-between text-sm">
                        <span className="text-muted">{loc(d.name)}</span>
                        <span className="tabular-nums text-ink">{r.dimensions[d.id]?.score ?? "—"}</span>
                      </li>
                    ))}
                  </ul>
                  {sources.length ? (
                    <>
                      <h2 className="mb-3 mt-6 text-sm font-semibold text-ink">{t("navBench")}</h2>
                      <ul className="flex flex-col gap-2">
                        {sources.map((b) => (
                          <li key={b.id} className="flex items-center justify-between">
                            <span className="text-sm text-ink">
                              {loc(b.name)} <span className="text-xs text-subtle">{b.year} · {b.licence}</span>
                            </span>
                            <Score value={b.score} size="sm" />
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </Card>
              ) : null}

              {pack !== "board" && r.comments ? (
                <Card>
                  <h2 className="mb-1 text-sm font-semibold text-ink">
                    {t("themesTitle")} · {r.comments.length}
                  </h2>
                  <p className="mb-4 text-xs text-subtle">
                    {loc({ en: "Shown as written, in no particular order, without any link to who wrote them.", ar: "تُعرض كما كُتبت، دون ترتيب، ودون أي ربط بكاتبها." })}
                  </p>
                  {!r.comments.length ? (
                    <p className="text-sm text-muted">{loc({ en: "No comments to show.", ar: "لا تعليقات للعرض." })}</p>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {openQs.map((q) => {
                        const list = (r.comments ?? []).filter((c) => c.question === q.id);
                        if (!list.length) return null;
                        return (
                          <div key={q.id}>
                            <h3 className="mb-2 text-sm font-medium text-ink">
                              {loc(q.text)} <span className="text-xs text-subtle">· {list.length}</span>
                            </h3>
                            <ul className="flex flex-col gap-2">
                              {list.slice(0, pack === "exec" ? 12 : 400).map((c, i) => (
                                <li key={i} className="rounded-xl bg-sand-2 px-4 py-3 text-sm leading-relaxed text-ink" dir="auto">
                                  {c.body}
                                  {c.department ? <span className="ms-2 text-xs text-subtle">— {label(departments, c.department)}</span> : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              ) : null}

              {pack === "exec" && actions.length ? (
                <Card>
                  <h2 className="mb-3 text-sm font-semibold text-ink">{t("navActions")}</h2>
                  <ul className="flex flex-col gap-3">
                    {actions.map((a) => (
                      <li key={a.id} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-ink">{loc(a.title)}</span>
                            <PlanBadge status={a.status} />
                          </div>
                          <p className="mt-1 text-sm text-muted">{loc(a.why)}</p>
                        </div>
                        <span className="text-xs text-subtle">{loc(a.owner)} · {loc(a.horizon)}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </>
          );
        }}
      </NeedResults>
    </PageFrame>
  );

  function ItemList({ title, rows }: { title: string; rows: { id: string; favorable: number; text?: { en: string; ar: string } }[] }) {
    return (
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2>
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-3">
              <span className="text-sm text-ink">{row.text ? loc(row.text) : row.id}</span>
              <Score value={row.favorable} size="sm" />
            </li>
          ))}
        </ul>
      </Card>
    );
  }
}

function CutList({ title, rows, name }: { title: string; rows: CutRow[]; name: (id: string) => string }) {
  const { t, loc } = useT();
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-subtle">{title}</h3>
      {!rows.length ? <p className="text-sm text-muted">{loc({ en: "Not enough answers.", ar: "إجابات غير كافية." })}</p> : null}
      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2">
            <span className="text-sm text-ink">
              {name(r.id)}
              <span className="ms-1 text-xs text-subtle">{r.n !== null ? `${r.n} ${t("nPeople")}` : loc({ en: "hidden", ar: "محجوبة" })}</span>
            </span>
            <Score value={r.score} size="sm" />
          </li>
        ))}
      </ul>
    </div>
  );
}
