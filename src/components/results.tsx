import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { useSettings } from "@/lib/settings-store";
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
        <LaunchChecklist />
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

/**
 * Before the survey opens, the empty results card lists what still has to be set up, each step
 * linking to its settings page. Read from the settings as they stand (saved or draft).
 */
function LaunchChecklist() {
  const { loc } = useT();
  const source = useSettings((s) => s.source);
  const general = useSettings((s) => s.general);
  const calendar = useSettings((s) => s.calendar);
  const email = useSettings((s) => s.email);
  const departments = useSettings((s) => s.departments);
  const instrumentStatus = useSettings((s) => s.instrumentStatus);
  if (source !== "admin" || general.status !== "draft") return null;
  const headcount = departments.filter((d) => !d.archived).reduce((n, d) => n + (d.headcount || 0), 0);
  const steps: { done: boolean; label: { en: string; ar: string }; to: string }[] = [
    { done: Boolean(general.orgName.en.trim() && general.orgName.ar.trim()), label: { en: "Organisation name in both languages", ar: "اسم المؤسسة باللغتين" }, to: "/settings" },
    { done: Boolean(calendar.fieldOpen && calendar.fieldClose), label: { en: "Opening and closing dates", ar: "تاريخا الفتح والإغلاق" }, to: "/settings" },
    { done: headcount > 0, label: { en: "Departments and headcounts", ar: "الإدارات وأعداد الموظفين" }, to: "/settings/departments" },
    { done: instrumentStatus === "frozen", label: { en: "Questions checked and locked", ar: "مراجعة الأسئلة وقفلها" }, to: "/settings/surveys" },
    {
      done: email.provider === "smtp" && Boolean(email.smtpHost && email.smtpUser && email.fromAddress.includes("@")),
      label: { en: "Sending mailbox set up and tested", ar: "إعداد بريد الإرسال واختباره" },
      to: "/settings/email",
    },
    { done: false, label: { en: "Staff list added, then invitations sent", ar: "إضافة قائمة الموظفين ثم إرسال الدعوات" }, to: "/insights/invitations" },
  ];
  const left = steps.filter((x) => !x.done).length;
  return (
    <div className="mt-6 border-t border-border pt-5">
      <h3 className="text-sm font-semibold text-ink">
        {loc({ en: "Before the survey opens", ar: "قبل فتح الاستبيان" })}
        <span className="ms-2 font-normal text-muted">
          {loc({ en: `${left} of ${steps.length} steps left`, ar: `بقيت ${left} من ${steps.length} خطوات` })}
        </span>
      </h3>
      <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {steps.map((x) => (
          <li key={x.label.en}>
            <Link
              to={x.to}
              className="flex min-h-11 items-center gap-2.5 rounded-lg px-2 text-sm text-ink hover:bg-sand-2 focus-visible:outline-2 focus-visible:outline-ring"
            >
              {x.done ? (
                <CheckCircle2 className="size-4 shrink-0 text-score-high" aria-label={loc({ en: "Done", ar: "تم" })} />
              ) : (
                <Circle className="size-4 shrink-0 text-subtle" aria-label={loc({ en: "To do", ar: "مطلوب" })} />
              )}
              <span className={x.done ? "text-muted line-through decoration-border-strong" : ""}>{loc(x.label)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
