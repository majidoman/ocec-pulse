import { useEffect, useState } from "react";
import { AppName } from "@/components/app-name";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LangToggle } from "@/components/lang-toggle";
import { Mark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { UserButton } from "@/lib/auth/gates";
import { signOut } from "@/lib/auth/client";
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

function Join() {
  const { loc } = useT();
  const { code } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = `/join?code=${encodeURIComponent(code ?? "")}`;
  const [info, setInfo] = useState<Awaited<ReturnType<typeof getInviteInfo>> | null>(null);
  useEffect(() => {
    if (!code) return;
    getInviteInfo({ data: { code } })
      .then(setInfo)
      .catch(() => setInfo({ status: "invalid" }));
  }, [code]);
  const signedInEmail = (user as { primaryEmail?: string | null } | null)?.primaryEmail?.trim().toLowerCase() ?? "";
  const wrongAccount = Boolean(user && info?.status === "ok" && info.email && signedInEmail && signedInEmail !== info.email);

  // Lets a person holding a valid invitation create an account (see /api/auth sign-up gate).
  useEffect(() => {
    if (!code) return;
    document.cookie = `pulse_invite=${encodeURIComponent(code)}; path=/; max-age=3600; SameSite=Lax${
      window.location.protocol === "https:" ? "; Secure" : ""
    }`;
  }, [code]);

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
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
          {loc({ en: "You have been invited", ar: "لقد تمت دعوتك" })}
        </h1>
        {!code || info?.status === "invalid" ? (
          <p className="text-sm text-muted">{loc({ en: "This invitation link is not valid. Ask for a new invitation.", ar: "رابط الدعوة هذا غير صالح. اطلب دعوة جديدة." })}</p>
        ) : info?.status === "used" ? (
          <>
            <p className="text-sm text-muted">
              {loc({ en: "This invitation has already been used. If it was you, just sign in.", ar: "تم استخدام هذه الدعوة من قبل. إن كنت أنت، فسجّل الدخول فقط." })}
            </p>
            <Button asChild>
              <Link to="/login" search={{ next: "/insights" }}>{loc({ en: "Sign in", ar: "تسجيل الدخول" })}</Link>
            </Button>
          </>
        ) : info?.status === "expired" ? (
          <p className="text-sm text-muted">{loc({ en: "This invitation has expired (30 days). Ask your administrator for a new one.", ar: "انتهت صلاحية هذه الدعوة (٣٠ يوماً). اطلب من المسؤول دعوة جديدة." })}</p>
        ) : isPending || !info ? (
          <div className="h-11" aria-busy="true" />
        ) : !user ? (
          <>
            <p className="text-sm leading-relaxed text-muted">
              {loc({
                en: `This invitation is for ${info.email}${info.role ? ` (${ROLE_LABEL[info.role].en})` : ""}. Create your account with this email, or sign in if you already have one.`,
                ar: `هذه الدعوة موجهة إلى ${info.email}${info.role ? ` (${ROLE_LABEL[info.role].ar})` : ""}. أنشئ حسابك بهذا البريد، أو سجّل الدخول إن كان لديك حساب.`,
              })}
            </p>
            <Button asChild>
              <Link to="/login" search={{ next, mode: "up", email: info.email }}>
                {loc({ en: "Create my account", ar: "إنشاء حسابي" })}
              </Link>
            </Button>
            <Link to="/login" search={{ next, email: info.email }} className="self-start text-sm font-medium text-accent underline-offset-4 hover:underline">
              {loc({ en: "I already have an account — sign in", ar: "لدي حساب — تسجيل الدخول" })}
            </Link>
          </>
        ) : wrongAccount ? (
          <>
            <p className="text-sm leading-relaxed text-ink" role="alert">
              {loc({
                en: `This invitation is for ${info.email}, but you are signed in as ${signedInEmail}. Sign out, then open the invitation link again.`,
                ar: `هذه الدعوة موجهة إلى ${info.email}، لكنك مسجّل الدخول باسم ${signedInEmail}. سجّل الخروج ثم افتح رابط الدعوة مرة أخرى.`,
              })}
            </p>
            <Button variant="outline" onClick={() => void signOut(next)}>
              {loc({ en: "Sign out", ar: "تسجيل الخروج" })}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted">
              {loc({
                en: "Activate access to the survey results for this account. The link works once.",
                ar: "فعّل صلاحية الاطلاع على نتائج الاستبيان لهذا الحساب. يعمل الرابط مرة واحدة.",
              })}
            </p>
            <UserButton />
            {error ? <p className="text-sm text-score-crit" role="alert">{error}</p> : null}
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await acceptInvite({ data: { code } });
                  usePulse.getState().reset();
                  window.location.href = "/insights";
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not activate");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {loc({ en: "Activate my access", ar: "تفعيل صلاحيتي" })}
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
