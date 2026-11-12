import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageFrame } from "@/components/page-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AreaField, Field, TextField } from "@/components/settings-field";
import { formatIsoDate, useCensus } from "@/lib/census";
import { getInvitationOverview, sendTestEmail, setSmtpPassword } from "@/lib/pulse/api";
import { usePulse } from "@/lib/pulse/session";
import { applyTokens, useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/settings/email")({ component: EmailPage });

const PRESETS = [
  { id: "hostinger", label: "Hostinger", host: "smtp.hostinger.com", port: 465, secure: true },
  { id: "m365", label: "Microsoft 365", host: "smtp.office365.com", port: 587, secure: false },
  { id: "gmail", label: "Google Workspace", host: "smtp.gmail.com", port: 465, secure: true },
];

function EmailPage() {
  const { t, loc, lang } = useT();
  const email = useSettings((s) => s.email);
  const patch = useSettings((s) => s.patchEmail);
  const { orgName, fieldClose } = useCensus();
  const me = usePulse((s) => s.me);
  const [testTo, setTestTo] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ passwordSet: boolean; problem: string | null; surveyUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const o = await getInvitationOverview();
      setStatus({ ...o.mail, surveyUrl: o.surveyUrl });
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!testTo && me?.email) setTestTo(me.email);
  }, [me, testTo]);

  const sampleLink = `${status?.surveyUrl ?? ""}?t=…`;
  const preview = useMemo(
    () =>
      applyTokens(lang === "ar" ? email.bodyAr : email.bodyEn, {
        survey_link: sampleLink,
        close_date: formatIsoDate(fieldClose, lang),
        org_name: loc(orgName),
      }),
    [email, lang, loc, orgName, fieldClose, sampleLink],
  );

  async function savePassword() {
    setBusy(true);
    try {
      await setSmtpPassword({ data: { password } });
      setPassword("");
      toast.success(loc({ en: "Password saved", ar: "حُفظت كلمة المرور" }));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      await useSettings.getState().flush();
      const res = await sendTestEmail({ data: { to: testTo.trim() } });
      if (res.ok) toast.success(loc({ en: `Test sent to ${testTo}`, ar: `أُرسل الاختبار إلى ${testTo}` }));
      else toast.error(res.error ?? "Send failed");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageFrame title={t("setEmail")} hint={t("tokensHint")}>
      <Card className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="text-sm font-semibold text-ink">{loc({ en: "Sending account", ar: "حساب الإرسال" })}</h2>
          <p className="mt-1 text-sm text-muted">
            {loc({
              en: "Invitations are sent through a mailbox you control. Use an address staff will recognise, and ask OCEC IT to allow it so messages do not land in junk.",
              ar: "تُرسل الدعوات عبر صندوق بريد تتحكم به. استخدم عنواناً يعرفه الموظفون، واطلب من تقنية المعلومات السماح به كي لا تذهب الرسائل إلى البريد غير المرغوب.",
            })}
          </p>
          <p className={`mt-2 text-sm ${status?.problem ? "text-score-crit" : "text-score-high"}`} role="status">
            {status ? (status.problem ?? loc({ en: "Ready to send.", ar: "جاهز للإرسال." })) : ""}
          </p>
        </div>
        <Field label={loc({ en: "Send via", ar: "الإرسال عبر" })}>
          <select className="h-11 rounded-md border border-border bg-paper px-3 text-sm" value={email.provider} onChange={(e) => patch({ provider: e.target.value as "none" | "smtp" })}>
            <option value="none">{loc({ en: "Not set up (links and QR only)", ar: "غير مُعدّ (روابط و QR فقط)" })}</option>
            <option value="smtp">SMTP</option>
          </select>
        </Field>
        <Field label={loc({ en: "Quick fill", ar: "تعبئة سريعة" })}>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button key={p.id} size="sm" variant="outline" onClick={() => patch({ provider: "smtp", smtpHost: p.host, smtpPort: p.port, smtpSecure: p.secure })}>
                {p.label}
              </Button>
            ))}
          </div>
        </Field>
        <TextField label="SMTP host" value={email.smtpHost} onChange={(v) => patch({ smtpHost: v.trim() })} />
        <TextField label="Port" type="number" value={email.smtpPort} onChange={(v) => patch({ smtpPort: Number(v) || 465 })} hint="465 (SSL) · 587 (STARTTLS)" />
        <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
          {loc({ en: "SSL from the start (port 465)", ar: "SSL من البداية (المنفذ 465)" })}
          <Switch checked={email.smtpSecure} onCheckedChange={(v) => patch({ smtpSecure: v })} />
        </label>
        <TextField label={loc({ en: "SMTP user (usually the mailbox address)", ar: "مستخدم SMTP (غالباً عنوان الصندوق)" })} value={email.smtpUser} onChange={(v) => patch({ smtpUser: v.trim() })} />
        <Field
          label={loc({ en: "SMTP password", ar: "كلمة مرور SMTP" })}
          hint={
            status?.passwordSet
              ? loc({ en: "A password is saved. It is stored encrypted and never shown again. Type a new one to replace it.", ar: "كلمة مرور محفوظة. تُخزَّن مشفّرة ولا تُعرض ثانية. اكتب جديدة لاستبدالها." })
              : loc({ en: "Stored encrypted. Never shown again after saving.", ar: "تُخزَّن مشفّرة ولا تُعرض بعد الحفظ." })
          }
        >
          <div className="flex gap-2">
            <Input type="password" autoComplete="new-password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button variant="outline" disabled={busy || !password} onClick={() => void savePassword()}>
              {t("save")}
            </Button>
          </div>
        </Field>
        <TextField label={loc({ en: "From name", ar: "اسم المرسل" })} value={email.fromName} onChange={(v) => patch({ fromName: v })} />
        <TextField label={loc({ en: "From address", ar: "عنوان المرسل" })} value={email.fromAddress} onChange={(v) => patch({ fromAddress: v.trim() })} />
        <TextField label="Reply-to" value={email.replyTo} onChange={(v) => patch({ replyTo: v.trim() })} />
      </Card>

      <Card className="grid gap-4 md:grid-cols-2">
        <h2 className="text-sm font-semibold text-ink md:col-span-2">{loc({ en: "Invitation wording", ar: "صياغة الدعوة" })}</h2>
        <TextField label="Subject EN" value={email.subjectEn} onChange={(v) => patch({ subjectEn: v })} />
        <TextField label="الموضوع" value={email.subjectAr} onChange={(v) => patch({ subjectAr: v })} />
        <AreaField label="Body EN" value={email.bodyEn} onChange={(v) => patch({ bodyEn: v })} />
        <AreaField label="النص" dir="rtl" value={email.bodyAr} onChange={(v) => patch({ bodyAr: v })} />
        <p className="text-xs text-subtle md:col-span-2">
          {loc({
            en: "Each email carries the English text, then the Arabic. If {{survey_link}} is missing, the link is added at the end.",
            ar: "كل رسالة تحمل النص الإنجليزي ثم العربي. إن غاب {{survey_link}} يُضاف الرابط في النهاية.",
          })}
        </p>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold">{t("previewMail")}</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{preview}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input className="h-11 flex-1 rounded-md border border-border bg-paper px-3 text-sm" dir="ltr" placeholder="you@example.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          <Button variant="outline" disabled={busy || !testTo.includes("@")} onClick={() => void test()}>
            {t("testSend")}
          </Button>
        </div>
      </Card>

      <Link to="/insights/invitations" className="text-sm font-medium text-accent">
        {loc({ en: "Go to invitations: add people, send, QR poster", ar: "إلى الدعوات: إضافة أشخاص وإرسال وملصق QR" })}
      </Link>
    </PageFrame>
  );
}
