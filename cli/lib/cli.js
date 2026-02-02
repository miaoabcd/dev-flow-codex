const pkg = require('../../package.json');

const state = require('./commands/state');
const detect = require('./commands/detect');
const tasks = require('./commands/tasks');
const { fail, writeToFd } = require('./utils/output');

function toCamelCase(input) {
  return input.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function parseArgs(rawArgs) {
  const options = {};
  const positionals = [];
  const booleanFlags = new Set(['help', 'version', 'json', 'force', 'save']);
  let i = 0;
  while (i < rawArgs.length) {
    const token = rawArgs[i];
    if (token === '--') {
      positionals.push(...rawArgs.slice(i + 1));
      break;
    }
    if (token.startsWith('--')) {
      const name = token.slice(2);
      const eqIndex = name.indexOf('=');
      if (eqIndex !== -1) {
        const flagName = name.slice(0, eqIndex);
        const value = name.slice(eqIndex + 1);
        const key = toCamelCase(flagName);
        if (booleanFlags.has(flagName)) {
          options[key] = value === 'false' ? false : true;
          i += 1;
          continue;
        }
        if (flagName === 'criteria') {
          if (!Array.isArray(options.criteria)) {
            options.criteria = [];
          }
          options.criteria.push(value);
          i += 1;
          continue;
        }
        options[key] = value;
        i += 1;
        continue;
      }

      const key = toCamelCase(name);
      if (booleanFlags.has(name)) {
        options[key] = true;
        i += 1;
        continue;
      }
      const next = rawArgs[i + 1];
      if (!next || next.startsWith('--')) {
        options[key] = undefined;
        i += 1;
        continue;
      }
      if (key === 'criteria') {
        if (!Array.isArray(options.criteria)) {
          options.criteria = [];
        }
        options.criteria.push(next);
        i += 2;
        continue;
      }
      options[key] = next;
      i += 2;
      continue;
    }
    if (token === '-h') {
      options.help = true;
      i += 1;
      continue;
    }
    if (token === '-v') {
      options.version = true;
      i += 1;
      continue;
    }
    positionals.push(token);
    i += 1;
  }
  return { positionals, options };
}

function printRootHelp() {
  writeToFd(1, `Usage: dev-flow <command> [options]

Commands:
  state    Manage workflow state
  tasks    Manage tasks
  detect   Detect project information

Global options:
  --help, -h       Show help
  --version, -v    Show version
`);
}

function printStateHelp() {
  writeToFd(1, `Usage: dev-flow state <subcommand> [options]

Subcommands:
  get                   Get current state
  set --phase <phase>   Set current phase
  update --phase <phase> Update current phase
  archive --force       Archive current state

Options:
  --json                Output JSON
`);
}

function printTasksHelp() {
  writeToFd(1, `Usage: dev-flow tasks <subcommand> [options]

Subcommands:
  init --project-goal <text> --language <text>
  create --id <id> --module <module> --priority <number> --estimated-minutes <number> \
         --description <text> --criteria <text> [--criteria <text>...]
  list [--status <status>]
  next
  get <id>
  start <id>
  done <id>
  fail <id> --reason <text>

Options:
  --json                Output JSON
`);
}

function printDetectHelp() {
  writeToFd(1, `Usage: dev-flow detect [options]

Options:
  --save                Save detection results
  --json                Output JSON
`);
}

function printHelp(scope) {
  if (scope === 'state') {
    printStateHelp();
    return;
  }
  if (scope === 'tasks') {
    printTasksHelp();
    return;
  }
  if (scope === 'detect') {
    printDetectHelp();
    return;
  }
  printRootHelp();
}

function handleState(args, opts) {
  const subcommand = args[0];
  if (!subcommand) {
    fail('State requires a subcommand (get/set/update/archive).', opts, 'E_SUBCOMMAND_REQUIRED');
  }
  if (subcommand === 'get') {
    return state.getState(opts);
  }
  if (subcommand === 'set') {
    return state.setState(opts.phase, opts);
  }
  if (subcommand === 'update') {
    return state.updateState(opts.phase, opts);
  }
  if (subcommand === 'archive') {
    return state.archiveState(Boolean(opts.force), opts);
  }
  fail(`Unknown state subcommand: ${subcommand}`, opts, 'E_SUBCOMMAND_UNKNOWN');
}

function handleDetect(opts) {
  return detect.detect(opts, Boolean(opts.save));
}

function handleTasks(args, opts) {
  const subcommand = args[0];
  if (!subcommand) {
    fail('Tasks requires a subcommand.', opts, 'E_SUBCOMMAND_REQUIRED');
  }
  if (subcommand === 'init') {
    return tasks.initTasks(opts.projectGoal, opts.language, opts);
  }
  if (subcommand === 'create') {
    return tasks.createTask({
      id: opts.id,
      module: opts.module,
      priority: opts.priority,
      estimatedMinutes: opts.estimatedMinutes,
      description: opts.description,
      criteria: opts.criteria,
    }, opts);
  }
  if (subcommand === 'list') {
    return tasks.listTasks(opts.status, opts);
  }
  if (subcommand === 'next') {
    return tasks.nextTask(opts);
  }
  if (subcommand === 'get') {
    return tasks.getTask(args[1], opts);
  }
  if (subcommand === 'start') {
    return tasks.startTask(args[1], opts);
  }
  if (subcommand === 'done') {
    return tasks.doneTask(args[1], opts);
  }
  if (subcommand === 'fail') {
    return tasks.failTask(args[1], opts.reason, opts);
  }
  fail(`Unknown tasks subcommand: ${subcommand}`, opts, 'E_SUBCOMMAND_UNKNOWN');
}

function run(argv) {
  const rawArgs = argv.slice(2);
  const { positionals, options } = parseArgs(rawArgs);

  if (options.version) {
    writeToFd(1, `${pkg.version}\n`);
    return;
  }

  if (options.help || positionals.length === 0) {
    printHelp(positionals[0]);
    return;
  }

  const command = positionals[0];
  if (command === 'state') {
    return handleState(positionals.slice(1), options);
  }
  if (command === 'detect') {
    return handleDetect(options);
  }
  if (command === 'tasks') {
    return handleTasks(positionals.slice(1), options);
  }
  fail(`Unknown command: ${command}`, options, 'E_COMMAND_UNKNOWN');
}

module.exports = {
  run,
};
