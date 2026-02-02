#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: install-dev-flow-agent.sh <target_project_path> [options]

Options:
  --force           Overwrite existing AGENTS.md or .codex/skills
  --cli-path PATH   Set DEV_FLOW_CLI to a specific CLI path
  --write-env       Write DEV_FLOW_CLI into .env.dev-flow in target project
  --no-gitignore    Skip adding .dev-flow/ to .gitignore
  -h, --help        Show this help

Examples:
  ./scripts/install-dev-flow-agent.sh ../my-project
  ./scripts/install-dev-flow-agent.sh ../my-project --cli-path /abs/path/dev-flow-codex/cli/bin/dev-flow.js
USAGE
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

TARGET="$1"
shift

FORCE=0
CLI_PATH=""
WRITE_GITIGNORE=1
WRITE_ENV=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      FORCE=1
      ;;
    --cli-path)
      CLI_PATH="${2:-}"
      if [[ -z "$CLI_PATH" ]]; then
        echo "ERROR: --cli-path requires a value." >&2
        exit 1
      fi
      shift
      ;;
    --write-env)
      WRITE_ENV=1
      ;;
    --no-gitignore)
      WRITE_GITIGNORE=0
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
  shift
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ ! -d "$TARGET" ]]; then
  echo "ERROR: Target path does not exist: $TARGET" >&2
  exit 1
fi

TARGET_ROOT="$(cd "$TARGET" && pwd)"

if [[ -e "$TARGET_ROOT/AGENTS.md" && $FORCE -ne 1 ]]; then
  echo "ERROR: $TARGET_ROOT/AGENTS.md already exists. Use --force to overwrite." >&2
  exit 1
fi

if [[ -d "$TARGET_ROOT/.codex/skills" && $FORCE -ne 1 ]]; then
  echo "ERROR: $TARGET_ROOT/.codex/skills already exists. Use --force to overwrite." >&2
  exit 1
fi

mkdir -p "$TARGET_ROOT/.codex"
cp -R "$SRC_ROOT/AGENTS.md" "$TARGET_ROOT/AGENTS.md"
rm -rf "$TARGET_ROOT/.codex/skills"
cp -R "$SRC_ROOT/.codex/skills" "$TARGET_ROOT/.codex/"

if [[ $WRITE_GITIGNORE -eq 1 ]]; then
  if [[ -f "$TARGET_ROOT/.gitignore" ]]; then
    if ! grep -qx ".dev-flow/" "$TARGET_ROOT/.gitignore"; then
      echo ".dev-flow/" >> "$TARGET_ROOT/.gitignore"
    fi
  else
    echo ".dev-flow/" > "$TARGET_ROOT/.gitignore"
  fi
fi

if [[ -z "$CLI_PATH" ]]; then
  CLI_PATH="$SRC_ROOT/cli/bin/dev-flow.js"
fi

if [[ $WRITE_ENV -eq 1 ]]; then
  echo "DEV_FLOW_CLI=\"node $CLI_PATH\"" > "$TARGET_ROOT/.env.dev-flow"
fi

cat <<EOF
Installed dev-flow agent into: $TARGET_ROOT

Next steps:
  export DEV_FLOW_CLI="node $CLI_PATH"
  # Then in your project:
  # Use \$dev-flow: <your requirement>
EOF
