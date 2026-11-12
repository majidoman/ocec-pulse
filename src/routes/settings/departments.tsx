import { createFileRoute, Link } from "@tanstack/react-router";
import { PageFrame } from "@/components/page-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCensus } from "@/lib/census";
import { totalHeadcount } from "@/lib/pulse/config";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/settings/departments")({ component: DeptsPage });

function DeptsPage() {
  const { t, loc } = useT();
  const departments = useSettings((s) => s.departments);
  const patchDepartment = useSettings((s) => s.patchDepartment);
  const addDepartment = useSettings((s) => s.addDepartment);
  const k = useCensus().kFloor;

  return (
    <PageFrame
      title={loc({ en: "Departments", ar: "الإدارات" })}
      hint={loc({
        en: "The departments people can choose in the survey, and the headcount used for response rates. Confirm these numbers with People & Culture before launch.",
        ar: "الإدارات التي يختارها الموظف في الاستبيان، والأعداد المستخدمة لنسب الاستجابة. أكّد هذه الأرقام مع الأفراد والثقافة قبل الإطلاق.",
      })}
    >
      <Card>
        <p className="text-xs text-subtle">{loc({ en: "Total headcount in scope", ar: "إجمالي العدد ضمن النطاق" })}</p>
        <p className="mt-1 font-display text-3xl tabular-nums text-ink">{totalHeadcount({ departments })}</p>
      </Card>
      <div className="flex flex-col gap-2">
        {departments.map((d) => {
          const warn = !d.archived && d.headcount > 0 && d.headcount < k;
          return (
            <Card key={d.id} className={`grid gap-3 md:grid-cols-12 ${d.archived ? "opacity-60" : ""}`}>
              <div className="md:col-span-3">
                <Input aria-label="Name (English)" value={d.name.en} onChange={(e) => patchDepartment(d.id, { name: { ...d.name, en: e.target.value } })} />
              </div>
              <div className="md:col-span-3">
                <Input aria-label="الاسم" dir="rtl" value={d.name.ar} onChange={(e) => patchDepartment(d.id, { name: { ...d.name, ar: e.target.value } })} />
              </div>
              <div className="md:col-span-2">
                <Input aria-label={t("headcount")} type="number" min={0} value={d.headcount} onChange={(e) => patchDepartment(d.id, { headcount: Math.max(0, Number(e.target.value) || 0) })} />
              </div>
              <div className="flex items-center justify-between gap-2 text-xs md:col-span-4">
                {warn ? (
                  <span className="text-score-crit">
                    {loc({ en: `Smaller than the floor (${k}): its results can never be shown. Consider merging it.`, ar: `أصغر من الحد (${k}): لن تُعرض نتائجها أبداً. فكّر في دمجها.` })}
                  </span>
                ) : (
                  <span className="text-subtle">{d.archived ? loc({ en: "Hidden from the survey", ar: "مخفية من الاستبيان" }) : ""}</span>
                )}
                <Button size="sm" variant="ghost" onClick={() => patchDepartment(d.id, { archived: !d.archived })}>
                  {d.archived ? loc({ en: "Restore", ar: "استعادة" }) : loc({ en: "Hide", ar: "إخفاء" })}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => addDepartment({ id: `dept-${Date.now()}`, name: { en: "New department", ar: "إدارة جديدة" }, headcount: 0 })}>
          + {loc({ en: "Add department", ar: "إضافة إدارة" })}
        </Button>
        <Link to="/insights/invitations" className="text-sm font-medium text-accent">
          {loc({ en: "The email list for invitations is managed under Invitations", ar: "قائمة البريد للدعوات تُدار من صفحة الدعوات" })}
        </Link>
      </div>
    </PageFrame>
  );
}
