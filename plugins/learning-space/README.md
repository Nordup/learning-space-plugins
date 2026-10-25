Learning Space is a shared canvas for learning on your Mac. You write and draw by hand. Your AI agent sees the board, draws diagrams, explains ideas next to your work and checks each step. There is no AI inside the app: the agent you already use connects to it over MCP.

**What the plugin adds**

- The `learning-space` MCP server, so the agent can read the board, take screenshots, write notes and diagrams, and draw ink.
- A `learning-space` skill that tells the agent to read the Learning Space brief (`get_brief`), where to find the board reference (`get_guide`, with scenes first: programs that draw and animate on the board), and what to do when the app is not running.

**Prerequisites**

- macOS.
- Learning Space opened once. No packaged app exists yet: run it from source (`github.com/Nordup/math-tutor`, branch `main`, folder `space/`, `npm install && npm run dev`). The first launch installs the `~/.learning-space/bin/learning-space` command that agents use to connect.
- Keep the app open while you work. If it is closed, the agent asks you to open it.

**Install**

- Claude Code: `/plugin install learning-space --marketplace Nordup/learning-space-plugins`
- Codex: `codex plugin marketplace add Nordup/learning-space-plugins`, then install **Learning Space** from `/plugins`.
- Other clients: see https://github.com/Nordup/learning-space-plugins.

**Example prompts**

- "Look at my board in Learning Space and check my last step."
- "Teach me how derivatives work on the board, one small step at a time."
- "Give me a hint for the problem I wrote, but not the answer."
- "Draw a diagram of the unit circle next to my notes."
