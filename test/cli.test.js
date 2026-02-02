const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const cliPath = path.resolve(__dirname, '..', 'cli', 'bin', 'dev-flow.js');

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
  });
}

function parseJson(result) {
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout, 'expected JSON output on stdout');
  return JSON.parse(result.stdout);
}

function parseJsonError(result) {
  assert.notEqual(result.status, 0, 'expected non-zero exit code');
  assert.ok(result.stdout, 'expected JSON error on stdout');
  return JSON.parse(result.stdout);
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dev-flow-test-'));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('root help/version flags work', () => {
  const cwd = makeTempDir();

  const helpResult = runCli(['--help'], cwd);
  assert.equal(helpResult.status, 0, helpResult.stderr);
  assert.ok(helpResult.stdout.includes('Usage'), 'help output should include Usage');

  const helpShort = runCli(['-h'], cwd);
  assert.equal(helpShort.status, 0, helpShort.stderr);
  assert.ok(helpShort.stdout.includes('Usage'));

  const noArgs = runCli([], cwd);
  assert.equal(noArgs.status, 0, noArgs.stderr);
  assert.ok(noArgs.stdout.includes('Usage'));

  const versionResult = runCli(['--version'], cwd);
  assert.equal(versionResult.status, 0, versionResult.stderr);
  assert.match(versionResult.stdout.trim(), /^\d+\.\d+\.\d+$/);

  const versionShort = runCli(['-v'], cwd);
  assert.equal(versionShort.status, 0, versionShort.stderr);
  assert.match(versionShort.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test('subcommand help outputs are available', () => {
  const cwd = makeTempDir();

  const stateHelp = runCli(['state', '--help'], cwd);
  assert.equal(stateHelp.status, 0, stateHelp.stderr);
  assert.ok(stateHelp.stdout.includes('dev-flow state'));

  const tasksHelp = runCli(['tasks', '--help'], cwd);
  assert.equal(tasksHelp.status, 0, tasksHelp.stderr);
  assert.ok(tasksHelp.stdout.includes('dev-flow tasks'));

  const detectHelp = runCli(['detect', '--help'], cwd);
  assert.equal(detectHelp.status, 0, detectHelp.stderr);
  assert.ok(detectHelp.stdout.includes('dev-flow detect'));
});

test('parseArgs handles "--" and boolean flags with equals', () => {
  const cwd = makeTempDir();
  fs.writeFileSync(path.join(cwd, 'package-lock.json'), '{}');

  const doubleDash = runCli(['--', 'detect'], cwd);
  assert.equal(doubleDash.status, 0, doubleDash.stderr);
  assert.match(doubleDash.stdout, /Detected|No package manager/);

  const saveFalse = runCli(['detect', '--save=false', '--json'], cwd);
  const saveFalseJson = parseJson(saveFalse);
  assert.equal(saveFalseJson.data.packageManager, 'npm');
  assert.equal(fs.existsSync(path.join(cwd, '.dev-flow', 'detect.json')), false);

  const saveTrue = runCli(['detect', '--save=true', '--json'], cwd);
  parseJson(saveTrue);
  assert.equal(fs.existsSync(path.join(cwd, '.dev-flow', 'detect.json')), true);
});

test('state commands cover missing inputs and archive branches', () => {
  const cwd = makeTempDir();

  const getMissing = runCli(['state', 'get', '--json'], cwd);
  const missingJson = parseJson(getMissing);
  assert.deepEqual(missingJson.data, {});

  const archiveNoState = runCli(['state', 'archive', '--force', '--json'], cwd);
  const archiveNoStateJson = parseJson(archiveNoState);
  assert.equal(archiveNoStateJson.data.archived, false);

  const updateWithoutState = runCli(['state', 'update', '--phase=clarify', '--json'], cwd);
  const updateWithoutStateJson = parseJson(updateWithoutState);
  assert.equal(updateWithoutStateJson.data.phase, 'clarify');

  const archiveMissingForce = parseJsonError(runCli(['state', 'archive', '--json'], cwd));
  assert.equal(archiveMissingForce.code, 'E_FORCE_REQUIRED');

  const updateMissing = parseJsonError(runCli(['state', 'update', '--json'], cwd));
  assert.equal(updateMissing.code, 'E_PHASE_REQUIRED');

  const setMissingValue = parseJsonError(runCli(['state', 'set', '--phase', '--json'], cwd));
  assert.equal(setMissingValue.code, 'E_PHASE_REQUIRED');
});

test('state lifecycle commands return JSON and update files', () => {
  const cwd = makeTempDir();

  const setResult = runCli(['state', 'set', '--phase=clarify', '--json'], cwd);
  const setJson = parseJson(setResult);
  assert.equal(setJson.status, 'ok');
  assert.equal(setJson.data.phase, 'clarify');

  const statePath = path.join(cwd, '.dev-flow', 'state.json');
  const state = readJson(statePath);
  assert.equal(state.phase, 'clarify');

  const getResult = runCli(['state', 'get', '--json'], cwd);
  const getJson = parseJson(getResult);
  assert.equal(getJson.data.phase, 'clarify');

  const updateResult = runCli(['state', 'update', '--phase=deliver', '--json'], cwd);
  const updateJson = parseJson(updateResult);
  assert.equal(updateJson.data.phase, 'deliver');

  const archiveResult = runCli(['state', 'archive', '--force', '--json'], cwd);
  const archiveJson = parseJson(archiveResult);
  assert.equal(archiveJson.data.archived, true);
  assert.ok(archiveJson.data.archivePath);
  assert.equal(fs.existsSync(statePath), false);
  assert.equal(fs.existsSync(archiveJson.data.archivePath), true);
});

test('detect command reports package manager and saves output', () => {
  const cwd = makeTempDir();
  fs.writeFileSync(path.join(cwd, 'package-lock.json'), '{}');
  fs.writeFileSync(path.join(cwd, 'yarn.lock'), '');

  const detectResult = runCli(['detect', '--json'], cwd);
  const detectJson = parseJson(detectResult);
  assert.equal(detectJson.data.packageManager, 'yarn');
  assert.equal(detectJson.data.language, 'javascript');
  assert.ok(detectJson.data.verifyCommands.includes('npm test'));
  assert.ok(detectJson.data.verifyCommands.includes('yarn test'));

  const saveResult = runCli(['detect', '--save', '--json'], cwd);
  parseJson(saveResult);
  const detectPath = path.join(cwd, '.dev-flow', 'detect.json');
  assert.equal(fs.existsSync(detectPath), true);
  const saved = readJson(detectPath);
  assert.equal(saved.status, 'ok');
});

test('detect without lockfiles returns empty info', () => {
  const cwd = makeTempDir();

  const result = runCli(['detect'], cwd);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes('No package manager'));
});

test('tasks lifecycle commands cover list/next/get/start/done/fail', () => {
  const cwd = makeTempDir();

  const initResult = runCli([
    'tasks',
    'init',
    '--project-goal', 'Test goal',
    '--language', 'nodejs',
    '--json',
  ], cwd);
  parseJson(initResult);

  const createResultA = runCli([
    'tasks',
    'create',
    '--id', 'cli.sample.task-a',
    '--module', 'cli',
    '--priority', '2',
    '--estimated-minutes', '5',
    '--description', 'Sample A',
    '--criteria', 'First',
    '--json',
  ], cwd);
  parseJson(createResultA);

  const createResultB = runCli([
    'tasks',
    'create',
    '--id', 'cli.sample.task-b',
    '--module', 'cli',
    '--priority', '1',
    '--estimated-minutes', '5',
    '--description', 'Sample B',
    '--criteria=Second',
    '--json',
  ], cwd);
  parseJson(createResultB);

  const createResultC = runCli([
    'tasks',
    'create',
    '--id', 'cli.sample.task-c',
    '--module', 'cli',
    '--priority', '1',
    '--estimated-minutes', '5',
    '--description', 'Sample C',
    '--criteria', 'Third',
    '--json',
  ], cwd);
  parseJson(createResultC);

  const listAll = parseJson(runCli(['tasks', 'list', '--json'], cwd));
  assert.equal(listAll.data.total, 3);

  const listPending = parseJson(runCli(['tasks', 'list', '--status', 'pending', '--json'], cwd));
  assert.equal(listPending.data.total, 3);

  const nextTask = parseJson(runCli(['tasks', 'next', '--json'], cwd));
  assert.equal(nextTask.data.task.id, 'cli.sample.task-b');

  parseJson(runCli(['tasks', 'start', 'cli.sample.task-b', '--json'], cwd));
  parseJson(runCli(['tasks', 'done', 'cli.sample.task-b', '--json'], cwd));
  parseJson(runCli(['tasks', 'done', 'cli.sample.task-c', '--json'], cwd));
  parseJson(runCli(['tasks', 'fail', 'cli.sample.task-a', '--reason', 'Failed', '--json'], cwd));

  const listFailed = parseJson(runCli(['tasks', 'list', '--status', 'failed', '--json'], cwd));
  assert.equal(listFailed.data.total, 1);

  const getTask = parseJson(runCli(['tasks', 'get', 'cli.sample.task-a', '--json'], cwd));
  assert.equal(getTask.data.reason, 'Failed');

  const nextEmpty = parseJson(runCli(['tasks', 'next', '--json'], cwd));
  assert.equal(nextEmpty.data.task, null);
});

test('tasks edge cases and errors return JSON error payloads', () => {
  const cwd = makeTempDir();

  const listWithoutInit = parseJsonError(runCli(['tasks', 'list', '--json'], cwd));
  assert.equal(listWithoutInit.code, 'E_TASKS_INDEX_MISSING');

  const initMissing = parseJsonError(runCli(['tasks', 'init', '--project-goal', 'Goal', '--json'], cwd));
  assert.equal(initMissing.code, 'E_TASKS_INIT_REQUIRED');

  const initMissingGoal = parseJsonError(runCli(['tasks', 'init', '--language', 'nodejs', '--json'], cwd));
  assert.equal(initMissingGoal.code, 'E_TASKS_INIT_REQUIRED');

  const initOk = runCli(['tasks', 'init', '--project-goal', 'Goal', '--language', 'nodejs', '--json'], cwd);
  parseJson(initOk);

  const initAgain = parseJsonError(runCli(['tasks', 'init', '--project-goal', 'Goal', '--language', 'nodejs', '--json'], cwd));
  assert.equal(initAgain.code, 'E_TASKS_INIT_EXISTS');

  const createMissingCriteria = parseJsonError(runCli([
    'tasks',
    'create',
    '--id', 'cli.task',
    '--module', 'cli',
    '--priority', '1',
    '--estimated-minutes', '5',
    '--description', 'Missing criteria',
    '--json',
  ], cwd));
  assert.equal(createMissingCriteria.code, 'E_CRITERIA_REQUIRED');

  const createInvalidNumber = parseJsonError(runCli([
    'tasks',
    'create',
    '--id', 'cli.task',
    '--module', 'cli',
    '--priority', 'nope',
    '--estimated-minutes', '5',
    '--description', 'Bad priority',
    '--criteria', 'One',
    '--json',
  ], cwd));
  assert.equal(createInvalidNumber.code, 'E_INVALID_NUMBER');

  const createInvalidMinutes = parseJsonError(runCli([
    'tasks',
    'create',
    '--id', 'cli.task',
    '--module', 'cli',
    '--priority', '1',
    '--estimated-minutes', 'nope',
    '--description', 'Bad minutes',
    '--criteria', 'One',
    '--json',
  ], cwd));
  assert.equal(createInvalidMinutes.code, 'E_INVALID_NUMBER');

  const createMissingModule = parseJsonError(runCli([
    'tasks',
    'create',
    '--id', 'cli.task',
    '--priority', '1',
    '--estimated-minutes', '5',
    '--description', 'Missing module',
    '--criteria', 'One',
    '--json',
  ], cwd));
  assert.equal(createMissingModule.code, 'E_TASKS_CREATE_REQUIRED');

  const createMissingId = parseJsonError(runCli([
    'tasks',
    'create',
    '--module', 'cli',
    '--priority', '1',
    '--estimated-minutes', '5',
    '--description', 'Missing id',
    '--criteria', 'One',
    '--json',
  ], cwd));
  assert.equal(createMissingId.code, 'E_TASKS_CREATE_REQUIRED');

  parseJson(runCli([
    'tasks',
    'create',
    '--id', 'cli.task',
    '--module', 'cli',
    '--priority', '1',
    '--estimated-minutes', '5',
    '--criteria', 'One',
    '--json',
  ], cwd));

  const createdTask = readJson(path.join(cwd, '.dev-flow', 'tasks', 'cli.task.json'));
  assert.equal(createdTask.description, '');

  const createDuplicate = parseJsonError(runCli([
    'tasks',
    'create',
    '--id', 'cli.task',
    '--module', 'cli',
    '--priority', '1',
    '--estimated-minutes', '5',
    '--description', 'Dup again',
    '--criteria', 'One',
    '--json',
  ], cwd));
  assert.equal(createDuplicate.code, 'E_TASK_EXISTS');

  const listInvalid = parseJsonError(runCli(['tasks', 'list', '--status', 'bogus', '--json'], cwd));
  assert.equal(listInvalid.code, 'E_STATUS_INVALID');

  const getMissingId = parseJsonError(runCli(['tasks', 'get', '--json'], cwd));
  assert.equal(getMissingId.code, 'E_TASK_ID_REQUIRED');

  const getMissing = parseJsonError(runCli(['tasks', 'get', 'missing.task', '--json'], cwd));
  assert.equal(getMissing.code, 'E_TASK_NOT_FOUND');

  const startMissingId = parseJsonError(runCli(['tasks', 'start', '--json'], cwd));
  assert.equal(startMissingId.code, 'E_TASK_ID_REQUIRED');

  const startUnknown = parseJsonError(runCli(['tasks', 'start', 'missing.task', '--json'], cwd));
  assert.equal(startUnknown.code, 'E_TASK_NOT_FOUND');

  const failMissingReason = parseJsonError(runCli(['tasks', 'fail', 'cli.task', '--json'], cwd));
  assert.equal(failMissingReason.code, 'E_REASON_REQUIRED');

  const filePath = path.join(cwd, '.dev-flow', 'tasks', 'cli.task.json');
  fs.unlinkSync(filePath);
  parseJson(runCli(['tasks', 'done', 'cli.task', '--json'], cwd));
  assert.equal(fs.existsSync(filePath), true);
});

test('tasks list handles malformed index tasks array', () => {
  const cwd = makeTempDir();
  const indexDir = path.join(cwd, '.dev-flow', 'tasks');
  fs.mkdirSync(indexDir, { recursive: true });
  fs.writeFileSync(path.join(indexDir, 'index.json'), JSON.stringify({
    projectGoal: 'Goal',
    language: 'nodejs',
    tasks: null,
  }));

  const listResult = parseJson(runCli(['tasks', 'list', '--json'], cwd));
  assert.equal(listResult.data.total, 0);
});

test('unknown commands and subcommands return JSON errors', () => {
  const cwd = makeTempDir();

  const unknown = parseJsonError(runCli(['unknown', '--json'], cwd));
  assert.equal(unknown.code, 'E_COMMAND_UNKNOWN');

  const stateUnknown = parseJsonError(runCli(['state', 'bogus', '--json'], cwd));
  assert.equal(stateUnknown.code, 'E_SUBCOMMAND_UNKNOWN');

  const tasksUnknown = parseJsonError(runCli(['tasks', 'bogus', '--json'], cwd));
  assert.equal(tasksUnknown.code, 'E_SUBCOMMAND_UNKNOWN');

  const stateMissingSub = parseJsonError(runCli(['state', '--json'], cwd));
  assert.equal(stateMissingSub.code, 'E_SUBCOMMAND_REQUIRED');

  const tasksMissingSub = parseJsonError(runCli(['tasks', '--json'], cwd));
  assert.equal(tasksMissingSub.code, 'E_SUBCOMMAND_REQUIRED');
});

test('invalid JSON triggers top-level error handler', () => {
  const cwd = makeTempDir();
  const tasksDir = path.join(cwd, '.dev-flow', 'tasks');
  fs.mkdirSync(tasksDir, { recursive: true });
  fs.writeFileSync(path.join(tasksDir, 'index.json'), '{');

  const result = runCli(['tasks', 'list', '--json'], cwd);
  assert.notEqual(result.status, 0);
});

test('top-level error handler handles non-Error throws', () => {
  const script = `
    const path = require('path');
    const cliModulePath = path.resolve(process.cwd(), 'cli', 'lib', 'cli.js');
    require.cache[cliModulePath] = {
      id: cliModulePath,
      filename: cliModulePath,
      loaded: true,
      exports: { run: () => { throw { code: 'TEST' }; } },
    };
    require('./cli/bin/dev-flow.js');
  `;
  const result = spawnSync(process.execPath, ['-e', script], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(result.status, 0);
});
