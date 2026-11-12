import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";
import { LangToggle } from "@/components/lang-toggle";
import { Mark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SETTINGS_NAV } from "@/lib/nav";
import { useCensus } from "@/lib/census";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";
import { AdminGate } from "@/components/admin-gate";
import { UserButton } from "@/lib/auth/gates";

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
  const { rate, completed, headcount, status, cycleName } = useCensus();
  const saveState = useSettings((s) => s.saveState);
  const saveError = useSettings((s) => s.saveError);

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-e border-border bg-paper/80 p-4 lg:flex">
        <SideNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-border bg-sand/90 px-4 py-2.5 backdrop-blur-sm lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <MobileNav />
            <Mark className="size-8" />
          </div>
          <p className="text-xs text-muted lg:text-sm">
            <span className="font-medium text-ink">{loc(cycleName)}</span>
            {" · "}
            <StatusPill status={status} />
            {" · "}
            <span className="tabular-nums">{rate}%</span>
            {" · "}
            <span className="tabular-nums">
              {completed}/{headcount}
            </span>
          </p>
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

function StatusPill({ status }: { status: string }) {
  const { t } = useT();
  const label =
    status === "open"
      ? t("statusOpen")
      : status === "closed"
        ? t("statusClosed")
        : status === "archived"
          ? t("statusArchived")
          : t("statusDraft");
  return (
    <span className="rounded-full bg-sand-2 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink">
      {label}
    </span>
  );
}

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useT();
  return (
    <>
      <Link to="/" className="mb-6 flex items-center gap-2.5" onClick={onNavigate}>
        <Mark className="size-8" />
        <div className="leading-tight">
          <div className="text-sm font-semibold text-ink">{t("app")}</div>
          <div className="text-xs text-muted">{t("groupSettings")}</div>
        </div>
      </Link>
      <Link
        to="/insights"
        onClick={onNavigate}
        className="mb-4 flex h-10 items-center rounded-lg px-2 text-sm text-muted hover:bg-sand-2 hover:text-ink"
      >
        {t("insights")}
      </Link>
      <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">
        {t("groupSettings")}
      </p>
      <ul className="flex flex-col gap-0.5">
        {SETTINGS_NAV.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              onClick={onNavigate}
              activeOptions={{ exact: item.exact }}
              className="flex h-10 items-center gap-2 rounded-lg px-2 text-sm text-muted hover:bg-sand-2 hover:text-ink"
              activeProps={{ className: "bg-sand-2 font-medium text-ink" }}
            >
              <item.icon className="size-4 shrink-0" />
              {t(item.key)}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function MobileNav() {
  const [open, setOpen] = useState(false);
  const { t } = useT();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("groupSettings")}>
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="start" className="pt-12">
        <SideNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
