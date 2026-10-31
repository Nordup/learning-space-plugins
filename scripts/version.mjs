#!/usr/bin/env node
// The root package.json "version" is the only version source.
//   node scripts/version.mjs          write it into every manifest below
//   node scripts/version.mjs --check  exit 1 when any manifest differs
//
// After a sync, rebuild the .mcpb (npm run version:sync does both).

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// [file, path to the version field inside it]
const TARGETS = [
  [".claude-plugin/marketplace.json", ["metadata", "version"]],
  [".cursor-plugin/marketplace.json", ["metadata", "version"]],
  ["plugins/learning-space/.claude-plugin/plugin.json", ["version"]],
  ["plugins/learning-space/.codex-plugin/plugin.json", ["version"]],
  ["plugins/learning-space/.cursor-plugin/plugin.json", ["version"]],
  ["claude-extensions/learning-space/manifest.json", ["version"]],
];

const check = process.argv.includes("--check");
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`package.json version is not semver: ${version}`);
  process.exit(1);
}

let drift = 0;
for (const [file, keys] of TARGETS) {
  const path = join(root, file);
  const json = JSON.parse(readFileSync(path, "utf8"));
  const parent = keys.slice(0, -1).reduce((obj, key) => (obj[key] ??= {}), json);
  const last = keys.at(-1);
  if (parent[last] === version) continue;
  if (check) {
    console.error(`${file}: ${keys.join(".")} is ${parent[last]}, expected ${version}`);
    drift++;
    continue;
  }
  parent[last] = version;
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`${file}: ${version}`);
}

if (check && drift) {
  console.error("Run `npm run version:sync` to fix.");
  process.exit(1);
}
console.log(check ? `All ${TARGETS.length} manifests are at ${version}.` : `Synced ${version}.`);
