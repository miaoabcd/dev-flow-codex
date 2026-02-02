const fs = require('fs');

function writeToFd(fd, message) {
  try {
    fs.writeSync(fd, message);
  } catch (err) {
    if (fd === 1) {
      process.stdout.write(message);
    } else {
      process.stderr.write(message);
    }
  }
}

function printJson(payload) {
  writeToFd(1, JSON.stringify(payload) + '\n');
}

function ok(data, opts, message) {
  if (opts && opts.json) {
    printJson({ status: 'ok', data });
    return;
  }
  if (message) {
    writeToFd(1, `${message}\n`);
  } else {
    writeToFd(1, 'OK\n');
  }
}

function fail(message, opts, code) {
  const errorCode = code || 'ERR';
  if (opts && opts.json) {
    printJson({ status: 'error', code: errorCode, message });
  } else {
    writeToFd(2, `${message}\n`);
  }
  process.exit(1);
}

module.exports = {
  ok,
  fail,
  writeToFd,
};
