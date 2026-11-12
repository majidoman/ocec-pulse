import { createFileRoute } from "@tanstack/react-router";
import { PageFrame } from "@/components/page-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TextField } from "@/components/settings-field";
import { useCensus } from "@/lib/census";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/settings/benchmarks")({ component: BenchSetPage });

const num = (v: string): number | null => (v.trim() === "" || !Number.isFinite(Number(v)) ? null : Number(v));

function BenchSetPage() {
  const { t, loc } = useT();
  const b = useSettings((s) => s.benchmarks);
  const patch = useSettings((s) => s.patchBenchmarks);
  const { likertDimensions } = useCensus();

  return (
    <PageFrame
      title={t("setBench")}
      hint={loc({
        en: "Optional. Enter only figures you can source: a previous OCEC survey, or a published or licensed benchmark. Anything left blank is simply not shown.",
        ar: "اختياري. أدخل فقط أرقاماً لها مصدر: استبيان سابق للمركز أو مقارنة منشورة أو مرخّصة. ما يُترك فارغاً لا يُعرض.",
      })}
    >
      <Card className="grid gap-4 md:grid-cols-4">
        <h2 className="text-sm font-semibold text-ink md:col-span-4">{loc({ en: "Previous cycle", ar: "الدورة السابقة" })}</h2>
        <TextField label={loc({ en: "Name (e.g. Survey 2025)", ar: "الاسم (مثل استبيان ٢٠٢٥)" })} value={b.priorYearLabel} onChange={(v) => patch({ priorYearLabel: v })} />
        <TextField label={t("kpiEngage")} type="number" value={b.prior.engagement ?? ""} onChange={(v) => patch({ prior: { ...b.prior, engagement: num(v) } })} />
        <TextField label={t("kpiEnps")} type="number" value={b.prior.enps ?? ""} onChange={(v) => patch({ prior: { ...b.prior, enps: num(v) } })} />
        <TextField label={`${t("kpiResp")} %`} type="number" value={b.prior.response ?? ""} onChange={(v) => patch({ prior: { ...b.prior, response: num(v) } })} />
        <p className="text-xs text-subtle md:col-span-4">
          {loc({
            en: "Favourable % by dimension in the previous cycle. Fill only the dimensions the earlier survey really measured.",
            ar: "نسبة الإيجابية حسب البُعد في الدورة السابقة. املأ فقط الأبعاد التي قاسها الاستبيان السابق فعلاً.",
          })}
        </p>
        {likertDimensions.map((d) => (
          <TextField
            key={d.id}
            label={loc(d.short)}
            type="number"
            value={b.prior.dimensions[d.id] ?? ""}
            onChange={(v) => {
              const next = { ...b.prior.dimensions };
              const n = num(v);
              if (n === null) delete next[d.id];
              else next[d.id] = n;
              patch({ prior: { ...b.prior, dimensions: next } });
            }}
          />
        ))}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">{loc({ en: "Earlier cycles for the trend chart", ar: "دورات أقدم لمخطط الاتجاه" })}</h2>
        {b.trend.map((p, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-5">
            {(["year", "engagement", "enps", "response"] as const).map((f) => (
              <Input
                key={f}
                type="number"
                aria-label={f}
                placeholder={f === "year" ? loc({ en: "Year", ar: "السنة" }) : f === "engagement" ? t("kpiEngage") : f === "enps" ? t("kpiEnps") : `${t("kpiResp")} %`}
                value={p[f] ?? ""}
                onChange={(e) => patch({ trend: b.trend.map((x, j) => (j === i ? { ...x, [f]: f === "year" ? Number(e.target.value) || 0 : num(e.target.value) } : x)) })}
              />
            ))}
            <Button variant="ghost" size="sm" onClick={() => patch({ trend: b.trend.filter((_, j) => j !== i) })}>
              {loc({ en: "Remove", ar: "حذف" })}
            </Button>
          </div>
        ))}
        <Button className="self-start" variant="outline" size="sm" onClick={() => patch({ trend: [...b.trend, { year: new Date().getFullYear() - 1, engagement: null, enps: null, response: null }] })}>
          + {loc({ en: "Add a year", ar: "إضافة سنة" })}
        </Button>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">{loc({ en: "External benchmarks", ar: "مقارنات خارجية" })}</h2>
        <p className="text-xs text-subtle">
          {loc({
            en: "A benchmark is shown only when it has both a score and a source. The source is printed beside it.",
            ar: "تُعرض المقارنة فقط عند وجود الدرجة والمصدر معاً. يُطبع المصدر بجانبها.",
          })}
        </p>
        {b.sources.map((s) => {
          const set = (p: Partial<typeof s>) => patch({ sources: b.sources.map((x) => (x.id === s.id ? { ...x, ...p } : x)) });
          return (
            <div key={s.id} className="grid gap-2 border-b border-border pb-3 last:border-0 md:grid-cols-12">
              <Input className="md:col-span-3" placeholder={loc({ en: "Name", ar: "الاسم" })} value={s.name.en} onChange={(e) => set({ name: { en: e.target.value, ar: s.name.ar === s.name.en ? e.target.value : s.name.ar } })} />
              <Input className="md:col-span-2" dir="rtl" placeholder="الاسم" value={s.name.ar} onChange={(e) => set({ name: { ...s.name, ar: e.target.value } })} />
              <Input className="md:col-span-1" type="number" placeholder={loc({ en: "Score", ar: "الدرجة" })} value={s.score ?? ""} onChange={(e) => set({ score: num(e.target.value) })} />
              <Input className="md:col-span-1" placeholder={loc({ en: "Year", ar: "السنة" })} value={s.year} onChange={(e) => set({ year: e.target.value })} />
              <Input className="md:col-span-4" placeholder={loc({ en: "Source (publisher, report, licence)", ar: "المصدر (الناشر، التقرير، الترخيص)" })} value={s.licence} onChange={(e) => set({ licence: e.target.value })} />
              <Button className="md:col-span-1" variant="ghost" size="sm" onClick={() => patch({ sources: b.sources.filter((x) => x.id !== s.id) })}>
                {loc({ en: "Remove", ar: "حذف" })}
              </Button>
            </div>
          );
        })}
        <Button
          className="self-start"
          variant="outline"
          size="sm"
          onClick={() => patch({ sources: [...b.sources, { id: `b-${Date.now()}`, name: { en: "", ar: "" }, year: "", licence: "", score: null }] })}
        >
          + {loc({ en: "Add a benchmark", ar: "إضافة مقارنة" })}
        </Button>
      </Card>
    </PageFrame>
  );
}
