// melodex-back-end/utils/cookies.js

const isProd =
  process.env.FRONTEND_ORIGIN &&
  process.env.FRONTEND_ORIGIN.startsWith("https://");

function serializeCookie(name, value, opts = {}) {
  const {
    maxAge,
    httpOnly = true,
    secure = isProd, // <-- use env-based default
    sameSite = "lax",
    path = "/",
  } = opts;

  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`];
  if (typeof maxAge === "number") {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  }
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  if (sameSite) {
    const s = String(sameSite);
    parts.push(`SameSite=${s[0].toUpperCase()}${s.slice(1)}`);
  }

  return parts.join("; ");
}

// wherever buildAuthCookies is:
function buildAuthCookies(tokens, ttlSec, refreshTtlSec) {
  const out = [];

  if (tokens?.access_token && ttlSec) {
    out.push(
      serializeCookie("access", tokens.access_token, {
        maxAge: ttlSec,
        httpOnly: true,
        // secure defaults to isProd
        sameSite: "lax",
        path: "/",
      })
    );
  }

  if (tokens?.refresh_token && refreshTtlSec) {
    out.push(
      serializeCookie("refresh", tokens.refresh_token, {
        maxAge: refreshTtlSec,
        httpOnly: true,
        secure: isProd, // <-- was true
        sameSite: "lax",
        path: "/",
      })
    );
  }

  return out;
}

module.exports = { serializeCookie, buildAuthCookies };
