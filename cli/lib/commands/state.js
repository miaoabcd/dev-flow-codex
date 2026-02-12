const fs = require('fs');
const path = require('path');

const paths = require('../utils/paths');
const { ensureDir, fileExists, readJson, writeJson } = require('../utils/io');
const { ok, fail } = require('../utils/output');
const { nowIso, timestampForPath } = require('../utils/time');

function getState(opts) {
  const state = readJson(paths.statePath(), { allowMissing: true }) || {};
  const message = state.phase ? `Phase: ${state.phase}` : 'No state found';
  ok(state, opts, message);
}

function setState(phase, opts) {
  if (!phase) {
    fail('State set requires --phase <phase>.', opts, 'E_PHASE_REQUIRED');
  }
  const state = { phase, updatedAt: nowIso() };
  writeJson(paths.statePath(), state);
  ok(state, opts, `State set to ${phase}`);
}

function updateState(phase, opts) {
  if (!phase) {
    fail('State update requires --phase <phase>.', opts, 'E_PHASE_REQUIRED');
  }
  const current = readJson(paths.statePath(), { allowMissing: true }) || {};
  const state = { ...current, phase, updatedAt: nowIso() };
  writeJson(paths.statePath(), state);
  ok(state, opts, `State updated to ${phase}`);
}

function archiveState(force, opts) {
  if (!force) {
    fail('State archive requires --force.', opts, 'E_FORCE_REQUIRED');
  }
  const currentStatePath = paths.statePath();
  if (!fileExists(currentStatePath)) {
    ok({ archived: false, archivePath: null }, opts, 'No state to archive');
    return;
  }
  const stamp = timestampForPath();
  const destDir = path.join(paths.archiveDir(), stamp);
  ensureDir(destDir);
  const destPath = path.join(destDir, 'state.json');
  try {
    fs.renameSync(currentStatePath, destPath);
  } catch (err) {
    if (err && err.code === 'EXDEV') {
      fs.copyFileSync(currentStatePath, destPath);
      fs.unlinkSync(currentStatePath);
    } else {
      throw err;
    }
  }
  ok({ archived: true, archivePath: destPath }, opts, `Archived to ${destPath}`);
}

module.exports = {
  getState,
  setState,
  updateState,
  archiveState,
};
