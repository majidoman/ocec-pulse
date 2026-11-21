import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SaveBar } from "@/components/save-bar";
import { DemoBanner, SurveySwitcher } from "@/components/survey-switcher";
import { LangToggle } from "@/components/lang-toggle";
import { Mark } from "@/components/mark";
import { useCensus } from "@/lib/census";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";
import { AdminGate } from "@/components/admin-gate";
import { UserButton } from "@/lib/auth/gates";
import { AppMobileNav, AppSideNav } from "@/components/app-nav";

export const Route = createFileRoute("/settings")({ component: GatedSettings });

function GatedSettings() {
  return (
    <AdminGate adminOnly>
      <SettingsShell />
    </AdminGate>
  );
}

function SettingsShell() {
  const { loc } = useT();
  const { rate, completed, headcount } = useCensus();
  const saveState = useSettings((s) => s.saveState);
  const saveError = useSettings((s) => s.saveError);

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-56 lg:w-60 shrink-0 flex-col overflow-y-auto border-e border-border bg-paper/80 p-4 md:flex">
        <AppSideNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <SaveBar />
        <DemoBanner />
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-border bg-sand/90 px-4 py-2.5 backdrop-blur-sm lg:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <AppMobileNav />
            <Mark className="size-8" />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted lg:text-sm">
            <SurveySwitcher />
            {" · "}
            <span className="tabular-nums">{rate}%</span>
            {" · "}
            <span className="tabular-nums">
              {completed}/{headcount}
            </span>
          </div>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <span
              className={`text-xs ${saveState === "error" ? "text-score-crit" : "text-subtle"}`}
              role="status"
              aria-live="polite"
            >
              {saveState === "saving"
                ? loc({ en: "Saving…", ar: "جارٍ الحفظ…" })
                : saveState === "saved"
                  ? loc({ en: "All changes saved", ar: "حُفظت كل التغييرات" })
                  : saveState === "error"
                    ? `${loc({ en: "Not saved", ar: "لم يُحفظ" })}: ${saveError ?? ""}`
                    : ""}
            </span>
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
