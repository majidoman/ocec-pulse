import { createFileRoute } from "@tanstack/react-router";
import { PageFrame } from "@/components/page-frame";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/settings-field";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";
import { contrast, isHex, paletteTokens } from "@/lib/pulse/palette";

export const Route = createFileRoute("/settings/branding")({ component: BrandPage });

function BrandPage() {
  const { t, loc } = useT();
  const b = useSettings((s) => s.branding);
  const patch = useSettings((s) => s.patchBranding);
  return (
    <PageFrame title={t("setBrand")} hint="Arabic stays RTL. Cairo is the main font.">
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
        <TextField
          label="Product name (EN)"
          value={b.appName.en}
          hint="Shown in the header and browser tab, e.g. Acme Pulse. Blank = short name + Pulse."
          onChange={(v) => patch({ appName: { ...b.appName, en: v } })}
        />
        <TextField label="اسم المنتج (AR)" value={b.appName.ar} onChange={(v) => patch({ appName: { ...b.appName, ar: v } })} />
      </Card>
      <Card>
        <h2 className="text-sm font-semibold text-ink">{loc({ en: "Colours (60 · 30 · 10)", ar: "الألوان (60 · 30 · 10)" })}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          {loc({
            en: "Three colours set the whole site. Every other shade (cards, borders, text) is worked out from them so text stays readable.",
            ar: "ثلاثة ألوان تحدد الموقع كله. تُشتق بقية الدرجات (البطاقات والحدود والنصوص) منها بحيث يبقى النص مقروءاً.",
          })}
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <ColourField
            label={loc({ en: "Background — 60%", ar: "الخلفية — 60٪" })}
            hint={loc({ en: "Page backgrounds; cards are a lighter shade.", ar: "خلفيات الصفحات؛ البطاقات درجة أفتح." })}
            value={b.background}
            onChange={(v) => patch({ background: v })}
          />
          <ColourField
            label={loc({ en: "Primary — 30%", ar: "الأساسي — 30٪" })}
            hint={loc({ en: "Side menu, headings, selected answers.", ar: "القائمة الجانبية والعناوين والإجابات المختارة." })}
            value={b.primary}
            onChange={(v) => patch({ primary: v })}
          />
          <ColourField
            label={loc({ en: "Accent — 10%", ar: "التمييز — 10٪" })}
            hint={loc({ en: "Main buttons, progress bar, current menu item.", ar: "الأزرار الرئيسية وشريط التقدّم وعنصر القائمة الحالي." })}
            value={b.accent}
            onChange={(v) => patch({ accent: v })}
          />
        </div>
        <PalettePreview background={b.background} primary={b.primary} accent={b.accent} />
      </Card>
    </PageFrame>
  );
}

function ColourField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  const ok = isHex(value);
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
      {label}
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={ok ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-border-strong bg-paper p-1"
        />
        <input
          type="text"
          value={value}
          dir="ltr"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value.trim())}
          className={`h-10 w-full rounded-md border bg-paper px-3 font-mono text-sm ${ok ? "border-border-strong" : "border-score-crit"}`}
          aria-invalid={!ok}
        />
      </span>
      <span className="text-xs font-normal text-subtle">{ok ? hint : "Use the form #RRGGBB"}</span>
    </label>
  );
}

/** A small mock of the site in the chosen colours, with the contrast the system guarantees. */
function PalettePreview(props: { background: string; primary: string; accent: string }) {
  const { loc } = useT();
  const tk = paletteTokens(props);
  const v = (k: string) => tk[k];
  const accentOnBg = isHex(props.accent) && isHex(props.background) ? contrast(props.accent, props.background) : 0;
  return (
    <div className="mt-5">
      <div className="flex overflow-hidden rounded-xl border border-border" style={{ background: v("--color-sand") }} aria-hidden>
        <div className="w-1/4 p-3" style={{ background: v("--color-primary") }}>
          <div className="h-2.5 w-3/4 rounded" style={{ background: v("--side-fg") }} />
          <div className="mt-3 h-2 w-2/3 rounded" style={{ background: v("--side-muted") }} />
          <div className="mt-2 h-2 w-1/2 rounded" style={{ background: v("--side-muted") }} />
        </div>
        <div className="flex-1 p-4">
          <div className="h-3 w-1/3 rounded" style={{ background: v("--color-ink") }} />
          <div className="mt-3 rounded-lg p-3" style={{ background: v("--color-paper"), border: `1px solid ${v("--color-border")}` }}>
            <div className="h-2 w-5/6 rounded" style={{ background: v("--color-fg") }} />
            <div className="mt-2 h-2 w-2/3 rounded" style={{ background: v("--color-muted") }} />
            <div className="mt-3 inline-block rounded-md px-3 py-1.5 text-xs font-semibold" style={{ background: v("--color-accent"), color: v("--color-accent-fg") }}>
              {loc({ en: "Next", ar: "التالي" })}
            </div>
          </div>
        </div>
      </div>
      {accentOnBg && accentOnBg < 3 ? (
        <p className="mt-2 text-xs text-subtle">
          {loc({
            en: "The accent is light against the background, so accent-coloured text uses a darker shade of it automatically.",
            ar: "لون التمييز فاتح مقابل الخلفية، لذا تُستخدم درجة أغمق منه للنصوص تلقائياً.",
          })}
        </p>
      ) : null}
    </div>
  );
}
