import { createFileRoute, Link } from "@tanstack/react-router";
import { PageFrame } from "@/components/page-frame";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Field, TextField } from "@/components/settings-field";
import { useCensus } from "@/lib/census";
import { useSettings } from "@/lib/settings-store";
import { formatIsoDate } from "@/lib/pulse/config";
import { useT } from "@/lib/store";

function todayIn(tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export const Route = createFileRoute("/settings/")({ component: GeneralPage });

function GeneralPage() {
  const { t, loc, lang } = useT();
  const g = useSettings((s) => s.general);
  const patch = useSettings((s) => s.patchGeneral);
  const { rate, completed, headcount } = useCensus();
  const cal = useSettings((s) => s.calendar);
  const patchCalendar = useSettings((s) => s.patchCalendar);
  const timezone = g.timezone || "Asia/Muscat";
  const today = todayIn(timezone);

  /** Dates drive the status: both set = open (answers accepted only inside them), cleared = back to draft. */
  function setDates(open: string, close: string) {
    patchCalendar({ fieldOpen: open, fieldClose: close });
    const valid = !!open && !!close && close >= open;
    if (valid && g.status === "draft") patch({ status: "open" });
    if ((!open || !close) && g.status === "open") patch({ status: "draft" });
  }

  // Mirrors the server rule: answers are accepted when the status is open and today is inside whichever dates are set.
  const stateInfo: { label: { en: string; ar: string }; tone: string } = (() => {
    const o = cal.fieldOpen;
    const c = cal.fieldClose;
    const d = (iso: string) => formatIsoDate(iso, lang);
    if (o && c && c < o) return { label: { en: "the end date is before the start date", ar: "تاريخ الانتهاء قبل تاريخ البدء" }, tone: "text-score-crit" };
    if (g.status === "closed" || g.status === "archived") return { label: { en: "closed", ar: "مغلق" }, tone: "text-muted" };
    if (g.status === "draft") return { label: { en: "not scheduled — enter the start and end dates", ar: "غير مجدول — أدخل تاريخ البدء وتاريخ الانتهاء" }, tone: "text-muted" };
    if (o && today < o) return { label: { en: `scheduled, opens on ${d(o)}`, ar: `مجدول، يُفتح في ${d(o)}` }, tone: "text-ink" };
    if (c && today > c) return { label: { en: `ended on ${d(c)}`, ar: `انتهى في ${d(c)}` }, tone: "text-muted" };
    return c
      ? { label: { en: `open until ${d(c)}`, ar: `مفتوح حتى ${d(c)}` }, tone: "text-score-good font-medium" }
      : { label: { en: "open, with no end date set", ar: "مفتوح، دون تاريخ انتهاء" }, tone: "text-score-good font-medium" };
  })();

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
        <TextField
          label={loc({ en: "Start date", ar: "تاريخ البدء" })}
          type="date"
          value={cal.fieldOpen}
          onChange={(v) => setDates(v, cal.fieldClose)}
        />
        <TextField
          label={loc({ en: "End date", ar: "تاريخ الانتهاء" })}
          type="date"
          value={cal.fieldClose}
          onChange={(v) => setDates(cal.fieldOpen, v)}
        />
        <div className="md:col-span-2 rounded-md bg-sand-2 px-3 py-2 text-sm" role="status">
          <span className="font-medium text-ink">{loc({ en: "Status: ", ar: "الحالة: " })}</span>
          <span className={stateInfo.tone}>{loc(stateInfo.label)}</span>
          <span className="block text-xs text-subtle">
            {loc({
              en: "Staff can answer only between the start and end dates. To close early or reopen, use the Danger zone page.",
              ar: "يستطيع الموظفون الإجابة بين تاريخ البدء وتاريخ الانتهاء فقط. للإغلاق المبكر أو إعادة الفتح استخدم صفحة منطقة الخطر.",
            })}
          </span>
        </div>
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
        <TextField
          label="Short name (EN)"
          value={g.orgShort.en}
          hint={loc({
            en: "Used inside questions and sentences, e.g. Acme. Blank = the full name.",
            ar: "يُستخدم داخل الأسئلة والجمل. فارغ = الاسم الكامل.",
          })}
          onChange={(v) => patch({ orgShort: { ...g.orgShort, en: v } })}
        />
        <TextField label="الاسم المختصر (AR)" value={g.orgShort.ar} onChange={(v) => patch({ orgShort: { ...g.orgShort, ar: v } })} />
        <TextField
          label="Survey name (EN)"
          value={g.cycleName.en}
          hint={loc({
            en: "Shown to staff at the top of the survey and in emails, e.g. Staff Survey 2026.",
            ar: "يظهر للموظفين أعلى الاستبيان وفي الرسائل، مثل: استبيان الموظفين 2026.",
          })}
          onChange={(v) => patch({ cycleName: { ...g.cycleName, en: v } })}
        />
        <TextField label="اسم الاستبيان (AR)" value={g.cycleName.ar} onChange={(v) => patch({ cycleName: { ...g.cycleName, ar: v } })} />
        <TextField
          label={loc({ en: "Public address of this app", ar: "العنوان العام للتطبيق" })}
          value={g.publicUrl}
          hint={loc({
            en: "Used in invitation links, e.g. https://pulse.example.com. Leave blank to use the address you are on now.",
            ar: "يُستخدم في روابط الدعوات. اتركه فارغاً لاستخدام العنوان الحالي.",
          })}
          onChange={(v) => patch({ publicUrl: v.trim() })}
        />
        <Field label={loc({ en: "Time zone", ar: "المنطقة الزمنية" })}>
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
