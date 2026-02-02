# Dev-flow (Codex) Skills

This repo provides a Codex-friendly version of the dev-flow workflow. It is a
multi-skill, manual handoff flow (no auto sub-agents). Run phases in order and
follow the next-step prompt at the end of each phase.

## Prerequisites

- `dev-flow` CLI available on PATH, or set `DEV_FLOW_CLI` to a command.
  - Example (local sibling repo):
    - `export DEV_FLOW_CLI="node ../dev-flow/cli/bin/dev-flow.js"`
- `jq` recommended for JSON parsing used by the CLI.
- `gh` optional for pull request creation in delivery.

## Recommended Flow (manual handoff)

Option A (entry skill):
1. `Use $dev-flow: <your requirement>`
2. Follow the prompt to run the correct phase skill

Option B (direct phases):
1. `Use $phase-1-clarify: <your requirement>`
2. `Use $phase-2-breakdown`
3. `Use $phase-3-implement`
4. If a task fails and needs investigation: `Use $phase-4-heal` with task id and error output
5. `Use $phase-5-deliver`

Each phase updates `.dev-flow/state.json` and writes artifacts in `.dev-flow/`.

## Notes

- The skills are in `.codex/skills/`.
- This setup avoids Claude-specific plugin hooks and sub-agent tools.
- If the CLI is missing, install globally (`npm i -g dev-flow`) or set
  `DEV_FLOW_CLI` as shown above.
