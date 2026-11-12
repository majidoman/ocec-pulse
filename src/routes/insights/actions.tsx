import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageFrame } from "@/components/page-frame";
import { PlanBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCensus } from "@/lib/census";
import { canEditSettings } from "@/lib/pulse/config";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";
import type { ActionPlan } from "@/lib/types";

export const Route = createFileRoute("/insights/actions")({ component: ActionsPage });

const blank = { title: "", owner: "", horizon: "90 days", why: "", steps: "" };

function ActionsPage() {
  const { t, loc } = useT();
  const { departments, currentRole } = useCensus();
  const actions = useSettings((s) => s.actions);
  const setActions = useSettings((s) => s.setActions);
  const canEdit = canEditSettings(currentRole);
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);

  function add() {
    if (!form.title.trim()) return toast.error(loc({ en: "Give the action a title.", ar: "أضف عنواناً للإجراء." }));
    const both = (v: string) => ({ en: v.trim(), ar: v.trim() });
    const plan: ActionPlan = {
      id: `a-${Date.now()}`,
      title: both(form.title),
      owner: both(form.owner),
      horizon: both(form.horizon),
      why: both(form.why),
      steps: form.steps.split("\n").map((s) => s.trim()).filter(Boolean).map(both),
      departments: [],
      status: "proposed",
    };
    setActions([...actions, plan]);
    setForm(blank);
    setOpen(false);
  }

  const cycle = (s: ActionPlan["status"]): ActionPlan["status"] => (s === "proposed" ? "in-motion" : s === "in-motion" ? "done" : "proposed");

  return (
    <PageFrame
      title={t("navActions")}
      hint={t("actionHint")}
      actions={
        canEdit ? (
          <Button className="print:hidden" onClick={() => setOpen(!open)}>
            {loc({ en: "Add an action", ar: "إضافة إجراء" })}
          </Button>
        ) : undefined
      }
    >
      {open && canEdit ? (
        <Card className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label>{loc({ en: "Action", ar: "الإجراء" })}</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("owner")}</Label>
            <Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("horizon")}</Label>
            <Input value={form.horizon} onChange={(e) => setForm({ ...form, horizon: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label>{t("whyThis")}</Label>
            <Textarea rows={2} value={form.why} onChange={(e) => setForm({ ...form, why: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label>{loc({ en: "Next steps (one per line)", ar: "الخطوات التالية (سطر لكل خطوة)" })}</Label>
            <Textarea rows={3} value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} />
          </div>
          <Button onClick={add}>{t("save")}</Button>
        </Card>
      ) : null}

      {!actions.length ? (
        <Card>
          <p className="text-sm leading-relaxed text-muted">
            {loc({
              en: "No actions yet. After the findings are presented, agree the moves with their owners and record them here so the plan sits next to the numbers.",
              ar: "لا إجراءات بعد. بعد عرض النتائج، اتفقوا على الحركات مع مالكيها وسجّلوها هنا لتبقى الخطة بجانب الأرقام.",
            })}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {actions.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <PlanBadge status={a.status} />
                    <span className="text-xs text-subtle">{loc(a.horizon)}</span>
                  </div>
                  <h2 className="font-display text-2xl text-ink">{loc(a.title)}</h2>
                  {loc(a.why) ? <p className="mt-2 text-sm leading-relaxed text-muted">{loc(a.why)}</p> : null}
                </div>
                <div className="text-sm text-muted md:text-end">
                  <div className="text-xs uppercase tracking-[0.12em] text-subtle">{t("owner")}</div>
                  <div className="mt-1 text-ink">{loc(a.owner) || "—"}</div>
                </div>
              </div>
              {a.steps.length ? (
                <ol className="mt-5 grid gap-2 md:grid-cols-3">
                  {a.steps.map((step, i) => (
                    <li key={i} className="rounded-xl bg-sand-2 px-4 py-3 text-sm leading-relaxed text-ink">
                      <span className="me-2 text-xs text-subtle">{i + 1}</span>
                      {loc(step)}
                    </li>
                  ))}
                </ol>
              ) : null}
              {a.departments.length ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {a.departments.map((id) => {
                    const d = departments.find((x) => x.id === id);
                    return d ? (
                      <span key={id} className="rounded-full bg-sand-2 px-2.5 py-1 text-xs text-ink">
                        {loc(d.name)}
                      </span>
                    ) : null;
                  })}
                </div>
              ) : null}
              {canEdit ? (
                <div className="mt-4 flex flex-wrap gap-2 print:hidden">
                  <Button size="sm" variant="outline" onClick={() => setActions(actions.map((x) => (x.id === a.id ? { ...x, status: cycle(x.status) } : x)))}>
                    {loc({ en: "Move status on", ar: "تغيير الحالة" })}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setActions(actions.filter((x) => x.id !== a.id))}>
                    {loc({ en: "Remove", ar: "حذف" })}
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
