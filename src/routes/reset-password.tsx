import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/pulse/password-reset";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>): { token?: string } => (typeof s.token === "string" ? { token: s.token } : {}),
  component: ResetPassword,
});

function ResetPassword() {
  const { loc } = useT();
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expired = loc({
    en: "This link is not valid or has expired. Ask for a new one.",
    ar: "هذا الرابط غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 10) return setError(loc({ en: "Use at least 10 characters.", ar: "استخدم عشرة أحرف على الأقل." }));
    if (password !== repeat) return setError(loc({ en: "The two passwords are different.", ar: "كلمتا المرور غير متطابقتين." }));
    setBusy(true);
    try {
      const r = await resetPassword({ data: { token: token ?? "", password } });
      if (r.ok) setDone(true);
      else if (r.reason === "rate_limited") setError(loc({ en: "Too many attempts. Wait an hour, then try again.", ar: "محاولات كثيرة. انتظر ساعة ثم أعد المحاولة." }));
      else if (r.reason === "too_short") setError(loc({ en: "Use at least 10 characters.", ar: "استخدم عشرة أحرف على الأقل." }));
      else setError(expired);
    } catch {
      setError(expired);
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AuthShell>
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">{loc({ en: "Link incomplete", ar: "الرابط غير مكتمل" })}</h1>
        <p className="text-sm text-muted">{expired}</p>
        <Link to="/forgot-password" className="self-start text-sm font-medium text-accent underline-offset-4 hover:underline">
          {loc({ en: "Ask for a new link", ar: "اطلب رابطاً جديداً" })}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      {done ? (
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink">{loc({ en: "Password changed", ar: "تم تغيير كلمة المرور" })}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted" role="status">
            {loc({
              en: "You have been signed out on every device. Sign in with your new password.",
              ar: "تم تسجيل خروجك من كل الأجهزة. سجّل الدخول بكلمة المرور الجديدة.",
            })}
          </p>
          <Button className="mt-6" onClick={() => void navigate({ to: "/login" })}>
            {loc({ en: "Sign in", ar: "تسجيل الدخول" })}
          </Button>
        </div>
      ) : (
        <>
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink">{loc({ en: "Choose a new password", ar: "اختر كلمة مرور جديدة" })}</h1>
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">{loc({ en: "New password (at least 10 characters)", ar: "كلمة المرور الجديدة (10 أحرف على الأقل)" })}</Label>
              <Input id="new-password" type="password" required minLength={10} autoComplete="new-password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="repeat-password">{loc({ en: "Repeat the new password", ar: "أعد كتابة كلمة المرور الجديدة" })}</Label>
              <Input id="repeat-password" type="password" required autoComplete="new-password" dir="ltr" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
            </div>
            {error ? (
              <p className="text-sm text-score-crit" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={busy}>
              {loc({ en: "Save new password", ar: "حفظ كلمة المرور الجديدة" })}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
