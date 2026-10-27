# Changelog

## 0.1.1

- The skill says scenes are the one way to write: `write_scene` makes a draft, `preview_scene` shows it, and `play_scene` plays it for the learner. Needs a Learning Space app with these three tools (decision T16; `run_scene` and `scene_control` are gone).
- The skill names scenes (programs that draw and animate on the board, with living code items) first in the board reference. Needs a Learning Space app with the scene tools.
- The skill reads the brief with `get_brief` and names `get_guide` as the board reference, in topics (the app now has two tools, one job each: `get_brief` for the brief, `get_guide` for the reference). Needs a Learning Space app with `get_brief`.
- Board news before each prompt: the Claude Code and Codex plugins add a `UserPromptSubmit` hook (`hooks/claude.json`, `hooks/codex.json`) that runs `~/.learning-space/bin/learning-space news --client <agent>`. It adds one line to the prompt when the learner drew or erased strokes since this agent app's last look or last board news; each change is delivered once. It prints nothing when nothing is new or the app is closed. Needs a Learning Space app with the `news` command.

## 0.1.0

- First release.
- Plugins for Claude Code, Codex (also as an Agent Plugins manifest) and Cursor that add the `learning-space` MCP server.
- `learning-space` skill: read the guide, look before you answer, hints before solutions, material beside the learner's work.
- `learning-space.mcpb` bundle for the Claude app (macOS).
