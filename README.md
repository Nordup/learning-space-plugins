# Learning Space agent plugins

Plugins that connect your AI agent to Learning Space, a shared canvas on your Mac. You write by hand. The agent sees the board, draws, explains and checks your work.

Each plugin adds the `learning-space` MCP server and a small skill that teaches the agent how to work on the board. See [plugins/learning-space/README.md](plugins/learning-space/README.md) for what the plugin does and for example prompts.

## Before you install

1. Install Learning Space (macOS).
2. Open it once. The first launch installs `~/.learning-space/bin/learning-space`, the command that agents use to connect.

If you already added the server by hand (`claude mcp add learning-space …` or `codex mcp add learning-space …`), remove that entry first. Otherwise the agent sees every tool twice.

```sh
claude mcp remove learning-space
codex mcp remove learning-space
```

## Claude Code

```text
/plugin marketplace add Nordup/learning-space-plugins
/plugin install learning-space@learning-space
```

On Claude Code 2.1.275 or later, one command does both: `/plugin install learning-space --marketplace Nordup/learning-space-plugins`.

## Codex

```sh
codex plugin marketplace add Nordup/learning-space-plugins
```

Then open `/plugins` in Codex and install **Learning Space**.

## Cursor

Add the GitHub repository `Nordup/learning-space-plugins` as a plugin marketplace in Cursor. Then install **Learning Space** from it. Cursor reads `.cursor-plugin/marketplace.json`.

## Claude app

Use one of these:

- Click **Connect** in Learning Space and pick Claude.
- Download [`learning-space.mcpb`](claude-extensions/learning-space/dist/learning-space.mcpb) and double-click it.

## Updates

When a new version is out:

- Claude Code: `claude plugin marketplace update learning-space`, or turn on auto-update for the marketplace in `/plugin`.
- Codex: `codex plugin marketplace upgrade`.
- Claude app: download the new `.mcpb` and open it.

## Develop

Requires Node 20 or later and `zip`.

```sh
npm install
npm run build          # version check, validation, rebuild the .mcpb
```

The root `package.json` `version` is the only version source. To release:

1. Change `version` in `package.json` and add a `CHANGELOG.md` entry.
2. Run `npm run version:sync`. It writes the version into every manifest and rebuilds the `.mcpb`.
3. Run `npm run build` and commit everything, including `dist/learning-space.mcpb`.

CI runs `npm run build` and `npm run check-artifact`. The second command fails when the committed `.mcpb` differs from a fresh build.

| Client | Manifest | MCP wiring |
| --- | --- | --- |
| Claude Code | `plugins/learning-space/.claude-plugin/plugin.json` | `mcp.claude.json` (stdio relay) |
| Codex | `plugins/learning-space/.codex-plugin/plugin.json` | `mcp.codex.json` (HTTP) |
| Agent Plugins | `plugins/learning-space/plugin.json` | `mcp.json` (streamable HTTP) |
| Cursor | `plugins/learning-space/.cursor-plugin/plugin.json` | `mcp.cursor.json` (stdio relay) |
| Claude app | `claude-extensions/learning-space/manifest.json` | relay binary |

The stdio relay lists tools even when the app is closed. The HTTP wiring connects to `http://127.0.0.1:47821/mcp` and needs the app to be open.

## License

MIT
