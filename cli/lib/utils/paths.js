const path = require('path');

function rootDir() {
  return process.cwd();
}

function devFlowDir() {
  return path.join(rootDir(), '.dev-flow');
}

function archiveDir() {
  return path.join(devFlowDir(), 'archive');
}

function statePath() {
  return path.join(devFlowDir(), 'state.json');
}

function detectPath() {
  return path.join(devFlowDir(), 'detect.json');
}

function tasksDir() {
  return path.join(devFlowDir(), 'tasks');
}

function tasksIndexPath() {
  return path.join(tasksDir(), 'index.json');
}

module.exports = {
  rootDir,
  devFlowDir,
  archiveDir,
  statePath,
  detectPath,
  tasksDir,
  tasksIndexPath,
};
