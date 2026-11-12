import { createFileRoute } from "@tanstack/react-router";
import { PageFrame } from "@/components/page-frame";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/settings-field";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/settings/branding")({ component: BrandPage });

function BrandPage() {
  const { t } = useT();
  const b = useSettings((s) => s.branding);
  const patch = useSettings((s) => s.patchBranding);
  return (
    <PageFrame title={t("setBrand")} hint="Arabic stays RTL. IBM Plex Arabic is the house face.">
      <Card className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium md:col-span-2">
          Logo
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const r = new FileReader();
              r.onload = () => patch({ logoDataUrl: String(r.result) });
              r.readAsDataURL(f);
            }}
          />
          {b.logoDataUrl ? <img src={b.logoDataUrl} alt="" className="mt-2 h-12 w-auto" /> : null}
        </label>
        <TextField label="Primary" value={b.primary} onChange={(v) => patch({ primary: v })} />
        <TextField label="Accent" value={b.accent} onChange={(v) => patch({ accent: v })} />
      </Card>
    </PageFrame>
  );
}
