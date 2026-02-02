---
name: phase-5-deliver
description: Run quality gates, review, and deliver changes (Codex).
allowed-tools: [Read, Write, Bash]
user-invocable: true
---

# Phase 5: Deliver (Codex)

## Goal

Run quality gates, perform a short review, and optionally create a commit/PR.

## Inputs

- Completed tasks in `.dev-flow/tasks/`
- Project source changes

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

### Step 1: Summarize Task Status

```bash
$DEV_FLOW tasks list --json | jq -r '.data'
```

### Step 2: Run Quality Gates

```bash
VERIFY_CMDS=$($DEV_FLOW detect --json | jq -r '.verifyCommands[]')
for cmd in $VERIFY_CMDS; do
  echo "Running: $cmd"
  CI=true eval "$cmd" || exit 1
 done
```

### Step 3: Two-Stage Review

- Spec compliance: acceptance criteria met, tests present.
- Code quality: no debug logs, reasonable structure, no obvious regressions.

### Step 4: Commit and PR (Ask First)

Ask the user before committing or creating a PR.

```bash
# Commit (optional)
git add .
git commit -m "feat: implement dev-flow tasks"

# PR (optional)
# git push -u origin <branch>
# gh pr create --title "feat: implement dev-flow tasks" --body "Summary..."
```

### Step 5: Update State

```bash
$DEV_FLOW state update --phase complete
```

### Step 6: Return Result

```yaml
---PHASE RESULT---
phase: deliver
status: complete
next_phase: null
---END PHASE RESULT---
```

## Next Step (tell the user)

If all gates pass and delivery is complete: "Done. If you want changes, start a new run with $phase-1-clarify." 
If gates fail: "Fix the failures and rerun $phase-5-deliver." 
