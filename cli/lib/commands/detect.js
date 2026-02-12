const fs = require('fs');
const path = require('path');

const paths = require('../utils/paths');
const { writeJson } = require('../utils/io');
const { ok } = require('../utils/output');
const { nowIso } = require('../utils/time');

function hasFile(filename) {
  return fs.existsSync(path.join(process.cwd(), filename));
}

function detectProject() {
  const checks = [
    { file: 'pnpm-lock.yaml', packageManager: 'pnpm', command: 'pnpm test', language: 'javascript' },
    { file: 'yarn.lock', packageManager: 'yarn', command: 'yarn test', language: 'javascript' },
    { file: 'package-lock.json', packageManager: 'npm', command: 'npm test', language: 'javascript' },
    { file: 'pyproject.toml', packageManager: 'pip', command: 'pytest', language: 'python' },
    { file: 'requirements.txt', packageManager: 'pip', command: 'pytest', language: 'python' },
    { file: 'go.mod', packageManager: 'go', command: 'go test ./...', language: 'go' },
    { file: 'Cargo.toml', packageManager: 'cargo', command: 'cargo test', language: 'rust' },
  ];

  const verifyCommands = [];
  let packageManager = null;
  let language = null;

  for (const check of checks) {
    if (hasFile(check.file)) {
      verifyCommands.push(check.command);
      if (!packageManager) {
        packageManager = check.packageManager;
        language = check.language;
      }
    }
  }

  return {
    verifyCommands,
    packageManager,
    language,
  };
}

function detect(opts, save) {
  const data = detectProject();
  const payload = { status: 'ok', data, generatedAt: nowIso() };
  if (save) {
    writeJson(paths.detectPath(), payload);
  }
  const message = data.packageManager
    ? `Detected package manager: ${data.packageManager}`
    : 'No package manager detected';
  ok(data, opts, message);
}

module.exports = {
  detect,
};
