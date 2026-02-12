---
name: dev-flow
description: Entry point for the dev-flow Codex workflow. Sets state and tells which phase to run next.
allowed-tools: [Read, Write, Bash]
user-invocable: true
---

# Dev-flow Entry (Codex)

## Goal

Provide a single entry point for the manual multi-skill flow. This skill does not
call other skills automatically; it prepares state and tells the user which phase
skill to run next.

## Modes (parse from user request)

- New run: any normal requirement text
- Resume: "resume" or "--mode=resume"
- Status: "status" or "--mode=status"
- Cancel: "cancel" or "--mode=cancel"

If no requirement is provided for a new run, ask the user to supply one.

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

### Step 1: Status (if requested)

```bash
STATE_JSON=$($DEV_FLOW state get --json 2>/dev/null || true)
TASKS_JSON=$($DEV_FLOW tasks list --json 2>/dev/null || true)
echo "$STATE_JSON"
echo "$TASKS_JSON"
```

Then tell the user which phase skill to run next based on state + task stats:

- If phase is `implement` and there are failed tasks, recommend `$phase-4-heal`
  and show the first failed task id.
- If phase is `implement` and pending tasks remain, recommend `$phase-3-implement`.
- If phase is `implement` and no pending tasks remain, recommend `$phase-5-deliver`.

### Step 2: Resume (if requested)

- Read current phase + task stats and recommend the next step:

```bash
STATE_JSON=$($DEV_FLOW state get --json 2>/dev/null || true)
PHASE=$(echo "$STATE_JSON" | jq -r '.data.phase // "none"')
PENDING=$($DEV_FLOW tasks list --status pending --json 2>/dev/null | jq -r '.data.total // 0')
FAILED=$($DEV_FLOW tasks list --status failed --json 2>/dev/null | jq -r '.data.total // 0')
FAILED_ID=$($DEV_FLOW tasks list --status failed --json 2>/dev/null | jq -r '.data.tasks[0].id // ""')
```

Use this decision table:

- clarify -> $phase-1-clarify
- breakdown -> $phase-2-breakdown
- implement:
  - if FAILED>0 -> $phase-4-heal (pass task id, suggest log)
  - else if PENDING>0 -> $phase-3-implement
  - else -> $phase-5-deliver
- deliver -> $phase-5-deliver
- complete -> suggest a new run

### Step 3: Cancel (if requested)

```bash
$DEV_FLOW state archive --force --json || true
```

Confirm cancellation and stop.

### Step 4: New Run (default)

- If existing state is present, ask the user whether to resume or archive.
- If starting fresh:

```bash
$DEV_FLOW state archive --force --json 2>/dev/null || true
$DEV_FLOW state set --phase clarify
$DEV_FLOW detect --save
```

Tell the user to run $phase-1-clarify and pass the original requirement text.

## Next Step (tell the user)

- New run: "Run $phase-1-clarify: <your requirement>"
- Resume: "Run the phase skill matching your current phase and task stats (see above)."
- Status: "Run the phase skill matching your current phase and task stats (see above)."
- Cancel: "Canceled. Start a new run with $dev-flow <requirement>."
