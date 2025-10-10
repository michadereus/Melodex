// melodex-back-end/utils/chunk.js
/** Max URIs Spotify accepts per add-tracks call */
const MAX_URIS_PER_ADD = 100;

/** Split an array into chunks of size N (last chunk may be smaller) */
function chunk(arr, size = MAX_URIS_PER_ADD) {
  if (!Array.isArray(arr) || size <= 0) return [];
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

module.exports = { MAX_URIS_PER_ADD, chunk };
