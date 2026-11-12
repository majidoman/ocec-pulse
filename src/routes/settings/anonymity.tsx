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
          hint={loc({ en: "Smallest group whose results may be shown. Between 3 and 50; 5 is the usual standard.", ar: "أصغر مجموعة تُعرض نتائجها. بين ٣ و٥٠؛ والمعتاد ٥." })}
          onChange={(v) => patch({ kFloor: Math.min(50, Math.max(3, Math.round(Number(v)) || 5)) })}
        />
        <TextField
          label={loc({ en: "Delete the invitation list (days after close)", ar: "حذف قائمة الدعوات (أيام بعد الإغلاق)" })}
          type="number"
          value={a.inviteDeleteDays}
          hint={loc({ en: "Email addresses are deleted automatically this many days after the census is closed. 0 keeps them until you delete them.", ar: "تُحذف عناوين البريد تلقائياً بعد هذا العدد من الأيام من إغلاق التعداد. ٠ يبقيها حتى تحذفها." })}
          onChange={(v) => patch({ inviteDeleteDays: Math.max(0, Math.round(Number(v)) || 0) })}
        />
        <TextField
          label={loc({ en: "Agreed retention of responses (months)", ar: "مدة الاحتفاظ بالإجابات المتفق عليها (أشهر)" })}
          type="number"
          value={a.retentionMonths}
          hint={loc({ en: "For your records. Responses are not deleted automatically: delete them from the Danger zone when this period ends.", ar: "للتوثيق. لا تُحذف الإجابات تلقائياً: احذفها من منطقة الخطر عند انتهاء المدة." })}
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
      </Card>
    </PageFrame>
  );
}
