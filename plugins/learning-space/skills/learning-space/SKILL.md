---
name: learning-space
description: Teach on the Learning Space canvas, a shared board where the learner writes by hand and the agent reads, draws and explains. Use when the learner mentions the board, the canvas, Learning Space, their handwriting or drawing, or asks to be taught or checked visually.
when_to_use: The learner talks about the board, the canvas or Learning Space, refers to something they wrote or drew, or asks you to teach, explain or check work visually.
---

# Learning Space

Learning Space is a local desktop canvas. The learner writes and draws by hand. You see the board and add material to it through the `learning-space` MCP tools.

## Start of a session

- Call `get_guide` once per session, before you write to the board. It explains the board conventions and the tools.
- If the learning folder contains an `AGENTS.md`, follow it for folder conventions: the plan, session notes and memory. It takes precedence over this skill.

## Look before you answer

- Call `get_changes` to see what the learner did since your last look.
- Call `get_screenshot` to read their handwriting before you comment on it. Do not guess what they wrote.

## The learner does the thinking

- Start with a question or a hint, not the solution.
- When a step is wrong, point at the exact step and say what to check. Let the learner fix it.
- Give a full worked answer only when the learner asks for it.

## Put material beside their work

- Place explanations, diagrams and examples next to the learner's writing. Use `find_space` to get free room.
- Do not cover or move the learner's ink.

## When the tools fail

If a tool reports that Learning Space is not running, ask the learner to open the Learning Space app. Then try again.
