import { createFileRoute } from "@tanstack/react-router";
import { PageFrame } from "@/components/page-frame";
import { Card } from "@/components/ui/card";
import { AreaField, TextField } from "@/components/settings-field";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/settings/calendar")({ component: CalPage });

function CalPage() {
  const { t } = useT();
  const c = useSettings((s) => s.calendar);
  const patch = useSettings((s) => s.patchCalendar);
  const rules = useSettings((s) => s.reminderCfg.rules);
  return (
    <PageFrame title={t("setCal")} hint={t("fieldDatesNote")}>
      <Card className="grid gap-4 md:grid-cols-2">
        <TextField label="Kick-off" type="date" value={c.kickoff} onChange={(v) => patch({ kickoff: v })} />
        <TextField label="Freeze" type="date" value={c.freeze} onChange={(v) => patch({ freeze: v })} />
        <TextField label="Field open" type="date" value={c.fieldOpen} onChange={(v) => patch({ fieldOpen: v })} />
        <TextField label="Field close" type="date" value={c.fieldClose} onChange={(v) => patch({ fieldClose: v })} />
        <TextField label="Presentation" type="date" value={c.presentation} onChange={(v) => patch({ presentation: v })} />
      </Card>
      <AreaField label="Note (EN)" value={c.note.en} onChange={(v) => patch({ note: { ...c.note, en: v } })} />
      <AreaField label="ملاحظة" dir="rtl" value={c.note.ar} onChange={(v) => patch({ note: { ...c.note, ar: v } })} />
      <Card>
        <h2 className="mb-2 text-sm font-semibold">{t("navRemind")}</h2>
        <ul className="text-sm text-muted">
          {rules.map((r) => (
            <li key={r.id}>
              Day {r.dayOffset} {r.enabled ? "· on" : "· off"}
            </li>
          ))}
        </ul>
      </Card>
    </PageFrame>
  );
}
