import { useEffect, useRef, useState } from "react";
import { AppName } from "@/components/app-name";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Captcha } from "@/components/captcha";
import { captchaForSubmit, CAPTCHA_MISSING, authErrorText, captchaFetch } from "@/lib/pulse/captcha-client";
import { LangToggle } from "@/components/lang-toggle";
import { Mark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { acceptInvite, getInviteInfo } from "@/lib/pulse/api";
import { ROLE_LABEL } from "@/lib/pulse/config";
import { usePulse } from "@/lib/pulse/session";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/join")({
  validateSearch: (s: Record<string, unknown>): { code?: string } =>
    typeof s.code === "string" ? { code: s.code } : {},
  component: Join,
});

type Info = Awaited<ReturnType<typeof getInviteInfo>>;
const MIN_PASSWORD = 10;

/**
 * Staff invitation link. One page does it all: the invited email is filled in and fixed, the person
 * only chooses a password (or enters the one they already have), and access is activated at once.
 */
function Join() {
  const { loc } = useT();
  const { code } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [info, setInfo] = useState<Info | null>(null);
  const next = `/join?code=${encodeURIComponent(code ?? "")}`;

  useEffect(() => {
    if (!code) return;
    getInviteInfo({ data: { code } })
      .then(setInfo)
      .catch(() => setInfo({ status: "invalid" }));
  }, [code]);

  // Lets the holder of a valid invitation create an account (see the /api/auth sign-up gate).
  useEffect(() => {
    if (!code) return;
    document.cookie = `pulse_invite=${encodeURIComponent(code)}; path=/; max-age=3600; SameSite=Lax${
      window.location.protocol === "https:" ? "; Secure" : ""
    }`;
  }, [code]);

  const signedInEmail = (user as { primaryEmail?: string | null } | null)?.primaryEmail?.trim().toLowerCase() ?? "";
  const roleLabel = info?.role ? loc(ROLE_LABEL[info.role]) : "";

  let body: React.ReactNode;
  if (!code || info?.status === "invalid") {
    body = <p className="text-sm text-muted">{loc({ en: "This invitation link is not valid. Ask for a new invitation.", ar: "رابط الدعوة هذا غير صالح. اطلب دعوة جديدة." })}</p>;
  } else if (info?.status === "used") {
    body = (
      <>
        <p className="text-sm text-muted">{loc({ en: "This invitation has already been used. If it was you, just sign in.", ar: "تم استخدام هذه الدعوة من قبل. إن كنت أنت، فسجّل الدخول فقط." })}</p>
        <Button asChild>
          <Link to="/login" search={{ next: "/insights" }}>{loc({ en: "Sign in", ar: "تسجيل الدخول" })}</Link>
        </Button>
      </>
    );
  } else if (info?.status === "expired") {
    body = <p className="text-sm text-muted">{loc({ en: "This invitation has expired (30 days). Ask your administrator for a new one.", ar: "انتهت صلاحية هذه الدعوة (٣٠ يوماً). اطلب من المسؤول دعوة جديدة." })}</p>;
  } else if (isPending || !info) {
    body = <div className="h-11" aria-busy="true" />;
  } else if (user && signedInEmail && signedInEmail !== info.email) {
    body = (
      <>
        <p className="text-sm leading-relaxed text-ink" role="alert">
          {loc({
            en: `This invitation is for ${info.email}, but you are signed in as ${signedInEmail}. Sign out to continue.`,
            ar: `هذه الدعوة موجهة إلى ${info.email}، لكنك مسجّل الدخول باسم ${signedInEmail}. سجّل الخروج للمتابعة.`,
          })}
        </p>
        <Button variant="outline" onClick={() => void signOut(next)}>
          {loc({ en: "Sign out and continue", ar: "تسجيل الخروج والمتابعة" })}
        </Button>
      </>
    );
  } else if (user) {
    body = <Activate code={code} />;
  } else {
    body = <PasswordForm code={code} info={info} />;
  }

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
      <main className="flex flex-1 flex-col justify-center gap-5 pb-16">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
            {info?.status === "ok" && !user
              ? info.hasAccount
                ? loc({ en: "Activate your access", ar: "فعّل صلاحيتك" })
                : loc({ en: "Finish your account", ar: "أكمل إنشاء حسابك" })
              : loc({ en: "You have been invited", ar: "لقد تمت دعوتك" })}
          </h1>
          {info?.status === "ok" && roleLabel ? (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {loc({
                en: `You are invited to read the survey results as ${roleLabel}.`,
                ar: `تمت دعوتك للاطلاع على نتائج الاستبيان بصفة ${roleLabel}.`,
              })}
            </p>
          ) : null}
        </div>
        {body}
      </main>
    </div>
  );
}

async function activateAndGo(code: string) {
  await acceptInvite({ data: { code } });
  usePulse.getState().reset();
  window.location.href = "/insights";
}

/** Signed in with the invited email already: activate straight away. */
function Activate({ code }: { code: string }) {
  const { loc } = useT();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const started = useRef(false);
  const run = () => {
    setBusy(true);
    setError(null);
    activateAndGo(code).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : loc({ en: "Could not activate.", ar: "تعذّر التفعيل." }));
      setBusy(false);
    });
  };
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <p className="text-sm text-muted" role="status">
        {busy ? loc({ en: "Activating your access…", ar: "جارٍ تفعيل صلاحيتك…" }) : null}
      </p>
      {error ? (
        <>
          <p className="text-sm text-score-crit" role="alert">{error}</p>
          <Button onClick={run}>{loc({ en: "Try again", ar: "أعد المحاولة" })}</Button>
        </>
      ) : null}
    </>
  );
}

/** Not signed in: choose a password (new account) or enter the existing one, then activate. */
function PasswordForm({ code, info }: { code: string; info: Info }) {
  const { loc } = useT();
  const email = info.email ?? "";
  const isNew = !info.hasAccount;
  const [name, setName] = useState(info.name ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isNew && password.length < MIN_PASSWORD)
      return setError(loc({ en: "Use at least 10 characters for the password.", ar: "استخدم عشرة أحرف على الأقل لكلمة المرور." }));
    if (isNew && password !== confirm) return setError(loc({ en: "The two passwords do not match.", ar: "كلمتا المرور غير متطابقتين." }));
    const cap = await captchaForSubmit(captcha);
    if (!cap) return setError(loc(CAPTCHA_MISSING));
    setBusy(true);
    try {
      const res = isNew
        ? await authClient.signUp.email({ email, password, name: name.trim() || email }, captchaFetch(cap))
        : await authClient.signIn.email({ email, password }, captchaFetch(cap));
      if (res.error) {
        setError(authErrorText(res.error, loc, { en: "That did not work. Try again.", ar: "لم ينجح ذلك. أعد المحاولة." }));
        if (res.error.code === "CAPTCHA_REQUIRED") {
          setCaptcha(null);
          setCaptchaKey((k) => k + 1);
        }
        setBusy(false);
        return;
      }
      await activateAndGo(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : loc({ en: "Something went wrong.", ar: "حدث خطأ." }));
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => void submit(e)}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{loc({ en: "Email", ar: "البريد الإلكتروني" })}</Label>
        <Input id="email" type="email" dir="ltr" value={email} readOnly aria-readonly className="bg-sand-2 text-muted" autoComplete="username" />
      </div>
      {isNew ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">{loc({ en: "Your name", ar: "اسمك" })}</Label>
          <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="password">
            {isNew ? loc({ en: "Choose a password (at least 10 characters)", ar: "اختر كلمة مرور (عشرة أحرف على الأقل)" }) : loc({ en: "Your password", ar: "كلمة المرور" })}
          </Label>
          {!isNew ? (
            <Link to="/forgot-password" className="text-xs font-medium text-accent underline-offset-4 hover:underline">
              {loc({ en: "Forgot password?", ar: "نسيت كلمة المرور؟" })}
            </Link>
          ) : null}
        </div>
        <Input
          id="password"
          type="password"
          required
          dir="ltr"
          minLength={isNew ? MIN_PASSWORD : undefined}
          autoComplete={isNew ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {isNew ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">{loc({ en: "Repeat the password", ar: "أعد كتابة كلمة المرور" })}</Label>
          <Input id="confirm" type="password" required dir="ltr" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
      ) : null}
      <Captcha key={captchaKey} onChange={setCaptcha} />
      {error ? <p className="text-sm text-score-crit" role="alert">{error}</p> : null}
      <Button type="submit" disabled={busy}>
        {busy
          ? loc({ en: "Activating…", ar: "جارٍ التفعيل…" })
          : isNew
            ? loc({ en: "Create account and open results", ar: "إنشاء الحساب وفتح النتائج" })
            : loc({ en: "Sign in and activate", ar: "الدخول والتفعيل" })}
      </Button>
    </form>
  );
}
