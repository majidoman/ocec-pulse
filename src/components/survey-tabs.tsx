import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openSurveyPreview } from "@/lib/pulse/preview";
import { useT } from "@/lib/store";

/** One "Survey" area in Settings: the list of surveys, the questions, and the look. */
export function SurveyTabs() {
  const { loc } = useT();
  const tabs = [
    { to: "/settings/surveys", label: { en: "Surveys", ar: "الاستبيانات" } },
    { to: "/settings/builder", label: { en: "Questions", ar: "الأسئلة" } },
    { to: "/settings/appearance", label: { en: "Look", ar: "الشكل" } },
  ] as const;
  return (
    <nav className="-mt-2 flex gap-1 overflow-x-auto border-b border-border" aria-label={loc({ en: "Survey", ar: "الاستبيان" })}>
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className="-mb-px whitespace-nowrap border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted hover:text-ink"
          activeProps={{ className: "border-ink! text-ink" }}
        >
          {loc(tab.label)}
        </Link>
      ))}
    </nav>
  );
}

/** The single preview button, placed at the end of the page after the settings. */
export function PreviewFooter() {
  const { loc } = useT();
  return (
    <div className="flex justify-end border-t border-border pt-4">
      <Button onClick={() => void openSurveyPreview()}>
        <ExternalLink className="size-4" /> {loc({ en: "Preview the survey in a new tab", ar: "معاينة الاستبيان في تبويب جديد" })}
      </Button>
    </div>
  );
}
