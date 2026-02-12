---
name: phase-4-heal
description: Investigate and fix a failed task with root-cause analysis (Codex).
allowed-tools: [Read, Write, Bash]
user-invocable: true
---

# Phase 4: Heal (Codex)

## Goal

Investigate a failure, identify the root cause, apply a single fix, and verify.

## Inputs (required)

- Task id (from user)
- Error output (stack trace, test logs, build logs)

If inputs are missing, ask the user to provide them before proceeding.

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

- If yes, load only the minimum required resources and use them during root-cause
  analysis.
- If no, continue directly.

### Step 1: Load Context

```bash
$DEV_FLOW tasks get "<task_id>" --json
$DEV_FLOW state get --json || true
```

### Step 2: Resolve Test Command (Project Defaults)

Prefer explicit overrides, then CLI detection, then common lockfiles.

```bash
TEST_CMD="${DEV_FLOW_TEST_CMD:-}"
if [ -z "$TEST_CMD" ]; then
  TEST_CMD=$($DEV_FLOW detect --json | jq -r '.data.verifyCommands[]? | select(contains("test"))' | head -1)
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

If `TEST_CMD` is still empty, ask the user to provide the exact failing command.

### Step 3: Reproduce

- If a prior log exists at `$HEAL_DIR/<task_id>.log`, read it before rerunning.
- Re-run the failing test/build with `CI=true`.
- Confirm the error is consistent.
- Save output for reference:

```bash
HEAL_DIR="${DEV_FLOW_HEAL_DIR:-.dev-flow/heal}"
mkdir -p "$HEAL_DIR"
CI=true <cmd> 2>&1 | tee "$HEAL_DIR/<task_id>.log"
```

### Step 4: Root Cause Investigation (mandatory)

Do not fix until you can explain the root cause.

- Identify the exact file/line in the error output
- Compare against a similar working pattern using `rg` (example: `rg -n \"<symbol>\" -S .`)
- Inspect recent changes: `git status`, `git diff`, `git log -1`
- Form a clear hypothesis (what is wrong, why it fails, what should be true)

Record your hypothesis in a short note:

```bash
cat <<'NOTE' > "$HEAL_DIR/<task_id>.md"
# Heal Note: <task_id>

## Symptom
<one sentence>

## Evidence
- Error output: <heal_dir>/<task_id>.log
- Suspected file/line: <file>:<line>

## Hypothesis
<root cause>

## Planned Fix
<single change>
NOTE
```

### Step 5: Apply One Fix

- Make a single change based on the hypothesis
- Re-run the failing command with `CI=true`
- If it still fails, update the hypothesis and try again (max 3 attempts)

### Step 6: Update Task Status

```bash
# If fixed
$DEV_FLOW tasks done "<task_id>"

# If not fixed after 3 attempts
$DEV_FLOW tasks fail "<task_id>" --reason "healing failed"
```

### Step 7: Return Result

```yaml
---HEALING RESULT---
task_id: <task_id>
status: success | failed
verification_passed: true | false
attempts: <N>
hypothesis: <root cause>
notes: <brief summary>
---END HEALING RESULT---
```

## Next Step (tell the user)

- If healed: "Run $phase-3-implement to continue remaining tasks."
- If not healed: "Decide whether to revise the task list or proceed to $phase-5-deliver with failures noted." 
