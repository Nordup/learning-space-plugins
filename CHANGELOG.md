# Changelog

## Unreleased

- The skill reads the brief with `get_brief` (the app renamed `get_guide`; its board reference moved into the tool descriptions). Needs a Learning Space app with `get_brief`.
- Board news before each prompt: the Claude Code and Codex plugins add a `UserPromptSubmit` hook (`hooks/claude.json`, `hooks/codex.json`) that runs `~/.learning-space/bin/learning-space news --client <agent>`. It adds one line to the prompt when the learner drew or erased strokes that this agent app has not seen since its last look. It prints nothing when nothing is new or the app is closed. Needs a Learning Space app with the `news` command.

## 0.1.0

- First release.
- Plugins for Claude Code, Codex (also as an Agent Plugins manifest) and Cursor that add the `learning-space` MCP server.
- `learning-space` skill: read the guide, look before you answer, hints before solutions, material beside the learner's work.
- `learning-space.mcpb` bundle for the Claude app (macOS).
