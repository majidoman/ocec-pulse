import { createFileRoute } from "@tanstack/react-router";
import { PageFrame } from "@/components/page-frame";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TextField } from "@/components/settings-field";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/settings/reminders")({ component: RemindPage });

function RemindPage() {
  const { t, loc } = useT();
  const cfg = useSettings((s) => s.reminderCfg);
  const patch = useSettings((s) => s.patchReminders);

  return (
    <PageFrame title={t("setRemind")} hint={t("cadenceHint")}>
      <Card className="flex flex-col gap-4">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">{t("enabled")}</span>
          <Switch checked={cfg.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label={`${t("quietHours")} start`} type="time" value={cfg.quietStart} onChange={(v) => patch({ quietStart: v })} />
          <TextField label="End" type="time" value={cfg.quietEnd} onChange={(v) => patch({ quietEnd: v })} />
        </div>
      </Card>
      {cfg.rules.map((r) => (
        <Card key={r.id} className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-ink">{loc(r.label)}</h2>
            <Switch
              checked={r.enabled}
              onCheckedChange={(v) =>
                patch({
                  rules: cfg.rules.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)),
                })
              }
            />
          </div>
          <label className="text-xs text-subtle">Days after the invitation</label>
          <Input
            type="number"
            min={1}
            value={r.dayOffset}
            onChange={(e) =>
              patch({
                rules: cfg.rules.map((x) => (x.id === r.id ? { ...x, dayOffset: Number(e.target.value) || 0 } : x)),
              })
            }
          />
          <Textarea
            value={r.bodyEn}
            onChange={(e) =>
              patch({ rules: cfg.rules.map((x) => (x.id === r.id ? { ...x, bodyEn: e.target.value } : x)) })
            }
          />
          <Textarea
            dir="rtl"
            value={r.bodyAr}
            onChange={(e) =>
              patch({ rules: cfg.rules.map((x) => (x.id === r.id ? { ...x, bodyAr: e.target.value } : x)) })
            }
          />
        </Card>
      ))}
    </PageFrame>
  );
}
