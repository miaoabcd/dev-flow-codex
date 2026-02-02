const path = require('path');

const rootDir = process.cwd();
const devFlowDir = path.join(rootDir, '.dev-flow');
const archiveDir = path.join(devFlowDir, 'archive');
const statePath = path.join(devFlowDir, 'state.json');
const detectPath = path.join(devFlowDir, 'detect.json');
const tasksDir = path.join(devFlowDir, 'tasks');
const tasksIndexPath = path.join(tasksDir, 'index.json');

module.exports = {
  rootDir,
  devFlowDir,
  archiveDir,
  statePath,
  detectPath,
  tasksDir,
  tasksIndexPath,
};
