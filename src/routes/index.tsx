import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Lock, Smartphone, Languages, Bell, Mail } from "lucide-react";
import { LangToggle } from "@/components/lang-toggle";
import { Mark } from "@/components/mark";
import { formatIsoDate, useCensus } from "@/lib/census";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { t, lang, loc } = useT();
  const { rate, fieldClose, kFloor, status } = useCensus();
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgb(44_106_106/0.08),transparent_60%)]" />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 md:px-8">
        <div className="flex items-center gap-2.5">
          <Mark className="size-9" />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-ink">{t("app")}</div>
            <div className="text-xs text-muted">{t("venue")}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/faq"
            className="hidden h-11 items-center px-3 text-sm font-medium text-muted hover:text-ink sm:inline-flex"
          >
            {t("faq")}
          </Link>
          <Link
            to="/insights"
            className="hidden h-11 items-center px-3 text-sm font-medium text-muted hover:text-ink sm:inline-flex"
          >
            {loc({ en: "Staff sign-in", ar: "دخول الفريق" })}
          </Link>
          <LangToggle />
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-16 pt-6 md:px-8 md:pt-12">
        <section className="grid items-end gap-10 lg:grid-cols-12">
          <div className="flex flex-col gap-5 lg:col-span-7">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">{t("heroEyebrow")}</p>
            <h1 className="font-display text-[2.35rem] font-medium leading-[1.12] tracking-tight text-ink md:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted md:text-lg">{t("heroBody")}</p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-2 px-3 py-1.5 text-ink">
                <Lock className="size-3.5" />
                {t("anonymous")}
              </span>
              {fieldClose ? (
                <span>
                  {t("closes")} {formatIsoDate(fieldClose, lang)}
                </span>
              ) : null}
              {rate !== null && status !== "draft" ? (
                <span className="tabular-nums">
                  {rate}% {t("responseLive")}
                </span>
              ) : null}
              <span className="rounded-full bg-sand-2 px-2 py-0.5 text-[11px] uppercase text-ink">
                {status === "open" ? t("statusOpen") : status === "closed" || status === "archived" ? t("statusClosed") : loc({ en: "Opening soon", ar: "يُفتح قريباً" })}
              </span>
            </div>
          </div>

          <div className="grid gap-3 lg:col-span-5">
            <Link
              to="/survey"
              className="group flex min-h-28 flex-col justify-between rounded-2xl bg-ink p-5 text-sand shadow-[var(--shadow-border)] transition-transform duration-150 active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-2xl font-medium">{t("takeSurvey")}</div>
                  <p className="mt-1 text-sm leading-relaxed text-sand/70">{t("takeSurveyHint")}</p>
                </div>
                <ArrowUpRight className="size-5 shrink-0 text-sand/70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <span className="mt-4 text-xs uppercase tracking-[0.16em] text-sand/50">{loc({ en: "Start", ar: "ابدأ" })}</span>
            </Link>
            <Link
              to="/insights"
              className="group flex min-h-28 flex-col justify-between rounded-2xl bg-paper p-5 text-ink shadow-[var(--shadow-border)] transition-transform duration-150 active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-2xl font-medium">{t("insights")}</div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{loc({ en: "Results, heat maps, drivers and action plans. Sign-in required.", ar: "النتائج والخرائط الحرارية والمحركات وخطط العمل. يتطلب تسجيل الدخول." })}</p>
                </div>
                <ArrowUpRight className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <span className="mt-4 text-xs uppercase tracking-[0.16em] text-subtle">{t("openInsights")}</span>
            </Link>
          </div>
        </section>

        <section>
          <h2 className="mb-4 font-display text-xl text-ink">{t("featuresTitle")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: t("f1t"), b: t("f1b"), icon: Lock },
              { t: t("f2t"), b: t("f2b"), icon: Languages },
              { t: t("f3t"), b: t("f3b"), icon: Mail },
              { t: t("f4t"), b: t("f4b"), icon: Bell },
            ].map((f) => (
              <article key={f.t} className="rounded-2xl bg-paper p-5 shadow-[var(--shadow-border)]">
                <f.icon className="mb-3 size-4 text-accent" />
                <h3 className="text-sm font-semibold text-ink">{f.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.b}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link to="/faq" className="hover:text-ink">
              {t("faq")}
            </Link>
            <span>{t("footAnon")}</span>
            <span>{t("footBi")}</span>
            <span className="inline-flex items-center gap-1">
              <Smartphone className="size-3" />
              {t("footMobile")}
            </span>
            <span>{t("footRemind")}</span>
            <span>{t("footMail")}</span>
          </div>
          <p>
            {t("tagline")} · {lang === "ar" ? "مسقط" : "Muscat"} · k≥{kFloor}
          </p>
        </footer>
      </main>
    </div>
  );
}
