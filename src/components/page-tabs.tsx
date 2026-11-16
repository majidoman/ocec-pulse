import { Link } from "@tanstack/react-router";
import { useT } from "@/lib/store";
import type { Localized } from "@/lib/types";

/** Related pages shown as tabs under one menu item, so the side menu stays short. */
export const TAB_GROUPS: Record<string, { to: string; label: Localized }[]> = {
  depts: [
    { to: "/insights/departments", label: { en: "Departments", ar: "الإدارات" } },
    { to: "/insights/heatmap", label: { en: "At a glance", ar: "النظرة الشاملة" } },
  ],
  compare: [
    { to: "/insights/trends", label: { en: "Trends", ar: "الاتجاهات" } },
    { to: "/insights/compare", label: { en: "Year on year", ar: "سنة بسنة" } },
    { to: "/insights/benchmarks", label: { en: "Benchmarks", ar: "المعايير المرجعية" } },
  ],
  actions: [
    { to: "/insights/drivers", label: { en: "Where to focus", ar: "أين نركّز؟" } },
    { to: "/insights/actions", label: { en: "Action plans", ar: "خطط العمل" } },
  ],
  reports: [
    { to: "/insights/executive", label: { en: "Executive summary", ar: "الملخص التنفيذي" } },
    { to: "/insights/ai", label: { en: "AI briefing", ar: "الإحاطة الذكية" } },
    { to: "/insights/reports", label: { en: "Reports", ar: "التقارير" } },
    { to: "/insights/design", label: { en: "Methodology", ar: "المنهجية" } },
  ],
  invites: [
    { to: "/insights/invitations", label: { en: "Invitations", ar: "الدعوات" } },
    { to: "/insights/reminders", label: { en: "Reminders", ar: "التذكيرات" } },
  ],
};

export function PageTabs({ group }: { group: keyof typeof TAB_GROUPS }) {
  const { loc } = useT();
  return (
    <nav className="-mt-2 flex gap-1 overflow-x-auto border-b border-border print:hidden" aria-label={loc({ en: "Sections", ar: "الأقسام" })}>
      {TAB_GROUPS[group].map((tab) => (
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
