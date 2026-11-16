// Checks every survey theme against WCAG 2.1 AA contrast. Run: node scripts/theme-contrast.mjs
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../src/lib/pulse/themes.ts", import.meta.url), "utf8");
const blocks = [...src.matchAll(/id: "(\w+)",\s*name: [^\n]*\n\s*tokens: \{([^}]*)\}/g)];
const lum = (hex) => {
  const c = hex.replace("#", "").match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const checks = [["fg", "sand", 4.5], ["fg", "paper", 4.5], ["muted", "sand", 4.5], ["muted", "paper", 4.5], ["subtle", "paper", 4.5], ["sand", "ink", 4.5], ["accent", "paper", 4.5], ["accent-fg", "accent", 4.5], ["score-crit", "paper", 4.5], ["border-strong", "paper", 3], ["ink", "paper", 3]];
let bad = 0;
for (const [, id, body] of blocks) {
  const t = Object.fromEntries([...body.matchAll(/"?([\w-]+)"?: "(#[0-9a-f]{6})"/gi)].map((m) => [m[1], m[2]]));
  for (const [a, b, min] of checks) {
    const r = ratio(t[a], t[b]);
    if (r < min) { bad++; console.log(`FAIL ${id}: ${a} on ${b} = ${r.toFixed(2)} (needs ${min})`); }
  }
  console.log(`${id}: checked`);
}
console.log(bad ? `${bad} FAILED` : "ALL PASS"); process.exit(bad ? 1 : 0);
