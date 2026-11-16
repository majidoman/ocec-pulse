import type { ThemeId } from "./config";
import type { Localized } from "../types";

/**
 * Colour themes for the pages employees see. Each one overrides the app's colour tokens inside the
 * survey pages only; the results dashboards keep the house look so charts stay readable.
 * Every pair below meets WCAG 2.1 AA contrast (checked by scripts/theme-contrast.mjs): body text and
 * secondary text ≥ 4.5:1 on page and card, button text ≥ 4.5:1, field borders ≥ 3:1.
 * "brand" uses the organisation's own colours from Settings → Branding.
 */
export type ThemeTokens = Record<
  "sand" | "sand-2" | "paper" | "fg" | "ink" | "ink-soft" | "muted" | "subtle" | "accent" | "accent-fg" | "border" | "border-strong" | "ring" | "score-crit",
  string
>;

export const THEMES: { id: ThemeId; name: Localized; tokens: ThemeTokens | null }[] = [
  { id: "brand", name: { en: "Brand colours", ar: "ألوان الهوية" }, tokens: null },
  {
    id: "desert",
    name: { en: "Desert", ar: "صحراء" },
    tokens: {
      sand: "#f5ede0", "sand-2": "#ebdfcc", paper: "#fffaf3", fg: "#2e2119", ink: "#5a3a22", "ink-soft": "#6e4a2f",
      muted: "#6b5646", subtle: "#857060", accent: "#9a4f1f", "accent-fg": "#fffaf3", border: "#dccbb3", "border-strong": "#a08a72",
      ring: "#9a4f1f", "score-crit": "#a3321f",
    },
  },
  {
    id: "ocean",
    name: { en: "Ocean", ar: "بحر" },
    tokens: {
      sand: "#edf3f6", "sand-2": "#dde8ee", paper: "#ffffff", fg: "#13293a", ink: "#0f3a52", "ink-soft": "#1b4b66",
      muted: "#4d6575", subtle: "#5f7787", accent: "#1d6385", "accent-fg": "#ffffff", border: "#cbdbe4", "border-strong": "#7d97a7",
      ring: "#1d6385", "score-crit": "#b02a2a",
    },
  },
  {
    id: "palm",
    name: { en: "Palm", ar: "نخيل" },
    tokens: {
      sand: "#f0f3ec", "sand-2": "#e1e8da", paper: "#fcfdf9", fg: "#1c2a1f", ink: "#24452f", "ink-soft": "#2f573c",
      muted: "#506252", subtle: "#617363", accent: "#3a6b45", "accent-fg": "#fcfdf9", border: "#cfdac8", "border-strong": "#82937b",
      ring: "#3a6b45", "score-crit": "#a3321f",
    },
  },
  {
    id: "slate",
    name: { en: "Corporate", ar: "مؤسسي" },
    tokens: {
      sand: "#f2f3f5", "sand-2": "#e4e7eb", paper: "#ffffff", fg: "#1b2430", ink: "#26324a", "ink-soft": "#334160",
      muted: "#525d6b", subtle: "#646f7d", accent: "#2f5a9e", "accent-fg": "#ffffff", border: "#d5d9df", "border-strong": "#838c99",
      ring: "#2f5a9e", "score-crit": "#b02a2a",
    },
  },
  {
    id: "night",
    name: { en: "Night", ar: "ليلي" },
    tokens: {
      sand: "#11181c", "sand-2": "#1c262c", paper: "#18222a", fg: "#e8eef1", ink: "#d9e8e6", "ink-soft": "#c4d8d5",
      muted: "#a3b2ba", subtle: "#93a3ab", accent: "#7cc4bb", "accent-fg": "#11181c", border: "#2c3a42", "border-strong": "#61727b",
      ring: "#7cc4bb", "score-crit": "#ff8f80",
    },
  },
  {
    id: "contrast",
    name: { en: "High contrast", ar: "تباين عالٍ" },
    tokens: {
      sand: "#ffffff", "sand-2": "#eeeeee", paper: "#ffffff", fg: "#000000", ink: "#000000", "ink-soft": "#1a1a1a",
      muted: "#2b2b2b", subtle: "#3d3d3d", accent: "#0040a0", "accent-fg": "#ffffff", border: "#595959", "border-strong": "#000000",
      ring: "#0040a0", "score-crit": "#a00000",
    },
  },
];

/** CSS custom properties for a theme, to put on the wrapper of an employee page (empty for "brand"). */
export function themeStyle(id: ThemeId | undefined): Record<string, string> {
  const theme = THEMES.find((t) => t.id === id);
  if (!theme?.tokens) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(theme.tokens)) out[`--color-${k}`] = v;
  return out;
}
