/**
 * The site palette from three brand colours, following the 60 · 30 · 10 rule:
 *   background (60%): page backgrounds; cards and borders are shades of it;
 *   primary    (30%): side menu, headings, selected answers, dark panels;
 *   accent     (10%): main buttons, progress, the current menu item, highlights.
 *
 * Every other shade is derived so text stays readable (WCAG 2.1 AA), whatever colours a client
 * picks: body text ≥ 7:1, secondary text ≥ 4.5:1, borders of fields ≥ 3:1, button text ≥ 4.5:1
 * where the colours allow it. Accent-coloured text is darkened until it reads on the background,
 * because bright accents (orange, yellow) are for fills, not for words.
 */

type Rgb = [number, number, number];

export const PALETTE_DEFAULTS = { background: "#F4EFE6", primary: "#142A32", accent: "#2C6A6A" } as const;

export function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v.trim());
}

function rgb(hex: string): Rgb {
  const h = hex.trim().replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function hex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;
}

/** a → b by t (0 = a, 1 = b). */
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

function luminance(color: string): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb(color);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Hue in degrees (0–360) and saturation (0–1). */
function hueSat(color: string): [number, number] {
  const [r, g, b] = rgb(color).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (!d) return [0, 0];
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const l = (max + min) / 2;
  return [(h * 60 + 360) % 360, d / (1 - Math.abs(2 * l - 1))];
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Move `color` toward `target` in small steps until it reaches `ratio` against every `on`. */
function until(color: string, target: string, ratio: number, on: string[]): string {
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const c = mix(color, target, t);
    if (on.every((o) => contrast(c, o) >= ratio)) return c;
  }
  return target;
}

/** The lightest/most muted mix of `from` toward `base` that still reaches `ratio` against `on`. */
function softest(from: string, base: string, ratio: number, on: string[]): string {
  for (let t = 0.8; t >= 0; t -= 0.02) {
    const c = mix(from, base, t);
    if (on.every((o) => contrast(c, o) >= ratio)) return c;
  }
  return from;
}

export type PaletteInput = { background?: string; primary?: string; accent?: string };

/** CSS custom properties for the whole site. */
export function paletteTokens(input: PaletteInput): Record<string, string> {
  const bg = isHex(input.background) ? input.background.trim() : PALETTE_DEFAULTS.background;
  const primary = isHex(input.primary) ? input.primary.trim() : PALETTE_DEFAULTS.primary;
  const accent = isHex(input.accent) ? input.accent.trim() : PALETTE_DEFAULTS.accent;
  const light = luminance(bg) > 0.35;
  const deep = light ? "#000000" : "#ffffff";
  const far = light ? "#ffffff" : "#000000";

  const sand2 = mix(bg, deep, 0.06);
  const paper = mix(bg, far, 0.45);
  const surfaces = [bg, sand2, paper];
  const fg = until(mix(primary, deep, 0.45), deep, 7, surfaces);
  const ink = until(primary, deep, 4.5, surfaces);
  const muted = softest(fg, bg, 4.5, surfaces);
  const subtle = softest(fg, bg, 4.5, [bg, paper]);
  const borderStrong = until(mix(bg, fg, 0.25), fg, 3, [bg, paper]);
  const accentFg = [fg, "#ffffff", "#000000"].sort((a, b) => contrast(b, accent) - contrast(a, accent))[0];
  const accentText = until(accent, deep, 4.5, surfaces);

  // Side menu: the primary colour, with whichever light or dark text reads on it.
  const whiteText = contrast("#ffffff", primary) >= contrast("#000000", primary);
  const sideFg = whiteText ? until(mix("#ffffff", bg, 0.1), "#ffffff", 4.5, [primary]) : until(light ? fg : "#1a1a1a", "#000000", 4.5, [primary]);
  const sideMuted = softest(sideFg, primary, 4.5, [primary, mix(primary, "#000000", 0.2)]);
  const sideMark = mix(primary, deep, 0.15);

  // Score colours keep their meaning (green good, red bad). When the primary colour is itself a
  // green, the "good" end takes its shade so charts sit in the same family as the site.
  const [hue, sat] = hueSat(primary);
  const greenPrimary = sat > 0.12 && hue >= 60 && hue <= 170;
  const scores: Record<string, string> = greenPrimary
    ? { "--color-score-high": until(mix(primary, "#000000", 0.15), "#000000", 4.5, [paper]), "--color-score-good": mix(primary, bg, 0.2) }
    : {};

  return {
    ...scores,
    "--color-sand": bg,
    "--color-sand-2": sand2,
    "--color-paper": paper,
    "--color-fg": fg,
    "--color-ink": ink,
    "--color-ink-soft": mix(ink, far, 0.12),
    "--color-muted": muted,
    "--color-subtle": subtle,
    "--color-accent": accent,
    "--color-accent-fg": accentFg,
    "--color-accent-text": accentText,
    "--color-border": mix(bg, deep, 0.12),
    "--color-border-strong": borderStrong,
    "--color-ring": ink,
    "--color-primary": primary,
    "--side-fg": sideFg,
    "--side-muted": sideMuted,
    "--side-mark": sideMark,
  };
}
