import { test } from "node:test";
import assert from "node:assert/strict";
import { contrast, paletteTokens } from "./palette.ts";

const CASES = [
  { name: "OCEC sand / olive / orange", background: "#E3D8C5", primary: "#4B5A3C", accent: "#FF8F3A" },
  { name: "defaults", background: undefined, primary: undefined, accent: undefined },
  { name: "white / yellow / yellow (hard case)", background: "#FFFFFF", primary: "#FFD400", accent: "#FFEE00" },
  { name: "dark navy / mid blue / amber", background: "#101820", primary: "#2E86AB", accent: "#F6AE2D" },
  { name: "cream / maroon / gold", background: "#FAF6EE", primary: "#7A1F2B", accent: "#C9A227" },
];

for (const c of CASES) {
  test(`palette stays readable: ${c.name}`, () => {
    const t = paletteTokens(c);
    const r = (a: string, b: string) => contrast(t[a], t[b]);
    for (const surface of ["--color-sand", "--color-sand-2", "--color-paper"]) {
      assert.ok(r("--color-fg", surface) >= 7, `body text on ${surface}`);
      assert.ok(r("--color-muted", surface) >= 4.5, `secondary text on ${surface}`);
      assert.ok(r("--color-ink", surface) >= 4.5, `headings on ${surface}`);
      assert.ok(r("--color-accent-text", surface) >= 4.5, `accent text on ${surface}`);
    }
    assert.ok(r("--color-subtle", "--color-sand") >= 4.5, "hints on the page");
    assert.ok(r("--color-border-strong", "--color-sand") >= 3, "field borders");
    assert.ok(r("--color-accent-fg", "--color-accent") >= 4.5, "button text");
    assert.ok(r("--side-fg", "--color-primary") >= 4.5, "side menu text");
    assert.ok(r("--side-muted", "--color-primary") >= 4.5, "side menu secondary text");
  });
}

test("bad colour values fall back to the defaults", () => {
  assert.deepEqual(paletteTokens({ background: "red; x", primary: "", accent: "#12" }), paletteTokens({}));
});

test("the three chosen colours are used exactly", () => {
  const t = paletteTokens({ background: "#E3D8C5", primary: "#4B5A3C", accent: "#FF8F3A" });
  assert.equal(t["--color-sand"], "#E3D8C5");
  assert.equal(t["--color-primary"], "#4B5A3C");
  assert.equal(t["--color-accent"], "#FF8F3A");
});
