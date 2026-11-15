import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Mark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { LangToggle } from "@/components/lang-toggle";
import { useCensus } from "@/lib/census";
import { formatIsoDate } from "@/lib/pulse/config";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/survey/complete")({ component: Complete });

function Complete() {
  const { t, loc, lang } = useT();
  const { fieldClose } = useCensus();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-4">
      <header className="mb-10 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Mark className="size-8" />
          <span className="text-sm font-semibold text-ink">{t("app")}</span>
        </Link>
        <LangToggle />
      </header>
      <main className="step-in flex flex-1 flex-col justify-center gap-5 pb-16">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent text-sand" aria-hidden>
          <Check className="size-6" strokeWidth={2.5} />
        </span>
        <h1 className="font-display text-4xl font-medium leading-tight tracking-tight text-ink">{t("thanksTitle")}</h1>
        <p className="max-w-prose text-base leading-relaxed text-muted">{t("thanksBody")}</p>
        {fieldClose ? (
          <p className="text-sm text-muted">
            {loc({ en: "The survey closes on", ar: "يُغلق الاستبيان في" })} {formatIsoDate(fieldClose, lang)}.
          </p>
        ) : null}
        <Button asChild variant="outline" className="mt-2 self-start">
          <Link to="/">{t("thanksBack")}</Link>
        </Button>
      </main>
    </div>
  );
}
