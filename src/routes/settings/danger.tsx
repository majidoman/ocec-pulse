import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageFrame } from "@/components/page-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCensus } from "@/lib/census";
import { manageData } from "@/lib/pulse/api";
import { downloadText } from "@/lib/pulse/format";
import { usePulse } from "@/lib/pulse/session";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/settings/danger")({ component: DangerPage });

type Action = "reset_responses" | "delete_invitees" | "delete_everything";

function DangerPage() {
  const { t, loc } = useT();
  const patchGeneral = useSettings((s) => s.patchGeneral);
  const status = useSettings((s) => s.general.status);
  const { completed, currentRole } = useCensus();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const isSuper = currentRole === "super";

  function exportCfg() {
    const s = useSettings.getState();
    const { general, branding, calendar, anonymity, email, reminderCfg, benchmarks, departments, dimensions, questions, actions } = s;
    downloadText(
      "pulse-settings.json",
      JSON.stringify({ general, branding, calendar, anonymity, email, reminderCfg, benchmarks, departments, dimensions, questions, actions }, null, 2),
      "application/json",
    );
  }

  async function run(action: Action) {
    setBusy(true);
    try {
      await useSettings.getState().flush();
      await manageData({ data: { action, confirm: "DELETE" } });
      toast.success(loc({ en: "Done", ar: "تم" }));
      setConfirm("");
      if (action === "delete_everything") window.location.reload();
      else await usePulse.getState().refreshResults();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const armed = confirm === "DELETE" && isSuper && !busy;

  return (
    <PageFrame title={t("setDanger")} hint={t("neverNamed")}>
      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">{loc({ en: "Open and close", ar: "الفتح والإغلاق" })}</h2>
        <p className="text-sm text-muted">
          {loc({ en: "Current status:", ar: "الحالة الحالية:" })} <span className="font-medium text-ink">{status}</span> · {completed} {loc({ en: "responses", ar: "إجابة" })}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={status === "open"} onClick={() => patchGeneral({ status: "open" })}>
            {status === "draft" ? loc({ en: "Open census", ar: "فتح التعداد" }) : t("reopenCensus")}
          </Button>
          <Button variant="outline" disabled={status === "closed"} onClick={() => patchGeneral({ status: "closed" })}>
            {t("closeCensus")}
          </Button>
          <Button variant="outline" onClick={exportCfg}>
            {loc({ en: "Download settings backup", ar: "تنزيل نسخة من الإعدادات" })}
          </Button>
        </div>
      </Card>

      <Card className="grid gap-3">
        <h2 className="text-sm font-semibold text-score-crit">{loc({ en: "Delete data", ar: "حذف البيانات" })}</h2>
        <p className="text-sm leading-relaxed text-muted">
          {isSuper
            ? loc({ en: "These cannot be undone. Type DELETE to enable the buttons.", ar: "لا يمكن التراجع عن هذه الإجراءات. اكتب DELETE لتفعيل الأزرار." })
            : loc({ en: "Only a super admin can delete data.", ar: "حذف البيانات للمدير العام فقط." })}
        </p>
        <Input value={confirm} disabled={!isSuper} onChange={(e) => setConfirm(e.target.value)} placeholder={t("typeConfirm")} dir="ltr" />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Button variant="outline" disabled={!armed} onClick={() => void run("reset_responses")}>
              {t("resetDemo")}
            </Button>
            <p className="text-xs text-subtle">
              {loc({ en: "Use after a pilot. Removes every answer and comment and makes all personal links usable again.", ar: "بعد التجربة الأولية. يزيل كل إجابة وتعليق ويعيد تفعيل كل الروابط الشخصية." })}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" disabled={!armed} onClick={() => void run("delete_invitees")}>
              {loc({ en: "Delete the invitation list", ar: "حذف قائمة الدعوات" })}
            </Button>
            <p className="text-xs text-subtle">
              {loc({ en: "Removes every email address and personal link. Answers are kept.", ar: "يزيل كل عنوان بريد ورابط شخصي. تبقى الإجابات." })}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" disabled={!armed} onClick={() => void run("delete_everything")}>
              {t("deleteCycle")}
            </Button>
            <p className="text-xs text-subtle">
              {loc({ en: "Removes answers, the invitation list and all settings. User accounts are kept.", ar: "يزيل الإجابات وقائمة الدعوات وكل الإعدادات. تبقى حسابات المستخدمين." })}
            </p>
          </div>
        </div>
      </Card>
    </PageFrame>
  );
}
