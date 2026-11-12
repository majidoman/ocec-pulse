import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePulse } from "@/lib/pulse/session";
import type { Results } from "@/lib/pulse/results-types";
import { useT } from "@/lib/store";

export type ReadyResults = Results & {
  engagement: NonNullable<Results["engagement"]>;
};

export function useResults() {
  return usePulse((s) => s.results);
}

export function RefreshButton() {
  const { loc } = useT();
  const state = usePulse((s) => s.resultsState);
  return (
    <Button
      variant="outline"
      size="sm"
      className="print:hidden"
      disabled={state === "loading"}
      onClick={() => void usePulse.getState().refreshResults()}
    >
      <RefreshCw className={`size-4 ${state === "loading" ? "animate-spin" : ""}`} />
      {loc({ en: "Refresh", ar: "تحديث" })}
    </Button>
  );
}

/**
 * Renders `children` only when there are enough responses to show anything.
 * Otherwise explains, in plain words, why the screen is empty.
 */
export function NeedResults({ children }: { children: (r: ReadyResults) => ReactNode }) {
  const { loc } = useT();
  const results = usePulse((s) => s.results);
  const state = usePulse((s) => s.resultsState);
  const error = usePulse((s) => s.resultsError);

  if (!results) {
    if (state === "error") {
      return (
        <Card>
          <p className="text-sm text-score-crit">{error}</p>
          <Button className="mt-4" variant="outline" onClick={() => void usePulse.getState().refreshResults()}>
            {loc({ en: "Try again", ar: "حاول مجدداً" })}
          </Button>
        </Card>
      );
    }
    return (
      <Card aria-busy="true">
        <div className="h-24 animate-pulse rounded-xl bg-sand-2" />
      </Card>
    );
  }
  if (!results.enough || !results.engagement) {
    return (
      <Card>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">
          {loc({ en: "Waiting for responses", ar: "بانتظار الإجابات" })}
        </p>
        <p className="mt-2 font-display text-3xl tabular-nums text-ink">
          {results.total} / {results.headcount}
        </p>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          {loc({
            en: `Results appear once at least ${results.k} people have answered. This protects everyone who answers early. Nothing on this screen is an estimate or a sample figure.`,
            ar: `تظهر النتائج بعد أن يجيب ${results.k} أشخاص على الأقل. هذا يحمي من يجيب مبكراً. لا شيء في هذه الشاشة تقدير أو رقم تجريبي.`,
          })}
        </p>
        <div className="mt-4">
          <RefreshButton />
        </div>
      </Card>
    );
  }
  return <>{children(results as ReadyResults)}</>;
}

/** Small note under a chart or table explaining hidden groups. */
export function HiddenNote({ count }: { count: number }) {
  const { loc } = useT();
  const k = usePulse((s) => s.results?.k ?? 5);
  if (!count) return null;
  return (
    <p className="text-xs text-subtle">
      {loc({
        en: `${count} group${count === 1 ? " is" : "s are"} hidden: fewer than ${k} people answered, or showing it would reveal a small group.`,
        ar: `${count} مجموعة محجوبة: أجاب أقل من ${k} أشخاص، أو أن عرضها يكشف مجموعة صغيرة.`,
      })}
    </p>
  );
}
