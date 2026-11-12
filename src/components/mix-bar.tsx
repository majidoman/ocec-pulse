import type { EnpsScore } from "@/lib/pulse/results-types";
import { useT } from "@/lib/store";

export function EnpsMix({ enps }: { enps: EnpsScore | null }) {
  const { t, loc } = useT();
  if (!enps) return <p className="text-sm text-muted">{loc({ en: "No eNPS answers yet.", ar: "لا إجابات لمؤشر التوصية بعد." })}</p>;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-sand-2">
        <div className="bg-score-high" style={{ width: `${enps.promoters}%` }} />
        <div className="bg-score-mid" style={{ width: `${enps.passives}%` }} />
        <div className="bg-score-crit" style={{ width: `${enps.detractors}%` }} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span>
          <span className="font-medium text-score-high">{enps.promoters}%</span> {t("promoters")}
        </span>
        <span>
          <span className="font-medium text-ink">{enps.passives}%</span> {t("passives")}
        </span>
        <span>
          <span className="font-medium text-score-crit">{enps.detractors}%</span> {t("detractors")}
        </span>
      </div>
    </div>
  );
}

export function ScoreLegend() {
  const { t } = useT();
  const items = [
    { cls: "bg-score-high", label: t("legendHigh") },
    { cls: "bg-score-good", label: t("legendGood") },
    { cls: "bg-score-mid", label: t("legendMid") },
    { cls: "bg-score-low", label: t("legendLow") },
    { cls: "bg-score-crit", label: t("legendCrit") },
  ];
  return (
    <ul className="flex flex-wrap gap-3 text-xs text-muted">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span className={`size-2.5 rounded-sm ${i.cls}`} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
