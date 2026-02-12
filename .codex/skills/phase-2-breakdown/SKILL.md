---
name: phase-2-breakdown
description: Break down the PRD into atomic tasks and get approval (Codex).
allowed-tools: [Read, Write, Bash]
user-invocable: true
---

# Phase 2: Task Breakdown (Codex)

## Goal

Break the PRD into atomic, testable tasks (<30 minutes each), store them via the
CLI, and get user approval before implementation.

## Inputs

- `.dev-flow/prd.md`

## Workflow

### Step 0: Resolve CLI

```bash
DEV_FLOW="${DEV_FLOW_CLI:-}"
if [ -n "$DEV_FLOW" ]; then
  :
elif command -v dev-flow >/dev/null 2>&1; then
  DEV_FLOW="dev-flow"
elif [ -x "../dev-flow/cli/bin/dev-flow.js" ]; then
  DEV_FLOW="node ../dev-flow/cli/bin/dev-flow.js"
else
  echo "ERROR: dev-flow CLI not found. Install or set DEV_FLOW_CLI." >&2
  exit 1
fi
$DEV_FLOW --version
```

### Step 0.5: Ask for External MCP Context (mandatory)

Before proceeding, ask the user:
"Do you need any external MCP resources for this phase (for example product docs,
API references, or specs)? If yes, provide server name + resource URI (or doc path)."

- If yes, load only the minimum required resources and include any hard
  constraints while breaking down tasks.
- If no, continue directly.

### Step 1: Verify Prereqs

```bash
# Ensure .dev-flow is gitignored
if ! git check-ignore -q .dev-flow 2>/dev/null; then
  echo ".dev-flow/" >> .gitignore
  git add .gitignore || true
fi

# Verify PRD exists
[ -f ".dev-flow/prd.md" ] || { echo "ERROR: PRD not found" >&2; exit 1; }
```

### Step 2: Read PRD and Extract Stories

From `.dev-flow/prd.md`, identify epics, user stories, and acceptance criteria.
Group tasks by module, keep them small and testable.

### Step 3: Create Tasks Sequentially

Create tasks one at a time for context resilience.

```bash
$DEV_FLOW tasks init --project-goal "..." --language "..."

$DEV_FLOW tasks create \
  --id "{module}.{feature}.{aspect}" \
  --module "{module}" \
  --priority {N} \
  --estimated-minutes {M} \
  --description "..." \
  --criteria "Criterion 1" \
  --criteria "Criterion 2" \
  --json
```

### Step 4: Show Plan and Ask Approval

Present a concise task plan summary and ask the user:
"Do you approve this task breakdown? (yes / modify / cancel)"

- If **yes**: move to implement.
- If **modify**: tell the user to edit `.dev-flow/tasks/` and rerun this phase.
- If **cancel**: archive state and stop.

```bash
# On approval
$DEV_FLOW state update --phase implement
```

### Step 5: Return Result

```yaml
---PHASE RESULT---
phase: breakdown
status: complete
tasks_dir: .dev-flow/tasks
next_phase: implement
---END PHASE RESULT---
```

## Next Step (tell the user)

Say:
"Task plan approved. Run $phase-3-implement to start implementation." 

If the user wants edits, say:
"Edit tasks in .dev-flow/tasks and rerun $phase-2-breakdown." 
