/**
 * A plain-language summary written directly from the computed numbers.
 * Deterministic: every figure in the text is a figure in the results.
 */
import type { PulseConfig } from "./config";
import type { Results } from "./results-types";
import type { Lang } from "../types";

export function rankedDimensions(r: Results) {
  return Object.entries(r.dimensions)
    .map(([id, v]) => ({ id, score: v.score }))
    .sort((a, b) => b.score - a.score);
}

export function strengthsOf(r: Results, n = 3) {
  return rankedDimensions(r).slice(0, n);
}

export function opportunitiesOf(r: Results, n = 3) {
  const all = rankedDimensions(r);
  return all.slice(Math.max(n, all.length - n)).reverse();
}

export function buildNarrative(r: Results, config: Pick<PulseConfig, "dimensions" | "departments" | "general" | "benchmarks">, lang: Lang): string[] {
  if (!r.enough || !r.engagement) return [];
  const dim = (id: string) => config.dimensions.find((d) => d.id === id)?.name[lang] ?? id;
  const dept = (id: string) => config.departments.find((d) => d.id === id)?.name[lang] ?? id;
  const top = strengthsOf(r);
  const low = opportunitiesOf(r);
  const shown = r.departments.filter((d) => d.index !== null).sort((a, b) => (b.index ?? 0) - (a.index ?? 0));
  const hidden = r.departments.filter((d) => d.suppressed).length;
  const prior = config.benchmarks.prior;
  const out: string[] = [];
  const list = (items: { id: string; score: number }[]) =>
    items.map((x) => `${dim(x.id)} (${x.score})`).join(lang === "ar" ? "، " : ", ");

  if (lang === "ar") {
    out.push(
      `أجاب ${r.total} من أصل ${r.headcount} (${r.rate}٪). مؤشر المشاركة ${r.engagement.index.toFixed(1)}: ${r.engagement.favorable}٪ إجابات إيجابية، ${r.engagement.neutral}٪ محايدة، ${r.engagement.unfavorable}٪ سلبية.` +
        (r.enps ? ` مؤشر التوصية ${r.enps.score > 0 ? "+" : ""}${r.enps.score} (${r.enps.promoters}٪ مروّجون، ${r.enps.detractors}٪ منتقدون).` : ""),
    );
    if (prior.engagement !== null) {
      const d = r.engagement.index - prior.engagement;
      out.push(`مقارنة بـ${config.benchmarks.priorYearLabel || "الدورة السابقة"} (${prior.engagement})، ${d >= 0 ? "ارتفع" : "انخفض"} المؤشر ${Math.abs(d).toFixed(1)} نقطة.`);
    }
    if (top.length) out.push(`أقوى الأبعاد: ${list(top)}. أضعفها: ${list(low)}.`);
    if (r.drivers?.length) {
      const d = r.drivers.slice(0, 2).map((x) => `${dim(x.dimension)} (r ${x.r.toFixed(2)})`).join("، ");
      out.push(`أقوى ارتباط بمؤشر التوصية: ${d}. تحسين هذه الأبعاد هو الأرجح أثراً على توصية الموظفين بالمركز.`);
    }
    if (shown.length >= 2) {
      const a = shown[0];
      const b = shown[shown.length - 1];
      out.push(`بين الإدارات المعروضة، الأعلى ${dept(a.id)} (${a.index?.toFixed(0)}) والأدنى ${dept(b.id)} (${b.index?.toFixed(0)}).` + (hidden ? ` ${hidden} إدارة محجوبة لحماية المجهولية.` : ""));
    }
    return out;
  }

  out.push(
    `${r.total} of ${r.headcount} people answered (${r.rate}%). The engagement index is ${r.engagement.index.toFixed(1)}: ${r.engagement.favorable}% of answers were favourable, ${r.engagement.neutral}% neutral and ${r.engagement.unfavorable}% unfavourable.` +
      (r.enps ? ` eNPS is ${r.enps.score > 0 ? "+" : ""}${r.enps.score} (${r.enps.promoters}% promoters, ${r.enps.detractors}% detractors).` : ""),
  );
  if (prior.engagement !== null) {
    const d = r.engagement.index - prior.engagement;
    out.push(`Against ${config.benchmarks.priorYearLabel || "the last cycle"} (${prior.engagement}), the index is ${d >= 0 ? "up" : "down"} ${Math.abs(d).toFixed(1)} points.`);
  }
  if (top.length) out.push(`Strongest dimensions: ${list(top)}. Weakest: ${list(low)}.`);
  if (r.drivers?.length) {
    const d = r.drivers.slice(0, 2).map((x) => `${dim(x.dimension)} (r ${x.r.toFixed(2)})`).join(" and ");
    out.push(`The strongest links to eNPS are ${d}. Improving these is the most likely way to move whether people recommend working here.`);
  }
  if (shown.length >= 2) {
    const a = shown[0];
    const b = shown[shown.length - 1];
    out.push(`Among departments shown, ${dept(a.id)} is highest (${a.index?.toFixed(0)}) and ${dept(b.id)} lowest (${b.index?.toFixed(0)}).` + (hidden ? ` ${hidden} department${hidden === 1 ? " is" : "s are"} hidden to protect anonymity.` : ""));
  }
  return out;
}
