import { createFileRoute, Link } from "@tanstack/react-router";
import { Mark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { LangToggle } from "@/components/lang-toggle";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/survey/complete")({ component: Complete });

function Complete() {
  const { t, loc } = useT();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-4">
      <header className="mb-10 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Mark className="size-8" />
          <span className="text-sm font-semibold text-ink">{t("app")}</span>
        </Link>
        <LangToggle />
      </header>
      <div className="flex flex-1 flex-col justify-center gap-6 pb-16">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">{t("anonymous")}</p>
        <h1 className="font-display text-4xl font-medium leading-tight tracking-tight text-ink">{t("thanksTitle")}</h1>
        <p className="text-base leading-relaxed text-muted">{t("thanksBody")}</p>
        <p className="text-sm text-accent">
          {loc({ en: "Your answers were received and stored without your name.", ar: "وصلت إجاباتك وحُفظت دون اسمك." })}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link to="/">{t("thanksBack")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
