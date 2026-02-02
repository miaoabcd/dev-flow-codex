const path = require('path');

const { tasksDir, tasksIndexPath } = require('../utils/paths');
const { ensureDir, fileExists, readJson, writeJson } = require('../utils/io');
const { ok, fail } = require('../utils/output');
const { nowIso } = require('../utils/time');

function loadIndex(opts) {
  const index = readJson(tasksIndexPath, { allowMissing: true });
  if (!index) {
    fail('Tasks not initialized. Run "dev-flow tasks init" first.', opts, 'E_TASKS_INDEX_MISSING');
  }
  if (!Array.isArray(index.tasks)) {
    index.tasks = [];
  }
  return index;
}

function saveIndex(index) {
  writeJson(tasksIndexPath, index);
}

function taskFilePath(taskId) {
  return path.join(tasksDir, `${taskId}.json`);
}

function readTaskFile(taskId, opts) {
  const filePath = taskFilePath(taskId);
  const task = readJson(filePath, { allowMissing: true });
  if (!task) {
    fail(`Task not found: ${taskId}`, opts, 'E_TASK_NOT_FOUND');
  }
  return task;
}

function parseNumber(value, label, opts) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    fail(`${label} must be a number.`, opts, 'E_INVALID_NUMBER');
  }
  return num;
}

function initTasks(projectGoal, language, opts) {
  if (!projectGoal || !language) {
    fail('Tasks init requires --project-goal and --language.', opts, 'E_TASKS_INIT_REQUIRED');
  }
  if (fileExists(tasksIndexPath)) {
    fail('Tasks already initialized.', opts, 'E_TASKS_INIT_EXISTS');
  }
  ensureDir(tasksDir);
  const index = {
    projectGoal,
    language,
    tasks: [],
  };
  saveIndex(index);
  ok(index, opts, 'Tasks initialized');
}

function createTask(options, opts) {
  const index = loadIndex(opts);
  const taskId = options.id;
  const moduleName = options.module;
  if (!taskId || !moduleName) {
    fail('Task create requires --id and --module.', opts, 'E_TASKS_CREATE_REQUIRED');
  }
  if (index.tasks.some((task) => task.id === taskId)) {
    fail(`Task already exists: ${taskId}`, opts, 'E_TASK_EXISTS');
  }
  const priority = parseNumber(options.priority, 'priority', opts);
  const estimatedMinutes = parseNumber(options.estimatedMinutes, 'estimated-minutes', opts);
  const description = options.description || '';
  const criteria = Array.isArray(options.criteria) ? options.criteria : [];
  if (criteria.length === 0) {
    fail('Task create requires at least one --criteria.', opts, 'E_CRITERIA_REQUIRED');
  }

  const now = nowIso();
  const record = {
    id: taskId,
    module: moduleName,
    priority,
    estimatedMinutes,
    status: 'pending',
    description,
    criteria,
    createdAt: now,
    updatedAt: now,
  };

  index.tasks.push(record);
  saveIndex(index);

  const taskFile = {
    ...record,
    reason: null,
  };
  writeJson(taskFilePath(taskId), taskFile);

  ok(record, opts, `Created task ${taskId}`);
}

function listTasks(status, opts) {
  const index = loadIndex(opts);
  let tasks = index.tasks.slice();
  if (status) {
    const valid = ['pending', 'in_progress', 'completed', 'failed'];
    if (!valid.includes(status)) {
      fail(`Invalid status filter: ${status}`, opts, 'E_STATUS_INVALID');
    }
    tasks = tasks.filter((task) => task.status === status);
  }
  const data = {
    total: tasks.length,
    tasks,
    projectGoal: index.projectGoal,
    language: index.language,
  };
  ok(data, opts, `Tasks: ${tasks.length}`);
}

function getTask(taskId, opts) {
  if (!taskId) {
    fail('Task get requires <id>.', opts, 'E_TASK_ID_REQUIRED');
  }
  const task = readTaskFile(taskId, opts);
  ok(task, opts, `Task ${taskId}`);
}

function nextTask(opts) {
  const index = loadIndex(opts);
  const pending = index.tasks.filter((task) => task.status === 'pending');
  pending.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.id.localeCompare(b.id);
  });
  const task = pending[0] || null;
  ok({ task }, opts, task ? `Next task: ${task.id}` : 'No pending tasks');
}

function updateTaskStatus(taskId, status, reason, opts) {
  if (!taskId) {
    fail('Task id is required.', opts, 'E_TASK_ID_REQUIRED');
  }
  const index = loadIndex(opts);
  const idx = index.tasks.findIndex((task) => task.id === taskId);
  if (idx < 0) {
    fail(`Task not found: ${taskId}`, opts, 'E_TASK_NOT_FOUND');
  }
  const now = nowIso();
  const updatedIndexTask = {
    ...index.tasks[idx],
    status,
    updatedAt: now,
  };
  index.tasks[idx] = updatedIndexTask;
  saveIndex(index);

  const filePath = taskFilePath(taskId);
  const existing = readJson(filePath, { allowMissing: true }) || { ...updatedIndexTask, reason: null };
  const updatedTask = {
    ...existing,
    status,
    updatedAt: now,
    reason: status === 'failed' ? reason : null,
  };
  writeJson(filePath, updatedTask);
  ok(updatedTask, opts, `Task ${taskId} -> ${status}`);
}

function startTask(taskId, opts) {
  updateTaskStatus(taskId, 'in_progress', null, opts);
}

function doneTask(taskId, opts) {
  updateTaskStatus(taskId, 'completed', null, opts);
}

function failTask(taskId, reason, opts) {
  if (!reason) {
    fail('Task fail requires --reason <text>.', opts, 'E_REASON_REQUIRED');
  }
  updateTaskStatus(taskId, 'failed', reason, opts);
}

module.exports = {
  initTasks,
  createTask,
  listTasks,
  getTask,
  nextTask,
  startTask,
  doneTask,
  failTask,
};
