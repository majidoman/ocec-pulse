import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Menu, Settings2 } from "lucide-react";
import { LangToggle } from "@/components/lang-toggle";
import { Mark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NAV } from "@/lib/nav";
import { useCensus } from "@/lib/census";
import { canEditSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";
import { useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { RefreshButton } from "@/components/results";
import { UserButton } from "@/lib/auth/gates";

export const Route = createFileRoute("/insights")({ component: GatedInsights });

const ADMIN_ONLY = new Set(["/insights/invitations", "/insights/reminders"]);

function GatedInsights() {
  return (
    <AdminGate>
      <InsightsShell />
    </AdminGate>
  );
}

function InsightsShell() {
  const { t, loc } = useT();
  const { rate, completed, headcount, cycleName, status } = useCensus();
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-e border-border bg-paper/80 p-4 print:hidden lg:flex">
        <SideNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-sand/90 px-4 py-2.5 backdrop-blur-sm print:hidden lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <MobileNav />
            <Mark className="size-8" />
          </div>
          <p className="hidden text-xs text-muted sm:block lg:text-sm">
            <span className="font-medium text-ink">{loc(cycleName)}</span>
            {" · "}
            <span className="rounded-full bg-sand-2 px-2 py-0.5 text-[11px] uppercase text-ink">{status}</span>
            {" · "}
            <span className="tabular-nums">{rate}%</span>
            {" · "}
            <span className="tabular-nums">
              {completed}/{headcount}
            </span>
          </p>
          <div className="ms-auto flex items-center gap-2">
            <RefreshButton />
            <Link
              to="/faq"
              className="hidden h-11 items-center px-3 text-sm font-medium text-muted hover:text-ink sm:inline-flex"
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

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useT();
  const role = useCensus().currentRole;
  return (
    <>
      <Link to="/" className="mb-6 flex items-center gap-2.5" onClick={onNavigate}>
        <Mark className="size-8" />
        <div className="leading-tight">
          <div className="text-sm font-semibold text-ink">{t("app")}</div>
          <div className="text-xs text-muted">{t("liveCycle")}</div>
        </div>
      </Link>
      <nav className="flex flex-col gap-5">
        {NAV.map((group) => (
          <div key={group.group}>
            <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">
              {t(group.group)}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items
                .filter((item) => canEditSettings(role) || !ADMIN_ONLY.has(item.to))
                .map((item) => (
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
          </div>
        ))}
        {canEditSettings(role) ? (
          <div>
            <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">
              {t("groupSettings")}
            </p>
            <Link
              to="/settings"
              onClick={onNavigate}
              className="flex h-10 items-center gap-2 rounded-lg px-2 text-sm text-muted hover:bg-sand-2 hover:text-ink"
              activeProps={{ className: "bg-sand-2 font-medium text-ink" }}
            >
              <Settings2 className="size-4 shrink-0" />
              {t("groupSettings")}
            </Link>
          </div>
        ) : null}
      </nav>
    </>
  );
}

function MobileNav() {
  const [open, setOpen] = useState(false);
  const { t } = useT();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("home")}>
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="start" className="pt-12">
        <SideNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
