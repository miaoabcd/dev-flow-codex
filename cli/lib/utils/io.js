const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
}

function readJson(filePath, options = {}) {
  const allowMissing = options.allowMissing === true;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (allowMissing && err && err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  const payload = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(filePath, payload, 'utf8');
}

module.exports = {
  ensureDir,
  fileExists,
  readJson,
  writeJson,
};
