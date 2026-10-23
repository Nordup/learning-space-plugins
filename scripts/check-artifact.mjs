#!/usr/bin/env node
// CI guard: rebuild the .mcpb and fail when it differs from the committed file.

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifact = "claude-extensions/learning-space/dist/learning-space.mcpb";
const run = (cmd, args) => spawnSync(cmd, args, { cwd: root, stdio: "inherit" }).status;

if (run("node", ["claude-extensions/learning-space/scripts/pack.mjs"]) !== 0) process.exit(1);

if (run("git", ["ls-files", "--error-unmatch", artifact]) !== 0) {
  console.error(`${artifact} is not committed.`);
  process.exit(1);
}
if (run("git", ["diff", "--exit-code", "--stat", "--", artifact]) !== 0) {
  console.error(`${artifact} is stale. Run \`npm run pack\` and commit the result.`);
  process.exit(1);
}
console.log(`${artifact} matches a fresh build.`);
