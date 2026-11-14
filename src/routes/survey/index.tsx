import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LangToggle } from "@/components/lang-toggle";
import { Mark } from "@/components/mark";
import { Likert, Enps } from "@/components/likert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CONTRACTS,
  LEVELS,
  TENURE,
} from "@/lib/questionnaire";
import { questionsFor, useCensus } from "@/lib/census";
import { checkToken, submitResponse, type SubmitResult, type TokenState } from "@/lib/pulse/api";
import { formatIsoDate } from "@/lib/pulse/config";
import { usePulse } from "@/lib/pulse/session";
import { useSettings } from "@/lib/settings-store";
import { useApp, useT } from "@/lib/store";

export const Route = createFileRoute("/survey/")({
  validateSearch: (s: Record<string, unknown>): { t?: string } => (typeof s.t === "string" && s.t ? { t: s.t } : {}),
  component: SurveyPage,
});

type Reason = Exclude<SubmitResult, { ok: true }>["reason"];

function SurveyPage() {
  const { t, loc, lang } = useT();
  const draft = useApp((s) => s.draft);
  const submittedOpenLink = useApp((s) => s.submittedOpenLink);
  const setAnswer = useApp((s) => s.setAnswer);
  const setDemo = useApp((s) => s.setDemo);
  const setStep = useApp((s) => s.setStep);
  const markSubmitted = useApp((s) => s.markSubmitted);
  const navigate = useNavigate();
  const { t: token } = Route.useSearch();
  const publicState = usePulse((s) => s.publicState);
  const [intro, setIntro] = useState(true);
  const [error, setError] = useState(false);
  const [tokenState, setTokenState] = useState<TokenState | "checking" | "none">(token ? "checking" : "none");
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Reason | "network" | null>(null);
  const { dimensions, questions, departments, privacyNotice, cycleName, fieldClose, status, allowOpenLink, supportEmail } = useCensus();
  const kFloor = useSettings((s) => s.anonymity.kFloor);
  const steps = [...dimensions.map((d) => d.id), "open", "demo"];

  useEffect(() => {
    if (!token) return;
    let alive = true;
    checkToken({ data: { token } })
      .then((res) => alive && setTokenState(res.state))
      .catch(() => alive && setTokenState("invalid"));
    return () => {
      alive = false;
    };
  }, [token]);

  const stepId = steps[Math.min(draft.step, steps.length - 1)];
  const totalSteps = steps.length;
  const progress = intro ? 0 : ((draft.step + 1) / totalSteps) * 100;

  const dimension = dimensions.find((d) => d.id === stepId);
  const dimQuestions = useMemo(
    () => (dimension ? questionsFor(dimension, questions) : []),
    [dimension, questions],
  );

  function currentComplete() {
    if (stepId === "open" || stepId === "demo") return true;
    return dimQuestions
      .filter((q) => q.required)
      .every((q) => typeof draft.answers[q.id] === "number");
  }

  async function goNext() {
    if (!currentComplete()) {
      setError(true);
      return;
    }
    setError(false);
    if (draft.step < totalSteps - 1) {
      setStep(draft.step + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    setSending(true);
    setFailure(null);
    try {
      const res = await submitResponse({
        data: {
          token: token || undefined,
          lang,
          answers: draft.answers,
          department: draft.department,
          tenure: draft.tenure,
          level: draft.level,
          contract: draft.contract,
        },
      });
      if (res.ok) {
        markSubmitted(Boolean(token));
        void navigate({ to: "/survey/complete" });
        return;
      }
      setFailure(res.reason);
      if (res.reason === "token_used") setTokenState("used");
    } catch {
      // The answers stay on this device, so the person can simply try again.
      setFailure("network");
    } finally {
      setSending(false);
    }
  }

  const blocked: { title: string; body: string } | null =
    publicState !== "ready"
      ? null
      : status !== "open"
        ? {
            title: loc({ en: "The census is not open", ar: "الاستبيان غير مفتوح" }),
            body:
              status === "draft"
                ? loc({ en: "It has not started yet. You will be told when it opens.", ar: "لم يبدأ بعد. سيُعلن عن موعد فتحه." })
                : loc({ en: "It has closed. Thank you to everyone who answered.", ar: "أُغلق. شكراً لكل من أجاب." }),
          }
        : tokenState === "used"
          ? {
              title: loc({ en: "This link has already been used", ar: "استُخدم هذا الرابط من قبل" }),
              body: loc({ en: "Each personal link works once. If you have answered, there is nothing more to do.", ar: "كل رابط شخصي يعمل مرة واحدة. إن كنت قد أجبت فلا شيء آخر مطلوب." }),
            }
          : tokenState === "invalid"
            ? {
                title: loc({ en: "This link is not valid", ar: "هذا الرابط غير صالح" }),
                body: loc({ en: "Open the link from your invitation email again, or ask People & Culture for a new one.", ar: "افتح الرابط من رسالة الدعوة مجدداً، أو اطلب رابطاً جديداً من الأفراد والثقافة." }),
              }
            : !token && !allowOpenLink
              ? {
                  title: loc({ en: "Use your personal link", ar: "استخدم رابطك الشخصي" }),
                  body: loc({ en: "This census is answered through the link in your invitation email.", ar: "يُجاب على هذا الاستبيان عبر الرابط في رسالة الدعوة." }),
                }
              : !token && submittedOpenLink
                ? {
                    title: loc({ en: "Already answered on this device", ar: "تمت الإجابة من هذا الجهاز" }),
                    body: loc({ en: "Thank you. One answer per person keeps the results fair.", ar: "شكراً لك. إجابة واحدة لكل شخص تحفظ عدالة النتائج." }),
                  }
                : null;

  if (publicState !== "ready" || tokenState === "checking") {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-6" aria-busy="true">
        <div className="h-8 w-40 animate-pulse rounded-md bg-sand-2" />
        <div className="mt-10 h-40 animate-pulse rounded-2xl bg-sand-2" />
        {publicState === "error" ? (
          <p className="mt-6 text-sm text-score-crit">
            {loc({ en: "Could not load the census. Check your connection and reload.", ar: "تعذّر تحميل الاستبيان. تحقق من الاتصال وأعد التحميل." })}
          </p>
        ) : null}
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-4 md:py-6">
        <header className="mb-10 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 text-ink">
            <Mark className="size-8" />
            <span className="text-sm font-semibold">{loc(cycleName)}</span>
          </Link>
          <LangToggle />
        </header>
        <div className="flex flex-1 flex-col justify-center gap-4 pb-16">
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink">{blocked.title}</h1>
          <p className="text-base leading-relaxed text-muted">{blocked.body}</p>
          {supportEmail ? (
            <p className="text-sm text-muted" dir="ltr">
              {supportEmail}
            </p>
          ) : null}
          <Button asChild variant="outline" className="self-start">
            <Link to="/">{t("thanksBack")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-4 md:py-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 text-ink">
          <Mark className="size-8" />
          <span className="text-sm font-semibold">{loc(cycleName)}</span>
        </Link>
        <LangToggle />
      </header>

      {intro ? (
        <div className="flex flex-1 flex-col gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">{t("confidential")}</p>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink">{loc(cycleName)}</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">{loc(privacyNotice)}</p>
          </div>
          <ul className="grid gap-2 text-sm text-ink">
            <li className="rounded-xl bg-paper px-4 py-3 shadow-[var(--shadow-border)]">{t("minutes")}</li>
            <li className="rounded-xl bg-paper px-4 py-3 shadow-[var(--shadow-border)]">
              {loc({
                en: `Results only appear for groups of ${kFloor} or more people. Nobody, including management, can see one person's answers.`,
                ar: `لا تظهر النتائج إلا لمجموعات من ${kFloor} أشخاص فأكثر، ولا يستطيع أحد، بما في ذلك الإدارة، رؤية إجابات شخص بعينه.`,
              })}
            </li>
            <li className="rounded-xl bg-paper px-4 py-3 shadow-[var(--shadow-border)]">
              {loc({
                en: "Anonymous, not just confidential: your name, email and link are never saved with your answers. The link only stops a second response.",
                ar: "مجهول الهوية، وليس سرياً فقط: لا يُحفظ اسمك ولا بريدك ولا رابطك مع إجاباتك. الرابط يمنع الإجابة مرتين فقط.",
              })}
            </li>
            <li className="rounded-xl bg-paper px-4 py-3 shadow-[var(--shadow-border)]">
              {loc({
                en: "Written comments are stored apart from your ratings and read without names by HR and senior leaders. Department heads see only their own department's comments. Please don't write names.",
                ar: "تُحفظ التعليقات المكتوبة منفصلة عن تقييماتك، ويقرؤها فريق الموارد البشرية والقيادة دون أسماء، ولا يرى رئيس القسم إلا تعليقات قسمه. لا تكتب أسماء من فضلك.",
              })}
            </li>
            <li className="rounded-xl bg-paper px-4 py-3 shadow-[var(--shadow-border)]">
              {loc({ en: "Your answers stay on this device until you press Submit", ar: "تبقى إجاباتك على هذا الجهاز حتى تضغط إرسال" })}
            </li>
            {fieldClose ? (
              <li className="rounded-xl bg-paper px-4 py-3 shadow-[var(--shadow-border)]">
                {t("closes")} {formatIsoDate(fieldClose, lang)}
              </li>
            ) : null}
          </ul>
          <div className="rounded-2xl bg-paper p-5 shadow-[var(--shadow-border)]">
            <h2 className="text-sm font-semibold text-ink">{t("scaleTitle")}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{t("scaleBody")}</p>
            <p className="mt-3 text-xs text-subtle" dir={lang === "ar" ? "rtl" : "ltr"}>
              1 {loc({ en: "Strongly disagree", ar: "أعارض بشدة" })} → 5{" "}
              {loc({ en: "Strongly agree", ar: "أوافق بشدة" })}
            </p>
          </div>
          <Button className="mt-auto w-full" onClick={() => setIntro(false)}>
            {t("continue")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-6">
          <div>
            <h1 className="font-display text-2xl font-medium text-ink">
              {dimension
                ? loc(dimension.name)
                : stepId === "enps"
                  ? t("kpiEnps")
                  : stepId === "open"
                    ? loc({ en: "In your words", ar: "بكلماتك" })
                    : t("demoTitle")}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {dimension
                ? loc(dimension.blurb)
                : stepId === "demo"
                  ? t("demoBody")
                  : stepId === "enps"
                    ? loc({
                        en: "0 = not at all likely, 10 = extremely likely.",
                        ar: "٠ = غير مرجّح إطلاقاً، ١٠ = مرجّح للغاية.",
                      })
                    : loc({
                        en: "Optional. Do not include your name.",
                        ar: "اختياري. لا تذكر اسمك.",
                      })}
            </p>
          </div>

          {dimension
            ? dimQuestions.map((q) => (
                <fieldset key={q.id} className="rounded-2xl bg-paper p-4 shadow-[var(--shadow-border)]">
                  <legend className="float-left mb-3 w-full text-sm font-medium leading-relaxed text-ink">{loc(q.text)}</legend>
                  <div className="clear-both" />
                  {q.type === "enps" ? (
                    <Enps
                      value={typeof draft.answers[q.id] === "number" ? (draft.answers[q.id] as number) : undefined}
                      onChange={(v) => {
                        setError(false);
                        setAnswer(q.id, v);
                      }}
                    />
                  ) : q.type === "text" || q.type === "long" || q.type === "short" ? (
                    <Textarea
                      value={typeof draft.answers[q.id] === "string" ? (draft.answers[q.id] as string) : ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                    />
                  ) : (
                    <Likert
                      name={q.id}
                      value={typeof draft.answers[q.id] === "number" ? (draft.answers[q.id] as number) : undefined}
                      onChange={(v) => {
                        setError(false);
                        setAnswer(q.id, v);
                      }}
                    />
                  )}
                </fieldset>
              ))
            : null}

          {stepId === "open"
            ? questions.filter((q) => q.type === "text" && q.dimension === "open").map((q) => (
                <div key={q.id} className="flex flex-col gap-2">
                  <Label htmlFor={q.id}>{loc(q.text)}</Label>
                  <Textarea
                    id={q.id}
                    value={typeof draft.answers[q.id] === "string" ? (draft.answers[q.id] as string) : ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    maxLength={600}
                  />
                </div>
              ))
            : null}

          {stepId === "demo" ? (
            <div className="grid gap-4">
              <DemoSelect
                label={t("dept")}
                value={draft.department}
                onChange={(v) => setDemo("department", v)}
                options={departments.map((d) => ({ id: d.id, label: loc(d.name) }))}
                placeholder={t("preferNot")}
              />
              <DemoSelect
                label={t("tenure")}
                value={draft.tenure}
                onChange={(v) => setDemo("tenure", v)}
                options={TENURE.map((d) => ({ id: d.id, label: loc(d.name) }))}
                placeholder={t("preferNot")}
              />
              <DemoSelect
                label={t("level")}
                value={draft.level}
                onChange={(v) => setDemo("level", v)}
                options={LEVELS.map((d) => ({ id: d.id, label: loc(d.name) }))}
                placeholder={t("preferNot")}
              />
              <DemoSelect
                label={t("contract")}
                value={draft.contract}
                onChange={(v) => setDemo("contract", v)}
                options={CONTRACTS.map((d) => ({ id: d.id, label: loc(d.name) }))}
                placeholder={t("preferNot")}
              />
            </div>
          ) : null}

          {error ? <p className="text-sm text-score-crit" role="alert">{t("required")}</p> : null}
          {failure ? (
            <p className="text-sm text-score-crit" role="alert">
              {failure === "network"
                ? loc({ en: "Not sent. Your answers are still here. Check your connection and press Submit again.", ar: "لم تُرسل. إجاباتك ما زالت هنا. تحقق من الاتصال واضغط إرسال مجدداً." })
                : failure === "incomplete"
                  ? loc({ en: "Some required questions are unanswered. Go back and check each page.", ar: "بعض الأسئلة المطلوبة بلا إجابة. عُد وراجع كل صفحة." })
                  : failure === "rate_limited"
                    ? loc({ en: "Too many submissions from this network just now. Wait a few minutes and press Submit again. Your answers are still here.", ar: "عدد كبير من الإرسالات من هذه الشبكة الآن. انتظر دقائق ثم اضغط إرسال مجدداً. إجاباتك ما زالت هنا." })
                  : failure === "closed" || failure === "not_open_yet"
                    ? loc({ en: "The census is not accepting answers right now.", ar: "الاستبيان لا يستقبل الإجابات الآن." })
                    : loc({ en: "This link cannot be used to submit.", ar: "لا يمكن الإرسال بهذا الرابط." })}
            </p>
          ) : null}

          <Progress value={progress} className="mt-auto h-1.5" aria-label={loc({ en: "Progress", ar: "التقدّم" })} />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="w-28"
              disabled={draft.step === 0}
              onClick={() => {
                setError(false);
                setStep(Math.max(0, draft.step - 1));
                window.scrollTo({ top: 0 });
              }}
            >
              {t("back")}
            </Button>
            <Button className="flex-1" disabled={sending} onClick={() => void goNext()}>
              {sending ? loc({ en: "Sending…", ar: "جارٍ الإرسال…" }) : draft.step >= totalSteps - 1 ? t("submit") : t("next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DemoSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
  options: { id: string; label: string }[];
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink">{label}</span>
      <select
        className="h-11 rounded-md border border-border bg-paper px-3 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

