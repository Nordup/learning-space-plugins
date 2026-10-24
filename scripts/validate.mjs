#!/usr/bin/env node
// Validates every manifest in the repo. This is the build's check step.
//   - JSON shape of the Claude, Codex, Cursor and Agent Plugins manifests and marketplaces
//   - every referenced path exists; names agree; reserved-name rules
//   - the three MCP wirings point at the same app (port and relay command)
//   - skill frontmatter
//   - `claude plugin validate` (when the claude CLI is on PATH)
//   - `mcpb validate` on the staged Claude app manifest

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stage } from "../claude-extensions/learning-space/scripts/pack.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NAME = "learning-space";
const PLUGIN = "plugins/learning-space";
const RELAY = "/.learning-space/bin/learning-space";
const MCP_URL = "http://127.0.0.1:47821/mcp";
const AGENT_PLUGINS = "https://agent-plugins.org/schemas/1.0.0";

const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);
const read = (file) => {
  try {
    return JSON.parse(readFileSync(join(root, file), "utf8"));
  } catch (error) {
    fail(file, `cannot parse: ${error.message}`);
    return {};
  }
};
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;
const KEBAB = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const RESERVED_PREFIX = /^(claude|anthropic)-/;

function checkName(file, name) {
  if (name !== NAME) fail(file, `name is "${name}", expected "${NAME}"`);
  if (!KEBAB.test(name ?? "") || name.length > 64) fail(file, `name "${name}" is not kebab-case (max 64)`);
  if (RESERVED_PREFIX.test(name ?? "") || /official/.test(name ?? "")) fail(file, `name "${name}" uses a reserved word`);
}

function checkRelPath(file, field, value, base = PLUGIN) {
  if (!nonEmpty(value) || !value.startsWith("./") || value.includes("..")) {
    fail(file, `${field} must be a "./" relative path inside the plugin, got ${JSON.stringify(value)}`);
    return;
  }
  if (!existsSync(join(root, base, value))) fail(file, `${field} points at a missing path: ${value}`);
}

function checkKeys(file, obj, allowed) {
  for (const key of Object.keys(obj)) if (!allowed.includes(key)) fail(file, `unknown field "${key}"`);
}

function checkCommon(file, m) {
  checkName(file, m.name);
  if (!nonEmpty(m.description)) fail(file, "description is missing");
  if (!/^\d+\.\d+\.\d+/.test(m.version ?? "")) fail(file, "version is missing");
  if (!isObject(m.author) || !nonEmpty(m.author.name)) fail(file, "author.name is missing");
  if (m.license !== "MIT") fail(file, `license is ${m.license}, expected MIT`);
}

function stdioServer(file, servers, homeVar) {
  const s = servers?.[NAME];
  if (!isObject(s)) return fail(file, `mcpServers.${NAME} is missing`);
  if (s.command !== `${homeVar}${RELAY}`) fail(file, `command is ${s.command}, expected ${homeVar}${RELAY}`);
  if (JSON.stringify(s.args) !== '["mcp"]') fail(file, 'args must be ["mcp"]');
}

// --- Marketplaces ------------------------------------------------------------

for (const file of [".claude-plugin/marketplace.json", ".cursor-plugin/marketplace.json"]) {
  const m = read(file);
  checkKeys(file, m, ["$schema", "name", "owner", "metadata", "plugins"]);
  checkName(file, m.name);
  if (!isObject(m.owner) || !nonEmpty(m.owner.name)) fail(file, "owner.name is missing");
  if (!nonEmpty(m.metadata?.description)) fail(file, "metadata.description is missing");
  if (!Array.isArray(m.plugins) || m.plugins.length !== 1) fail(file, "plugins must list exactly one plugin");
  for (const p of m.plugins ?? []) {
    checkName(file, p.name);
    if (p.source !== `./${PLUGIN}`) fail(file, `plugin source is ${p.source}, expected ./${PLUGIN}`);
    if (!nonEmpty(p.description)) fail(file, "plugin description is missing");
  }
}

{
  const file = ".agents/plugins/marketplace.json";
  const m = read(file);
  checkName(file, m.name);
  if (!nonEmpty(m.interface?.displayName)) fail(file, "interface.displayName is missing");
  for (const p of m.plugins ?? []) {
    checkName(file, p.name);
    if (p.source?.source !== "local" || p.source?.path !== `./${PLUGIN}`) fail(file, `source must be local ./${PLUGIN}`);
    if (!["Education", "Productivity"].includes(p.category)) fail(file, `category is ${p.category}`);
    if (p.policy?.installation !== "AVAILABLE") fail(file, "policy.installation must be AVAILABLE");
  }
}

// The prompt hook: `learning-space news --client <label>` before each prompt. Each client gets
// its own file (the label differs), and neither is named hooks/hooks.json, which Claude Code and
// Codex would also load by default.
function checkNewsHook(file, m, label) {
  checkRelPath(file, "hooks", m.hooks);
  if (!nonEmpty(m.hooks) || m.hooks === "./hooks/hooks.json") return fail(file, "hooks must name a client-specific file");
  const hookFile = `${PLUGIN}/${m.hooks.slice(2)}`;
  const entries = read(hookFile).hooks?.UserPromptSubmit;
  const command = Array.isArray(entries) ? entries[0]?.hooks?.[0]?.command : undefined;
  if (!nonEmpty(command) || !command.includes(RELAY) || !command.includes(`news --client "${label}"`) || !command.endsWith("|| true")) {
    fail(hookFile, `UserPromptSubmit must run ${RELAY} news --client "${label}" ... || true`);
  }
}

// --- Claude Code -------------------------------------------------------------

{
  const file = `${PLUGIN}/.claude-plugin/plugin.json`;
  const m = read(file);
  checkCommon(file, m);
  checkRelPath(file, "mcpServers", m.mcpServers);
  stdioServer("mcp.claude.json", read(`${PLUGIN}/mcp.claude.json`).mcpServers, "${HOME}");
  checkNewsHook(file, m, "Claude Code");
}

// --- Codex -------------------------------------------------------------------

{
  const file = `${PLUGIN}/.codex-plugin/plugin.json`;
  const m = read(file);
  checkCommon(file, m);
  checkRelPath(file, "skills", m.skills);
  checkRelPath(file, "mcpServers", m.mcpServers);
  const i = m.interface ?? {};
  for (const key of ["displayName", "shortDescription", "longDescription", "developerName", "category"]) {
    if (!nonEmpty(i[key])) fail(file, `interface.${key} is missing`);
  }
  if (!Array.isArray(i.capabilities) || i.capabilities.length === 0) fail(file, "interface.capabilities is missing");
  if (!/^#[0-9A-Fa-f]{6}$/.test(i.brandColor ?? "")) fail(file, "interface.brandColor must be #RRGGBB");
  checkRelPath(file, "interface.logo", i.logo);
  checkRelPath(file, "interface.composerIcon", i.composerIcon);
  const prompts = i.defaultPrompt ?? [];
  if (!Array.isArray(prompts) || prompts.length === 0 || prompts.length > 3) fail(file, "defaultPrompt needs 1-3 entries");
  for (const p of prompts) {
    const length = String(p).replace(/\s+/g, " ").trim().length;
    if (length > 128) fail(file, `defaultPrompt is ${length} chars (max 128): ${p}`);
  }
  const server = read(`${PLUGIN}/mcp.codex.json`).mcpServers?.[NAME];
  if (server?.type !== "http" || server?.url !== MCP_URL) fail("mcp.codex.json", `server must be http ${MCP_URL}`);
  checkNewsHook(file, m, "Codex");
}

// --- Agent Plugins (plugin.json + mcp.json at the plugin root) ---------------

{
  const file = `${PLUGIN}/plugin.json`;
  const m = read(file);
  checkKeys(file, m, ["$schema", "name", "version", "description", "author", "homepage", "repository", "license", "keywords", "extensions"]);
  if (m.$schema !== `${AGENT_PLUGINS}/plugin.schema.json`) fail(file, `$schema must be ${AGENT_PLUGINS}/plugin.schema.json`);
  checkCommon(file, m);
  checkKeys(`${file} author`, m.author ?? {}, ["name", "email", "url"]);

  const mcpFile = `${PLUGIN}/mcp.json`;
  const mcp = read(mcpFile);
  checkKeys(mcpFile, mcp, ["$schema", "mcpServers"]);
  if (mcp.$schema !== `${AGENT_PLUGINS}/mcp.schema.json`) fail(mcpFile, `$schema must be ${AGENT_PLUGINS}/mcp.schema.json`);
  const server = mcp.mcpServers?.[NAME] ?? {};
  checkKeys(`${mcpFile} server`, server, ["type", "url", "headers"]);
  if (server.type !== "streamable-http" || server.url !== MCP_URL) fail(mcpFile, `server must be streamable-http ${MCP_URL}`);
}

// --- Cursor ------------------------------------------------------------------

{
  const file = `${PLUGIN}/.cursor-plugin/plugin.json`;
  const m = read(file);
  checkKeys(file, m, ["name", "displayName", "description", "version", "author", "publisher", "homepage", "repository", "license", "logo", "keywords", "category", "tags", "commands", "agents", "skills", "rules", "hooks", "mcpServers"]);
  checkCommon(file, m);
  checkRelPath(file, "logo", m.logo);
  checkRelPath(file, "skills", m.skills);
  checkRelPath(file, "mcpServers", m.mcpServers);
  stdioServer("mcp.cursor.json", read(`${PLUGIN}/mcp.cursor.json`).mcpServers, "${env:HOME}");
}

// --- Skill -------------------------------------------------------------------

{
  const file = `${PLUGIN}/skills/${NAME}/SKILL.md`;
  const text = existsSync(join(root, file)) ? readFileSync(join(root, file), "utf8") : "";
  const front = text.match(/^---\n([\s\S]*?)\n---\n/)?.[1];
  if (!front) fail(file, "frontmatter is missing");
  const field = (key) => front?.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1].trim();
  if (field("name") !== NAME) fail(file, `frontmatter name must be ${NAME}`);
  const description = field("description") ?? "";
  if (!description || description.length > 1024) fail(file, "description is missing or over 1024 chars");
  if (!field("when_to_use")) fail(file, "when_to_use is missing");
  const lines = text.trimEnd().split("\n").length;
  if (lines > 40) fail(file, `skill is ${lines} lines (max 40)`);
}

// --- Claude app (.mcpb) manifest ---------------------------------------------

const extFile = "claude-extensions/learning-space/manifest.json";
{
  const m = read(extFile);
  checkCommon(extFile, m);
  if (m.manifest_version !== "0.3") fail(extFile, "manifest_version must be 0.3");
  if (m.server?.type !== "binary") fail(extFile, "server.type must be binary");
  if (m.server?.entry_point !== `\${HOME}${RELAY}`) fail(extFile, "server.entry_point must be the relay command");
  stdioServer(extFile, { [NAME]: m.server?.mcp_config }, "${HOME}");
  if (JSON.stringify(m.compatibility?.platforms) !== '["darwin"]') fail(extFile, 'platforms must be ["darwin"]');
}
for (const asset of ["assets/logo.svg", "assets/logo@1024w.png", "README.md"]) {
  if (!existsSync(join(root, PLUGIN, asset))) fail(PLUGIN, `missing ${asset}`);
}

// --- External validators -----------------------------------------------------

function external(label, cmd, args) {
  console.log(`\n$ ${[cmd, ...args].join(" ")}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit" });
  if (r.error?.code === "ENOENT") return false;
  if (r.status !== 0) fail(label, `exited with ${r.status}`);
  return true;
}

if (errors.length === 0) {
  const hasClaude = spawnSync("claude", ["--version"], { stdio: "ignore" }).status === 0;
  if (hasClaude) {
    external("claude plugin validate (plugin)", "claude", ["plugin", "validate", "--strict", PLUGIN]);
    external("claude plugin validate (marketplace)", "claude", ["plugin", "validate", "--strict", "."]);
  } else {
    console.log("\nSkipped `claude plugin validate`: the claude CLI is not on PATH.");
  }

  const tmp = mkdtempSync(join(tmpdir(), "learning-space-mcpb-"));
  try {
    stage(tmp);
    external("mcpb validate", "npx", ["-y", "@anthropic-ai/mcpb", "validate", join(tmp, "manifest.json")]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("\nAll manifests are valid.");
