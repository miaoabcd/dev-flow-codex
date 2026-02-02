---
name: phase-3-implement
description: Implement tasks with TDD in the main session (Codex).
allowed-tools: [Read, Write, Bash]
user-invocable: true
---

# Phase 3: Implement (Codex)

## Goal

Implement all tasks using TDD, update task status, and keep verification evidence.

## Inputs

- `.dev-flow/tasks/`
- `.dev-flow/tasks/index.json`
- Current project codebase

## Workflow

### Step 0: Resolve CLI

```bash
DEV_FLOW="${DEV_FLOW_CLI:-dev-flow}"
if ! command -v dev-flow >/dev/null 2>&1; then
  if [ -x "../dev-flow/cli/bin/dev-flow.js" ]; then
    DEV_FLOW="node ../dev-flow/cli/bin/dev-flow.js"
  else
    echo "ERROR: dev-flow CLI not found. Install or set DEV_FLOW_CLI." >&2
    exit 1
  fi
fi
$DEV_FLOW --version
```

### Step 1: Preflight

```bash
PHASE=$($DEV_FLOW state get --json 2>/dev/null | jq -r '.data.phase // "none"')
TOTAL=$($DEV_FLOW tasks list --json 2>/dev/null | jq -r '.data.total // 0')
PENDING=$($DEV_FLOW tasks list --status pending --json 2>/dev/null | jq -r '.data.total // 0')
COMPLETED=$($DEV_FLOW tasks list --status completed --json 2>/dev/null | jq -r '.data.total // 0')
FAILED=$($DEV_FLOW tasks list --status failed --json 2>/dev/null | jq -r '.data.total // 0')
echo "Phase: $PHASE | Tasks: $COMPLETED/$TOTAL completed, $PENDING pending, $FAILED failed"
```

If phase is not `implement` or there are no tasks, tell the user and stop.

### Step 2: Resolve Test Command (Project Defaults)

Prefer explicit overrides, then CLI detection, then common lockfiles.

```bash
TEST_CMD="${DEV_FLOW_TEST_CMD:-}"
if [ -z "$TEST_CMD" ]; then
  TEST_CMD=$($DEV_FLOW detect --json | jq -r '.verifyCommands[]? | select(contains("test"))' | head -1)
fi
if [ -z "$TEST_CMD" ]; then
  if [ -f pnpm-lock.yaml ]; then
    TEST_CMD="pnpm test"
  elif [ -f yarn.lock ]; then
    TEST_CMD="yarn test"
  elif [ -f package-lock.json ]; then
    TEST_CMD="npm test"
  elif [ -f pyproject.toml ] || [ -f requirements.txt ]; then
    TEST_CMD="pytest"
  elif [ -f go.mod ]; then
    TEST_CMD="go test ./..."
  elif [ -f Cargo.toml ]; then
    TEST_CMD="cargo test"
  fi
fi
```

If `TEST_CMD` is still empty, ask the user to provide it or set `DEV_FLOW_TEST_CMD`.

### Step 3: Baseline Tests (Recommended)

Run baseline tests before changes. If they fail, ask whether to fix baseline
first or continue anyway.

```bash
if [ -n "$TEST_CMD" ]; then
  CI=true eval "$TEST_CMD" || true
fi
```

### Step 4: Task Loop

Process tasks sequentially until none remain:

```bash
while true; do
  TASK_JSON=$($DEV_FLOW tasks next --json)
  TASK_ID=$(echo "$TASK_JSON" | jq -r '.data.task.id // ""')
  [ -z "$TASK_ID" ] && break

  $DEV_FLOW tasks start "$TASK_ID"

  # Load task details
  $DEV_FLOW tasks get "$TASK_ID" --json

  # Implement in THIS session using TDD:
  # 1) RED: write a failing test for a single acceptance criterion
  # 2) GREEN: implement minimal code to pass
  # 3) REFACTOR: keep tests green and code clean
  # 4) Repeat for remaining criteria

  # Run targeted tests first, then full tests if needed
  # CI=true eval "$TEST_CMD"

  # On success
  # $DEV_FLOW tasks done "$TASK_ID"

  # On failure
  # $DEV_FLOW tasks fail "$TASK_ID" --reason "..."
  # Capture error output for healing (see next section)

done
```

### Step 5: Capture Evidence on Failure

If a task fails, save the error output to a file so Phase 4 can use it:

```bash
HEAL_DIR="${DEV_FLOW_HEAL_DIR:-.dev-flow/heal}"
mkdir -p "$HEAL_DIR"
# Replace <task_id> and <cmd> with the failing command
CI=true <cmd> 2>&1 | tee "$HEAL_DIR/<task_id>.log"
```

### Step 6: Advance State

If all tasks are completed or failed, move to delivery:

```bash
$DEV_FLOW state update --phase deliver
```

### Step 7: Return Result

```yaml
---PHASE RESULT---
phase: implement
status: complete
next_phase: deliver
---END PHASE RESULT---
```

## Implementation Checklist (per task)

- Read task acceptance criteria before coding
- Keep changes scoped to the task
- Add or update tests first (TDD)
- Run relevant tests with CI=true
- Update task status with the CLI

## Next Step (tell the user)

- If all tasks completed: "Phase 3 complete. Run $phase-5-deliver."
- If any task failed or needs investigation: "Run $phase-4-heal with task id and error output, then resume $phase-3-implement." 
