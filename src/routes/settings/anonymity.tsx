import { createFileRoute } from "@tanstack/react-router";
import { PageFrame } from "@/components/page-frame";
import { Card } from "@/components/ui/card";
import { AreaField, TextField } from "@/components/settings-field";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/settings/anonymity")({ component: AnonPage });

function AnonPage() {
  const { t, loc } = useT();
  const a = useSettings((s) => s.anonymity);
  const patch = useSettings((s) => s.patchAnonymity);
  return (
    <PageFrame title={t("setAnon")} hint={loc({ en: "How answers are protected, and the rules the system enforces.", ar: "كيف تُحمى الإجابات، والقواعد التي يفرضها النظام." })}>
      <Card className="grid gap-4 md:grid-cols-2">
        <TextField
          label={t("kFloor")}
          type="number"
          value={a.kFloor}
          hint={loc({ en: "Smallest group whose results may be shown. Between 3 and 50; 5 is the usual standard.", ar: "أصغر مجموعة تُعرض نتائجها. بين 3 و50؛ والمعتاد 5." })}
          onChange={(v) => patch({ kFloor: Math.min(50, Math.max(3, Math.round(Number(v)) || 5)) })}
        />
        <TextField
          label={loc({ en: "Delete the invitation list (days after close)", ar: "حذف قائمة الدعوات (أيام بعد الإغلاق)" })}
          type="number"
          value={a.inviteDeleteDays}
          hint={loc({ en: "Email addresses are deleted automatically this many days after the survey is closed or its end date passes. 0 keeps them until you delete them by hand.", ar: "تُحذف عناوين البريد تلقائياً بعد هذا العدد من الأيام من إغلاق الاستبيان أو مرور تاريخ انتهائه. 0 يبقيها حتى تحذفها يدوياً." })}
          onChange={(v) => patch({ inviteDeleteDays: Math.max(0, Math.round(Number(v)) || 0) })}
        />
        {!a.inviteDeleteDays ? (
          <p className="-mt-2 text-xs text-score-crit md:col-span-2">
            {loc({
              en: "Invited email addresses are currently kept forever. Most privacy notices promise deletion; 30 days is the usual choice.",
              ar: "عناوين البريد المدعوة محفوظة حالياً بلا حد. معظم إشعارات الخصوصية تعد بالحذف؛ والمعتاد 30 يوماً.",
            })}
          </p>
        ) : null}
        <TextField
          label={loc({ en: "Agreed retention of responses (months)", ar: "مدة الاحتفاظ بالإجابات المتفق عليها (أشهر)" })}
          type="number"
          value={a.retentionMonths}
          hint={loc({ en: "Answers, comments and files older than this are deleted automatically by the daily job. 0 keeps them until you delete them.", ar: "تُحذف الإجابات والتعليقات والملفات الأقدم من هذه المدة تلقائياً في المهمة اليومية. 0 يبقيها حتى تحذفها." })}
          onChange={(v) => patch({ retentionMonths: Math.max(0, Math.round(Number(v)) || 0) })}
        />
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">{loc({ en: "What the system does", ar: "ما يفعله النظام" })}</h2>
        <ul className="flex list-disc flex-col gap-2 ps-5 text-sm leading-relaxed text-muted">
          <li>{loc({ en: "Stores no name, email, IP address or device details with an answer.", ar: "لا يحفظ اسماً أو بريداً أو عنوان جهاز أو تفاصيله مع الإجابة." })}</li>
          <li>{loc({ en: "Marks a personal link as used without recording when, and stores the answer with the date only, so the two cannot be matched by time.", ar: "يعلّم الرابط الشخصي مستخدَماً دون تسجيل الوقت، ويحفظ الإجابة بالتاريخ فقط، فلا يمكن مطابقتهما زمنياً." })}</li>
          <li>{loc({ en: "Stores comments separately from the rest of the answer.", ar: "يحفظ التعليقات منفصلة عن بقية الإجابة." })}</li>
          <li>{loc({ en: "Hides any group below the floor on every screen and export, and hides a second group when one alone could be worked out by subtraction.", ar: "يحجب أي مجموعة دون الحد في كل شاشة وتصدير، ويحجب مجموعة ثانية إذا أمكن استنتاج الأولى بالطرح." })}</li>
          <li>{loc({ en: "Sends the AI briefing only totals that already passed the floor. Comments are never sent.", ar: "يرسل للإحاطة الذكية مجاميع تجاوزت الحد فقط. لا تُرسل التعليقات أبداً." })}</li>
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {loc({
            en: "What it cannot do: comments are shown as written. If someone names themselves or a colleague in a comment, readers will see it. Remind people of this in the invitation.",
            ar: "ما لا يستطيعه: تُعرض التعليقات كما كُتبت. إن ذكر أحدهم اسمه أو اسم زميل في تعليق فسيراه القرّاء. ذكّروا الناس بذلك في الدعوة.",
          })}
        </p>
      </Card>
      <Card className="grid gap-4 md:grid-cols-2">
        <AreaField label="Privacy notice (EN)" value={a.privacyNotice.en} onChange={(v) => patch({ privacyNotice: { ...a.privacyNotice, en: v } })} />
        <AreaField label="إشعار الخصوصية" dir="rtl" value={a.privacyNotice.ar} onChange={(v) => patch({ privacyNotice: { ...a.privacyNotice, ar: v } })} />
        <p className="text-xs text-subtle md:col-span-2">
          {loc({
            en: "Write @K@ where the minimum group size should appear; staff see the number set above, so the notice always matches the rule.",
            ar: "اكتب @K@ في موضع الحد الأدنى لحجم المجموعة؛ يرى الموظفون الرقم المحدد أعلاه، فيطابق الإشعار القاعدة دائماً.",
          }).replace("@K@", "{{k}}")}
        </p>
        {[a.privacyNotice.en, a.privacyNotice.ar].some((n) => /\b(three|four|five|six|seven|eight|nine|ten|\d+)\b|ثلاث|أربع|خمس|ست|سبع|ثمان|تسع|عشر/.test(n) && !n.includes("{{k}}")) ? (
          <p className="text-xs text-score-crit md:col-span-2">
            {loc({
              en: "The notice mentions a number but not @K@. Check it still matches the minimum group size.",
              ar: "يذكر الإشعار رقماً دون @K@. تأكد أنه ما زال يطابق الحد الأدنى لحجم المجموعة.",
            }).replace("@K@", "{{k}}")}
          </p>
        ) : null}
      </Card>
    </PageFrame>
  );
}
