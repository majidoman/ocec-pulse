import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/pulse/password-reset";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPassword });

function ForgotPassword() {
  const { loc } = useT();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await requestPasswordReset({ data: { email: email.trim() } });
      if (r.ok) setSent(true);
      else if (r.reason === "mail_not_set_up")
        setError(
          loc({
            en: "Email is not set up on this server yet, so no reset link can be sent. Ask the system administrator.",
            ar: "لم يُضبط البريد على هذا الخادم بعد، لذلك لا يمكن إرسال رابط. تواصل مع مدير النظام.",
          }),
        );
      else setError(loc({ en: "Too many requests. Wait an hour, then try again.", ar: "طلبات كثيرة. انتظر ساعة ثم أعد المحاولة." }));
    } catch {
      setError(loc({ en: "Enter a valid email address.", ar: "أدخل بريداً إلكترونياً صحيحاً." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      {sent ? (
        <div>
          <span className="flex size-11 items-center justify-center rounded-full bg-accent text-sand" aria-hidden>
            <MailCheck className="size-5" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-medium tracking-tight text-ink">{loc({ en: "Check your email", ar: "تفقّد بريدك" })}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted" role="status">
            {loc({
              en: "If this email has an account, a link to choose a new password is on its way. It works once, for 60 minutes. Check the junk folder too.",
              ar: "إذا كان لهذا البريد حساب فسيصله رابط لاختيار كلمة مرور جديدة. يعمل الرابط مرة واحدة ولمدة ٦٠ دقيقة. تفقّد مجلد الرسائل غير المرغوبة أيضاً.",
            })}
          </p>
          <Link to="/login" className="mt-6 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline">
            {loc({ en: "Back to sign in", ar: "العودة لتسجيل الدخول" })}
          </Link>
        </div>
      ) : (
        <>
          <div>
            <h1 className="font-display text-3xl font-medium tracking-tight text-ink">{loc({ en: "Forgot your password?", ar: "نسيت كلمة المرور؟" })}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {loc({
                en: "Enter the email you sign in with. We will send a link to choose a new password.",
                ar: "أدخل البريد الذي تسجّل الدخول به، وسنرسل لك رابطاً لاختيار كلمة مرور جديدة.",
              })}
            </p>
          </div>
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{loc({ en: "Email", ar: "البريد الإلكتروني" })}</Label>
              <Input id="email" type="email" required autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {error ? (
              <p className="text-sm text-score-crit" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={busy}>
              {loc({ en: "Send reset link", ar: "إرسال رابط إعادة التعيين" })}
            </Button>
          </form>
          <Link to="/login" className="self-start text-sm font-medium text-accent underline-offset-4 hover:underline">
            {loc({ en: "Back to sign in", ar: "العودة لتسجيل الدخول" })}
          </Link>
        </>
      )}
    </AuthShell>
  );
}
