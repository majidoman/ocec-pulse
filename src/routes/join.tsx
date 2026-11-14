import { useEffect, useState } from "react";
import { AppName } from "@/components/app-name";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LangToggle } from "@/components/lang-toggle";
import { Mark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { acceptInvite } from "@/lib/pulse/api";
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
        {!code ? (
          <p className="text-sm text-muted">{loc({ en: "This link is incomplete. Ask for a new invitation.", ar: "هذا الرابط غير مكتمل. اطلب دعوة جديدة." })}</p>
        ) : isPending ? (
          <div className="h-11" aria-busy="true" />
        ) : !user ? (
          <>
            <p className="text-sm leading-relaxed text-muted">
              {loc({
                en: "Sign in or create an account first. You will come straight back here to activate your access.",
                ar: "سجّل الدخول أو أنشئ حساباً أولاً، وستعود إلى هنا مباشرة لتفعيل صلاحيتك.",
              })}
            </p>
            <Button asChild>
              <Link to="/login" search={{ next }}>
                {loc({ en: "Sign in to continue", ar: "سجّل الدخول للمتابعة" })}
              </Link>
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted">
              {loc({
                en: "Activate access to the census results for this account. The link works once.",
                ar: "فعّل صلاحية الاطلاع على نتائج التعداد لهذا الحساب. يعمل الرابط مرة واحدة.",
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
