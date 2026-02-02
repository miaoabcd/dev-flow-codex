function nowIso() {
  return new Date().toISOString();
}

function timestampForPath() {
  const iso = new Date().toISOString();
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

module.exports = {
  nowIso,
  timestampForPath,
};
