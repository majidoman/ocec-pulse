import { createFileRoute, Link } from "@tanstack/react-router";
import { PageFrame } from "@/components/page-frame";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Field, TextField } from "@/components/settings-field";
import { useCensus } from "@/lib/census";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";
import type { CensusStatus } from "@/lib/types";

export const Route = createFileRoute("/settings/")({ component: GeneralPage });

function GeneralPage() {
  const { t, loc } = useT();
  const g = useSettings((s) => s.general);
  const patch = useSettings((s) => s.patchGeneral);
  const { rate, completed, headcount, fieldOpen, fieldClose } = useCensus();

  return (
    <PageFrame title={t("setGeneral")} hint={t("settingsHint")}>
      <Card>
        <p className="text-xs text-subtle">{t("sameRate")}</p>
        <p className="mt-1 font-display text-3xl tabular-nums text-ink">
          {rate ?? 0}% · {completed}/{headcount}
        </p>
        <p className="mt-2 text-xs text-muted">
          {loc({ en: "Headcount is the total of the department headcounts.", ar: "العدد الكلي هو مجموع أعداد الإدارات." })}{" "}
          <Link to="/settings/departments" className="font-medium text-accent">
            {t("setDepts")}
          </Link>
        </p>
      </Card>
      <Card className="grid gap-4 md:grid-cols-2">
        <Field
          label={loc({ en: "Census status", ar: "حالة التعداد" })}
          hint={loc({
            en: "Answers are accepted only while the status is Open and today is inside the field dates.",
            ar: "تُقبل الإجابات فقط حين تكون الحالة «مفتوح» واليوم ضمن تواريخ الميدان.",
          })}
        >
          <select className="h-11 rounded-md border border-border bg-paper px-3 text-sm" value={g.status} onChange={(e) => patch({ status: e.target.value as CensusStatus })}>
            <option value="draft">{t("statusDraft")}</option>
            <option value="open">{t("statusOpen")}</option>
            <option value="closed">{t("statusClosed")}</option>
            <option value="archived">{t("statusArchived")}</option>
          </select>
        </Field>
        <Field
          label={loc({ en: "Field dates", ar: "تواريخ الميدان" })}
          hint={loc({ en: "Set under Delivery calendar.", ar: "تُضبط من تقويم التنفيذ." })}
        >
          <Link to="/settings/calendar" className="flex h-11 items-center rounded-md border border-border bg-paper px-3 text-sm text-ink">
            {fieldOpen || "—"} → {fieldClose || "—"}
          </Link>
        </Field>
        <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm md:col-span-2">
          <span>
            {loc({ en: "Allow the shared link and QR code", ar: "السماح بالرابط المشترك ورمز QR" })}
            <span className="block text-xs text-subtle">
              {loc({
                en: "On: anyone with the address can answer (needed for staff without email). Off: only personal one-time links work.",
                ar: "مفعّل: كل من لديه العنوان يستطيع الإجابة (ضروري لمن لا بريد له). متوقف: تعمل الروابط الشخصية فقط.",
              })}
            </span>
          </span>
          <Switch checked={g.allowOpenLink} onCheckedChange={(v) => patch({ allowOpenLink: v })} />
        </label>
        <TextField label="Organisation (EN)" value={g.orgName.en} onChange={(v) => patch({ orgName: { ...g.orgName, en: v } })} />
        <TextField label="المؤسسة (AR)" value={g.orgName.ar} onChange={(v) => patch({ orgName: { ...g.orgName, ar: v } })} />
        <TextField label="Cycle (EN)" value={g.cycleName.en} onChange={(v) => patch({ cycleName: { ...g.cycleName, en: v } })} />
        <TextField label="الدورة (AR)" value={g.cycleName.ar} onChange={(v) => patch({ cycleName: { ...g.cycleName, ar: v } })} />
        <TextField
          label={loc({ en: "Public address of this app", ar: "العنوان العام للتطبيق" })}
          value={g.publicUrl}
          hint={loc({
            en: "Used in invitation links, e.g. https://pulse.example.com. Leave blank to use the address you are on now.",
            ar: "يُستخدم في روابط الدعوات. اتركه فارغاً لاستخدام العنوان الحالي.",
          })}
          onChange={(v) => patch({ publicUrl: v.trim() })}
        />
        <Field label="Timezone">
          <select className="h-11 rounded-md border border-border bg-paper px-3 text-sm" value={g.timezone} onChange={(e) => patch({ timezone: e.target.value })}>
            <option value="Asia/Muscat">Asia/Muscat</option>
            <option value="Asia/Dubai">Asia/Dubai</option>
            <option value="UTC">UTC</option>
          </select>
        </Field>
        <Field label={loc({ en: "Default language", ar: "اللغة الافتراضية" })}>
          <select className="h-11 rounded-md border border-border bg-paper px-3 text-sm" value={g.defaultLang} onChange={(e) => patch({ defaultLang: e.target.value as "en" | "ar" })}>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
        </Field>
        <TextField label={loc({ en: "Support email (shown to staff)", ar: "بريد الدعم (يظهر للموظفين)" })} value={g.supportEmail} onChange={(v) => patch({ supportEmail: v })} />
        <TextField label={loc({ en: "Support phone", ar: "هاتف الدعم" })} value={g.supportPhone} onChange={(v) => patch({ supportPhone: v })} />
      </Card>
    </PageFrame>
  );
}
