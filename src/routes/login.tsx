import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LangToggle } from "@/components/lang-toggle";
import { Mark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { usePulse } from "@/lib/pulse/session";
import { useT } from "@/lib/store";

function safeNext(v: unknown): string {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/insights";
}

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s.next === "string" ? { next: s.next } : {},
  component: Login,
});

function Login() {
  const { loc } = useT();
  const { next } = Route.useSearch();
  const dest = safeNext(next);
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Google / X sign-in runs through Grok's own service, so it only works on Grok hosts.
  const [federated, setFederated] = useState(false);
  useEffect(() => {
    const h = window.location.hostname;
    setFederated(h === "localhost" ? false : /(^|\.)(grok\.me|grok-sandbox\.com|grok\.com|x\.ai)$/.test(h));
  }, []);

  const signedIn = Boolean(user);
  useEffect(() => {
    // Full navigation so the destination loads with the fresh session.
    if (signedIn) window.location.replace(dest);
  }, [signedIn, dest]);

  // Never show sign-in controls while the session is still resolving.
  if (isPending || signedIn) return <div className="min-h-dvh" aria-busy="true" />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "up" && password.length < 10) {
      setError(loc({ en: "Use at least 10 characters for the password.", ar: "استخدم عشرة أحرف على الأقل لكلمة المرور." }));
      return;
    }
    setBusy(true);
    try {
      const res =
        mode === "in"
          ? await authClient.signIn.email({ email: email.trim(), password })
          : await authClient.signUp.email({ email: email.trim(), password, name: name.trim() || email.trim() });
      if (res.error) {
        setError(res.error.message ?? loc({ en: "That did not work. Check the email and password.", ar: "لم ينجح ذلك. تحقق من البريد وكلمة المرور." }));
        return;
      }
      usePulse.getState().reset();
      window.location.href = dest;
    } catch {
      setError(loc({ en: "Sign-in is not available right now.", ar: "تسجيل الدخول غير متاح الآن." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-6">
      <header className="mb-10 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 text-ink">
          <Mark className="size-9" />
          <span className="text-sm font-semibold">OCEC Pulse</span>
        </Link>
        <LangToggle />
      </header>
      <main className="flex flex-1 flex-col justify-center gap-6 pb-16">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">
            {loc({ en: "Staff access", ar: "دخول الفريق" })}
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink">
            {mode === "in" ? loc({ en: "Sign in", ar: "تسجيل الدخول" }) : loc({ en: "Create an account", ar: "إنشاء حساب" })}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {loc({
              en: "For People & Culture and leaders who read the results. Taking the survey never needs an account.",
              ar: "للأفراد والثقافة والقادة الذين يقرؤون النتائج. المشاركة في الاستبيان لا تحتاج حساباً أبداً.",
            })}
          </p>
        </div>
        {authEnabled ? (
          <>
            <form className="flex flex-col gap-3" onSubmit={submit}>
              {mode === "up" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">{loc({ en: "Name", ar: "الاسم" })}</Label>
                  <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              ) : null}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">{loc({ en: "Email", ar: "البريد الإلكتروني" })}</Label>
                <Input id="email" type="email" required autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">{loc({ en: "Password", ar: "كلمة المرور" })}</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  dir="ltr"
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error ? <p className="text-sm text-score-crit" role="alert">{error}</p> : null}
              <Button type="submit" disabled={busy}>
                {mode === "in" ? loc({ en: "Sign in", ar: "دخول" }) : loc({ en: "Create account", ar: "إنشاء الحساب" })}
              </Button>
            </form>
            <button
              type="button"
              className="self-start text-sm font-medium text-accent"
              onClick={() => {
                setMode(mode === "in" ? "up" : "in");
                setError(null);
              }}
            >
              {mode === "in"
                ? loc({ en: "First time here? Create an account", ar: "أول مرة؟ أنشئ حساباً" })
                : loc({ en: "Already have an account? Sign in", ar: "لديك حساب؟ سجّل الدخول" })}
            </button>
            <div className={federated ? "flex flex-col gap-2 border-t border-border pt-5" : "hidden"}>
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="outline"
                  onClick={() => void signIn(p.providerId, { callbackURL: dest, errorCallbackURL: "/login" }).catch((err) => setError(err instanceof Error ? err.message : "Sign-in failed"))}
                >
                  {loc({ en: `Continue with ${p.label}`, ar: `المتابعة عبر ${p.label}` })}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">{loc({ en: "Sign-in is switched off for this app.", ar: "تسجيل الدخول متوقف لهذا التطبيق." })}</p>
        )}
      </main>
    </div>
  );
}
