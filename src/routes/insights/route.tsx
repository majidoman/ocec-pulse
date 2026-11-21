import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { DemoBanner, SurveySwitcher } from "@/components/survey-switcher";
import { LangToggle } from "@/components/lang-toggle";
import { Mark } from "@/components/mark";
import { useCensus } from "@/lib/census";
import { useT } from "@/lib/store";
import { AdminGate } from "@/components/admin-gate";
import { RefreshButton } from "@/components/results";
import { UserButton } from "@/lib/auth/gates";
import { AppMobileNav, AppSideNav } from "@/components/app-nav";

export const Route = createFileRoute("/insights")({ component: GatedInsights });

function GatedInsights() {
  return (
    <AdminGate>
      <InsightsShell />
    </AdminGate>
  );
}

function InsightsShell() {
  const { t } = useT();
  const { rate, completed, headcount } = useCensus();
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-56 lg:w-60 shrink-0 flex-col overflow-y-auto border-e border-border bg-paper/80 p-4 print:hidden md:flex">
        <AppSideNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <DemoBanner />
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-sand/90 px-4 py-2.5 backdrop-blur-sm print:hidden lg:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <AppMobileNav />
            <Mark className="size-8" />
          </div>
          <div className="hidden flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted sm:flex lg:text-sm">
            <SurveySwitcher />
            {" · "}
            <span className="tabular-nums">{rate}%</span>
            {" · "}
            <span className="tabular-nums">
              {completed}/{headcount}
            </span>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <RefreshButton />
            <Link
              to="/faq"
              className="inline-flex h-11 items-center px-2 text-sm font-medium text-muted hover:text-ink sm:px-3"
            >
              {t("faq")}
            </Link>
            <LangToggle />
            <div className="hidden md:block">
              <UserButton />
            </div>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
