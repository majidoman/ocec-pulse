import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AppName } from "@/components/app-name";
import { LangToggle } from "@/components/lang-toggle";
import { Mark } from "@/components/mark";

/** Page frame shared by the sign-in, forgot-password and reset-password screens. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-6">
      <header className="mb-10 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 text-ink">
          <Mark className="size-9" />
          <span className="text-sm font-semibold">
            <AppName />
          </span>
        </Link>
        <LangToggle />
      </header>
      <main className="step-in flex flex-1 flex-col justify-center gap-6 pb-16">{children}</main>
    </div>
  );
}
