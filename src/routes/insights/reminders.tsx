import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageFrame } from "@/components/page-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useCensus } from "@/lib/census";
import { getReminderOverview, runReminders, type ReminderOverview } from "@/lib/pulse/api";
import { canEditSettings } from "@/lib/pulse/config";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/insights/reminders")({ component: RemindersPage });

function RemindersPage() {
  const { t, loc, lang } = useT();
  const { currentRole } = useCensus();
  const cfg = useSettings((s) => s.reminderCfg);
  const patch = useSettings((s) => s.patchReminders);
  const [data, setData] = useState<ReminderOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const admin = canEditSettings(currentRole);

  const load = useCallback(async () => {
    try {
      setData(await getReminderOverview());
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    if (admin) void load();
  }, [admin, load]);

  if (!admin) {
    return (
      <PageFrame title={t("navRemind")}>
        <Card>
          <p className="text-sm text-muted">{loc({ en: "Only administrators manage reminders.", ar: "إدارة التذكيرات للمديرين فقط." })}</p>
        </Card>
      </PageFrame>
    );
  }

  async function sendNow() {
    setBusy(true);
    try {
      await useSettings.getState().flush();
      let sent = 0;
      let failed = 0;
      let note: string | undefined;
      for (let i = 0; i < 100; i += 1) {
        const res = await runReminders({ data: { manual: true } });
        sent += res.sent;
        failed += res.failed;
        note = res.skipped;
        if (res.skipped || !res.remaining || (!res.sent && !res.failed)) break;
      }
      if (note && !sent) toast.message(note);
      else toast.success(loc({ en: `${sent} reminders sent${failed ? ` · ${failed} failed` : ""}`, ar: `أُرسل ${sent} تذكيراً${failed ? ` · فشل ${failed}` : ""}` }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
      await load();
    }
  }

  return (
    <PageFrame
      title={t("navRemind")}
      hint={t("remindHint")}
      actions={
        <Button disabled={busy} onClick={() => void sendNow()}>
          {loc({ en: "Send due reminders now", ar: "إرسال التذكيرات المستحقة الآن" })}
        </Button>
      }
    >
      <Card>
        <p className="text-sm leading-relaxed text-muted">
          {loc({
            en: `${data?.waiting ?? 0} invited people have not answered yet. Each reminder goes once, a set number of days after that person's invitation, and never to someone who has answered.`,
            ar: `${data?.waiting ?? 0} من المدعوين لم يجيبوا بعد. يُرسل كل تذكير مرة واحدة بعد عدد محدد من الأيام من دعوة الشخص، ولا يصل أبداً لمن أجاب.`,
          })}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {loc({
            en: "Due reminders are sent whenever an administrator opens this workspace, or when you press the button. For fully automatic sending, have a scheduler open the address below once a day.",
            ar: "تُرسل التذكيرات المستحقة كلما فتح مدير هذه المساحة أو عند الضغط على الزر. للإرسال التلقائي الكامل، اجعل مُجدوِلاً يفتح العنوان أدناه مرة يومياً.",
          })}
        </p>
        {data?.cronUrl ? (
          <p className="mt-3 break-all rounded-xl bg-sand-2 px-4 py-3 font-mono text-xs text-ink" dir="ltr">
            {data.cronUrl}
          </p>
        ) : null}
      </Card>
      <div className="grid gap-3">
        {cfg.rules.map((r) => {
          const st = data?.state[r.id];
          return (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl text-ink">{loc(r.label)}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {lang === "ar" ? `اليوم ${r.dayOffset}` : `Day ${r.dayOffset}`} · {t("sentCount")} {st?.sent ?? 0}
                    {st?.lastRun ? ` · ${t("lastRun")} ${new Date(st.lastRun).toLocaleString()}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-subtle">{r.enabled && cfg.enabled ? t("enabled") : t("disabled")}</span>
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={() => patch({ rules: cfg.rules.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)) })}
                  />
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{lang === "ar" ? r.bodyAr : r.bodyEn}</p>
            </Card>
          );
        })}
      </div>
      <Link to="/settings/reminders" className="text-sm font-medium text-accent">
        {loc({ en: "Edit wording, days and quiet hours", ar: "تعديل الصياغة والأيام وساعات الهدوء" })}
      </Link>
    </PageFrame>
  );
}
