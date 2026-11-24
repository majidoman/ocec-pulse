#!/usr/bin/env node
// Pre-release gate: every step must pass before a release goes to the live site.
//   node scripts/release-check.mjs
// 1. CHANGELOG.md has an entry for the version in package.json ("releaseVersion").
// 2. Type check.  3. Tests (obsolete platform tests are skipped, so any failure is real).
// 4. Self-hosted production build, and its entry file exists.
// After deploying: node scripts/smoke-live.mjs <live address>
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const version = pkg.releaseVersion;
const changelog = readFileSync("CHANGELOG.md", "utf8");

const steps = [
  [
    "Changelog entry",
    () => {
      if (!version) throw new Error('package.json has no "releaseVersion"');
      if (!changelog.includes(`## [${version}]`)) throw new Error(`CHANGELOG.md has no "## [${version}]" section`);
      if (!/undo/i.test(changelog.split(`## [${version}]`)[1].split("\n## [")[0]))
        throw new Error(`the ${version} section does not say how to undo it`);
    },
  ],
  ["Type check", () => execSync("npx tsc --noEmit", { stdio: "inherit" })],
  ["Tests", () => execSync("npm test", { stdio: "inherit" })],
  ["Self-hosted build", () => execSync("npm run build:selfhost", { stdio: "inherit" })],
  [
    "Build output",
    () => {
      if (!existsSync(".output/server/index.mjs")) throw new Error(".output/server/index.mjs is missing");
    },
  ],
];

for (const [name, run] of steps) {
  process.stdout.write(`\n== ${name}\n`);
  try {
    run();
    console.log(`ok   ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
console.log(`\nRelease ${version} is ready. Next: Neon backup branch (if the database changes), deploy, then smoke test.`);
