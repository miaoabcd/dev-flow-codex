#!/usr/bin/env node

const { run } = require('../lib/cli');

try {
  run(process.argv);
} catch (err) {
  const message = err && err.message ? err.message : String(err);
  console.error(message);
  process.exit(1);
}
