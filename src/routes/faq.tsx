import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { LangToggle } from "@/components/lang-toggle";
import { Mark } from "@/components/mark";
import { FAQS } from "@/lib/faq";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/faq")({ component: FaqPage });

function FaqPage() {
  const { t, loc } = useT();
  return (
    <div className="relative min-h-dvh">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-4 md:px-0">
        <Link to="/" className="flex items-center gap-2.5 text-ink">
          <Mark className="size-9" />
          <div className="leading-tight">
            <div className="text-sm font-semibold">{t("app")}</div>
            <div className="text-xs text-muted">{t("faq")}</div>
          </div>
        </Link>
        <LangToggle />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-20 pt-4 md:px-0">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">{t("voice")}</p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink md:text-4xl">
            {t("faqTitle")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{t("faqHint")}</p>
        </div>

        <ol className="flex flex-col gap-2">
          {FAQS.map((item, i) => (
            <li key={item.q.ar}>
              <details className="group rounded-2xl bg-paper px-5 py-4 shadow-[var(--shadow-border)] open:pb-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-start marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-medium leading-relaxed text-ink md:text-base">
                    <span className="me-2 tabular-nums text-subtle">{i + 1}.</span>
                    {loc(item.q)}
                  </span>
                  <ChevronDown className="mt-0.5 size-4 shrink-0 text-subtle transition-transform duration-150 group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{loc(item.a)}</p>
              </details>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            to="/survey"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-sand"
          >
            {t("takeSurvey")}
            <ArrowUpRight className="size-4" />
          </Link>
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-paper px-4 text-sm font-medium text-ink"
          >
            {t("home")}
          </Link>
        </div>
      </main>
    </div>
  );
}
