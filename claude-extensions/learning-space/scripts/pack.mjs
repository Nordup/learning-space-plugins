#!/usr/bin/env node
// Builds dist/learning-space.mcpb for the Claude desktop app.
//
// The bundle is deterministic: the same inputs give the same bytes, so CI can
// rebuild it and fail when the committed file is stale (scripts/check-artifact.mjs).
//   - manifest.json is staged with long_description taken from the plugin README
//   - the icon is the plugin's logo@1024w.png
//   - every staged file gets mode 0644 and mtime 1980-01-01 00:00 UTC
//   - zip runs with TZ=UTC and -X (no extra attributes), files in a fixed order

import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const extDir = resolve(here, "..");
export const repoRoot = resolve(extDir, "../..");
const pluginDir = join(repoRoot, "plugins/learning-space");
export const outFile = join(extDir, "dist/learning-space.mcpb");

const ZIP_EPOCH = new Date(Date.UTC(1980, 0, 1, 0, 0, 0));
const FILE_MODE = 0o644;

// Returns the manifest as it ships in the bundle. The source manifest.json stays unchanged.
export function buildManifest() {
  const manifest = JSON.parse(readFileSync(join(extDir, "manifest.json"), "utf8"));
  const readme = readFileSync(join(pluginDir, "README.md"), "utf8").replace(/\r\n/g, "\n").trimEnd();
  return { ...manifest, long_description: readme };
}

// Writes manifest.json and the icon into stageDir. Returns the staged file names in zip order.
export function stage(stageDir) {
  rmSync(stageDir, { recursive: true, force: true });
  mkdirSync(stageDir, { recursive: true });
  const manifest = buildManifest();
  writeFileSync(join(stageDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  const files = ["manifest.json"];
  if (manifest.icon) {
    if (manifest.icon.includes("..") || manifest.icon.startsWith("/")) {
      throw new Error(`icon must be a plain relative path: ${manifest.icon}`);
    }
    copyFileSync(join(pluginDir, "assets/logo@1024w.png"), join(stageDir, manifest.icon));
    files.push(manifest.icon);
  }
  for (const file of files) {
    chmodSync(join(stageDir, file), FILE_MODE);
    utimesSync(join(stageDir, file), ZIP_EPOCH, ZIP_EPOCH);
  }
  return files;
}

function main() {
  const stageDir = join(extDir, "dist/stage");
  const files = stage(stageDir);
  mkdirSync(dirname(outFile), { recursive: true });
  rmSync(outFile, { force: true }); // zip updates an existing archive in place; start clean
  const zip = spawnSync("zip", ["-q", "-X", "-D", outFile, ...files], {
    cwd: stageDir,
    env: { ...process.env, TZ: "UTC" }, // DOS timestamps are local time; pin them
    stdio: "inherit",
  });
  rmSync(stageDir, { recursive: true, force: true });
  if (zip.status !== 0) {
    console.error("zip failed");
    process.exit(1);
  }
  console.log(`Wrote ${outFile.slice(repoRoot.length + 1)}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
