---
name: phase-1-clarify
description: Clarify requirements and produce a PRD for the dev-flow workflow (Codex).
allowed-tools: [Read, Write, Bash]
user-invocable: true
---

# Phase 1: Clarify Requirements (Codex)

## Goal

Turn the user's requirement into a clear PRD and initialize `.dev-flow/` state.

## Inputs

- User requirement (current conversation).

## Workflow

### Step 0: Resolve CLI

```bash
# Resolve dev-flow CLI
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

### Step 1: Initialize or Resume

- If a session already exists, ask the user whether to resume or archive it.
- For a new session, archive any existing state and set phase to `clarify`.

```bash
$DEV_FLOW state archive --force --json 2>/dev/null || true
$DEV_FLOW state set --phase clarify
$DEV_FLOW detect --save
```

### Step 2: Capture Context

Create a minimal context index for compression resilience.

```bash
mkdir -p .dev-flow/context
```

Write these files with what you can infer from the conversation:
- `.dev-flow/context/user-intent.md`
- `.dev-flow/context/files-referenced.md`
- `.dev-flow/context/decisions.md`

Use concise, verbatim quotes for the user's original intent where possible.

### Step 3: Ask Clarifying Questions

Ask only for missing information (stack, runtime, data store, auth, deployment, etc.).
Wait for the user's answers before proceeding.

### Step 4: Write PRD

Create `.dev-flow/prd.md` with a context index at the top. Keep it actionable and
scoped to testable requirements.

### Step 5: Advance State

```bash
$DEV_FLOW state update --phase breakdown
```

### Step 6: Return Result

```yaml
---PHASE RESULT---
phase: clarify
status: complete
prd: .dev-flow/prd.md
next_phase: breakdown
---END PHASE RESULT---
```

## Next Step (tell the user)

Say:
"Phase 1 complete. Run $phase-2-breakdown to generate the task plan." 

If the user wants changes, update the PRD and then repeat this phase.
