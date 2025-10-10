// melodex-back-end/utils/errorContract.js
const CODES = {
  NO_SONGS: 'NO_SONGS',
  SPOTIFY_FAIL: 'SPOTIFY_FAIL',
  RATE_LIMIT: 'RATE_LIMIT',
  NOT_FOUND_PARTIAL: 'NOT_FOUND_PARTIAL',
  AUTH_SPOTIFY_REQUIRED: 'AUTH_SPOTIFY_REQUIRED',
};

function ok(payload = {}) {
  return { ok: true, ...payload };
}

function fail(code, message = '', details) {
  const body = { ok: false, code, message };
  if (details != null) body.details = details;
  return body;
}

module.exports = { CODES, ok, fail };
