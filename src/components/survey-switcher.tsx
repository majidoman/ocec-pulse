import { useEffect } from "react";
import { FlaskConical } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentSurvey, useSurveys } from "@/lib/pulse/surveys-store";
import { useT } from "@/lib/store";

const NEW = "__new";
const MANAGE = "__manage";

/**
 * Drop-down of the organisation's surveys in the top bar (and the Survey builder). Choosing one makes
 * every settings and results page work on that survey.
 */
export function SurveySwitcher({ className = "" }: { className?: string }) {
  const { loc } = useT();
  const navigate = useNavigate();
  const { surveys, current, state, load, switchTo } = useSurveys();
  useEffect(() => {
    void load();
  }, [load]);
  const statusText = (s: string) =>
    s === "open"
      ? loc({ en: "open", ar: "مفتوح" })
      : s === "closed"
        ? loc({ en: "closed", ar: "مغلق" })
        : s === "archived"
          ? loc({ en: "archived", ar: "مؤرشف" })
          : loc({ en: "draft", ar: "مسودة" });
  if (state !== "ready") return <span className={`inline-block h-9 w-48 animate-pulse rounded-md bg-sand-2 ${className}`} aria-hidden />;
  return (
    <label className={`inline-flex items-center gap-2 ${className}`}>
      <span className="sr-only">{loc({ en: "Survey", ar: "الاستبيان" })}</span>
      <select
        value={current}
        onChange={(e) => {
          const v = e.target.value;
          if (v === NEW) void navigate({ to: "/settings/surveys", search: { new: true } });
          else if (v === MANAGE) void navigate({ to: "/settings/surveys" });
          else if (v !== current) void switchTo(v);
        }}
        className="h-9 max-w-[16rem] truncate rounded-md border border-border bg-paper px-2 text-sm font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs"
      >
        {surveys.map((s) => (
          <option key={s.id} value={s.id}>
            {`${loc(s.name)}${s.isDemo ? ` (${loc({ en: "demo", ar: "تجريبي" })})` : ""} — ${statusText(s.status)}`}
          </option>
        ))}
        <option disabled>──────────</option>
        <option value={NEW}>{loc({ en: "＋ New survey…", ar: "＋ استبيان جديد…" })}</option>
        <option value={MANAGE}>{loc({ en: "Manage surveys…", ar: "إدارة الاستبيانات…" })}</option>
      </select>
    </label>
  );
}

/** A strip across staff pages while the demo survey is the one being viewed. */
export function DemoBanner() {
  const { loc } = useT();
  const cur = useCurrentSurvey();
  const navigate = useNavigate();
  if (!cur?.isDemo) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-accent px-4 py-1.5 text-center text-xs font-medium text-accent-fg print:hidden" role="status">
      <FlaskConical className="size-3.5" aria-hidden />
      {loc({ en: "Demo survey: sample answers, not real people. Explore every page freely.", ar: "استبيان تجريبي: إجابات تجريبية وليست لأشخاص حقيقيين. تصفّح كل الصفحات بحرية." })}
      <button type="button" className="underline underline-offset-2" onClick={() => void navigate({ to: "/settings/surveys" })}>
        {loc({ en: "Switch or remove", ar: "تبديل أو حذف" })}
      </button>
    </div>
  );
}
