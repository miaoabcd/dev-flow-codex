const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const io = require('../cli/lib/utils/io');
const output = require('../cli/lib/utils/output');
const state = require('../cli/lib/commands/state');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dev-flow-internal-'));
}

test('io helpers handle missing files and invalid JSON', () => {
  const cwd = makeTempDir();
  const missing = path.join(cwd, 'missing.json');

  const missingResult = io.readJson(missing, { allowMissing: true });
  assert.equal(missingResult, null);

  const badPath = path.join(cwd, 'bad.json');
  fs.writeFileSync(badPath, '{');
  assert.throws(() => io.readJson(badPath));
});

test('io fileExists handles exceptions', () => {
  const original = fs.existsSync;
  try {
    fs.existsSync = () => { throw new Error('boom'); };
    const result = io.fileExists('/tmp/anything');
    assert.equal(result, false);
  } finally {
    fs.existsSync = original;
  }
});

test('output handles fallback writes and both ok/fail branches', () => {
  const originalWriteSync = fs.writeSync;
  const originalExit = process.exit;
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;
  let stdoutBuffer = '';
  let stderrBuffer = '';

  process.stdout.write = (chunk) => { stdoutBuffer += chunk; return true; };
  process.stderr.write = (chunk) => { stderrBuffer += chunk; return true; };

  try {
    fs.writeSync = () => { throw new Error('write failed'); };

    output.writeToFd(1, 'hello');
    output.writeToFd(2, 'oops');

    output.ok({ value: 1 });
    output.ok({ value: 1 }, {}, undefined);

    process.exit = () => { throw new Error('exit'); };

    assert.throws(() => output.fail('bad', { json: true }, 'E_TEST'));
    assert.throws(() => output.fail('bad', {}, 'E_TEST'));
    assert.throws(() => output.fail('bad'));
  } finally {
    fs.writeSync = originalWriteSync;
    process.exit = originalExit;
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }

  assert.ok(stdoutBuffer.length > 0);
  assert.ok(stderrBuffer.length > 0);
});

test('state archive throws non-EXDEV errors', () => {
  const cwd = makeTempDir();
  const statePath = path.join(cwd, '.dev-flow', 'state.json');
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ phase: 'clarify' }));

  const originalCwd = process.cwd();
  const originalRename = fs.renameSync;
  try {
    process.chdir(cwd);
    fs.renameSync = () => {
      const err = new Error('rename failed');
      err.code = 'EACCES';
      throw err;
    };

    assert.throws(() => state.archiveState(true, { json: true }));
  } finally {
    fs.renameSync = originalRename;
    process.chdir(originalCwd);
  }
});

test('state archive handles EXDEV by copying', () => {
  const cwd = makeTempDir();
  const statePath = path.join(cwd, '.dev-flow', 'state.json');
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ phase: 'clarify' }));

  const originalCwd = process.cwd();
  const originalRename = fs.renameSync;
  const originalCopy = fs.copyFileSync;
  const originalUnlink = fs.unlinkSync;
  let copied = false;
  let unlinked = false;

  try {
    process.chdir(cwd);
    fs.renameSync = () => {
      const err = new Error('rename failed');
      err.code = 'EXDEV';
      throw err;
    };
    fs.copyFileSync = () => { copied = true; };
    fs.unlinkSync = () => { unlinked = true; };

    state.archiveState(true, { json: true });
  } finally {
    fs.renameSync = originalRename;
    fs.copyFileSync = originalCopy;
    fs.unlinkSync = originalUnlink;
    process.chdir(originalCwd);
  }

  assert.equal(copied, true);
  assert.equal(unlinked, true);
});

test('state archive handles falsy errors in renameSync', () => {
  const cwd = makeTempDir();
  const statePath = path.join(cwd, '.dev-flow', 'state.json');
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ phase: 'clarify' }));

  const originalCwd = process.cwd();
  const originalRename = fs.renameSync;
  try {
    process.chdir(cwd);
    fs.renameSync = () => { throw null; };
    assert.throws(() => state.archiveState(true, { json: true }));
  } finally {
    fs.renameSync = originalRename;
    process.chdir(originalCwd);
  }
});
