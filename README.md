# Dev-flow Codex Agent

A Codex-friendly, manual handoff workflow that guides requirements clarification,
planning, implementation, recovery, and delivery using a set of local skills.
This repo is designed to be dropped into a project and used by Codex to run a
repeatable, multi-phase development flow.

## What This Agent Does

The agent provides five explicit phases plus an entry orchestrator:

- **dev-flow (entry)**: Detects state and recommends the next phase.
- **phase-1-clarify**: Turns a request into a PRD and initializes state.
- **phase-2-breakdown**: Breaks the PRD into small, testable tasks.
- **phase-3-implement**: Implements tasks (optionally with TDD).
- **phase-4-heal**: Investigates and fixes failed tasks.
- **phase-5-deliver**: Runs quality gates and prepares delivery.

All phase artifacts are stored in `.dev-flow/` inside the target project.

## Prerequisites

- `dev-flow` CLI available on PATH **or** set `DEV_FLOW_CLI`.
- `jq` recommended (used by phase logic for JSON parsing).
- `gh` optional (for PR creation in delivery).

## Installation (CLI)

Global install:

```bash
npm i -g dev-flow
```

Local install without dependencies (run directly):

```bash
node cli/bin/dev-flow.js --help
```

Local sibling repo (override CLI path):

```bash
export DEV_FLOW_CLI="node ../dev-flow/cli/bin/dev-flow.js"
```

## How To Use In A Project

1. **Copy this repo into your project** (or merge the contents) so the following
   paths exist inside your project:
   - `AGENTS.md`
   - `.codex/skills/`

2. **Ensure the CLI is available**:
   - Install `dev-flow` globally, or
   - Set `DEV_FLOW_CLI` to a local CLI path (example above).

3. **Make sure `.dev-flow/` is gitignored** (phase-2 will add it automatically
   if using the phase flow).

4. **Use the agent from Codex** by invoking the entry skill or a phase directly.

## Recommended Usage Flow

### Option A: Entry Skill

```text
Use $dev-flow: <your requirement>
```

The entry skill checks state and tells you which phase to run next.

### Option B: Direct Phases

```text
Use $phase-1-clarify: <your requirement>
Use $phase-2-breakdown
Use $phase-3-implement
# if a task fails:
Use $phase-4-heal: <task-id> <error-output>
Use $phase-5-deliver
```

## Where State Lives

All generated artifacts live under `.dev-flow/`:

- `.dev-flow/state.json`: current phase and run metadata
- `.dev-flow/prd.md`: product requirements for the current request
- `.dev-flow/tasks/`: task definitions and status
- `.dev-flow/context/`: short context files for compression resilience
- `.dev-flow/heal/`: investigation logs for failed tasks

## Skill Reference

Skill files live in `.codex/skills/` and can be read by Codex when needed.

- `dev-orchestrator/SKILL.md` (entry): determines next step
- `phase-1-clarify/SKILL.md`: PRD creation and context capture
- `phase-2-breakdown/SKILL.md`: task creation and approval
- `phase-3-implement/SKILL.md`: implementation loop
- `phase-4-heal/SKILL.md`: root-cause analysis and fix
- `phase-5-deliver/SKILL.md`: quality gates and delivery output

## Typical Session Example

1) Start a new run:

```text
Use $dev-flow: Add an “Export CSV” button to the Orders page with the current filters applied.
```

2) Codex will respond with the next step, usually:

```text
Use $phase-1-clarify: Add an “Export CSV” button to the Orders page with the current filters applied.
```

3) After clarification, run the breakdown phase:

```text
Use $phase-2-breakdown
```

4) Approve tasks, then implement:

```text
Use $phase-3-implement
```

5) If something fails, heal it:

```text
Use $phase-4-heal: web.orders.export-csv "Error output here..."
```

6) Deliver:

```text
Use $phase-5-deliver
```

## Troubleshooting

- **CLI not found**: install `dev-flow` or set `DEV_FLOW_CLI`.
- **State stuck**: run the entry skill with `resume` or `status` to see what the
  next phase should be.
- **Need a fresh run**: run the entry skill with `cancel` to archive current
  state and start over.

## Testing (TDD)

- Run `npm test` (uses Node's built-in `node --test`).
- Follow TDD: write or update tests first, then implement code changes.

## Notes

- The workflow is intentionally manual: Codex will not auto-run other phases.
- Keep `.dev-flow/` out of version control unless you want to archive a run.
- If you add or customize skills, update this README accordingly.
