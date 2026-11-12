import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageFrame } from "@/components/page-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { exportData } from "@/lib/pulse/api";
import { downloadText } from "@/lib/pulse/format";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/settings/integrations")({ component: IntPage });

function IntPage() {
  const { t, loc } = useT();

  async function download(kind: "departments" | "items" | "comments") {
    try {
      const res = await exportData({ data: { kind } });
      downloadText(res.filename, res.csv);
      toast.success(t("excelExport"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  return (
    <PageFrame
      title={loc({ en: "Data out", ar: "إخراج البيانات" })}
      hint={loc({ en: "Take anonymised results into Excel or Power BI.", ar: "انقل النتائج المجهولة إلى إكسل أو Power BI." })}
    >
      <Card>
        <h2 className="mb-2 text-sm font-semibold">{t("excelExport")}</h2>
        <p className="mb-3 text-sm leading-relaxed text-muted">
          {loc({
            en: "CSV files that open in Excel and load into Power BI. They contain totals only, with the same hidden groups as the screens. Individual answers are never exported.",
            ar: "ملفات CSV تُفتح في إكسل وتُحمَّل في Power BI. تحتوي مجاميع فقط، بالمجموعات المحجوبة نفسها في الشاشات. لا تُصدَّر الإجابات الفردية أبداً.",
          })}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void download("departments")}>{loc({ en: "Departments × dimensions", ar: "الإدارات × الأبعاد" })}</Button>
          <Button variant="outline" onClick={() => void download("items")}>{loc({ en: "Every question", ar: "كل سؤال" })}</Button>
          <Button variant="outline" onClick={() => void download("comments")}>{t("themesTitle")}</Button>
        </div>
      </Card>
      <Card>
        <h2 className="mb-2 text-sm font-semibold">{loc({ en: "Email", ar: "البريد" })}</h2>
        <p className="text-sm leading-relaxed text-muted">
          {loc({
            en: "Microsoft 365, Hostinger or any other mailbox connects through SMTP.",
            ar: "يتصل Microsoft 365 أو Hostinger أو أي صندوق بريد عبر SMTP.",
          })}{" "}
          <Link to="/settings/email" className="font-medium text-accent">
            {t("setEmail")}
          </Link>
        </p>
      </Card>
      <Card>
        <h2 className="mb-2 text-sm font-semibold">{loc({ en: "Not connected", ar: "غير موصول" })}</h2>
        <p className="text-sm leading-relaxed text-muted">
          {loc({
            en: "There is no automatic sync with an HR system: the invitation list is uploaded as a file. A live Power BI connection is not provided: use the downloads above.",
            ar: "لا مزامنة تلقائية مع نظام الموارد البشرية: تُرفع قائمة الدعوات كملف. لا اتصال مباشر مع Power BI: استخدم التنزيلات أعلاه.",
          })}
        </p>
      </Card>
    </PageFrame>
  );
}
