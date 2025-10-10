// melodex-back-end/auth/cookies.js

function serializeCookie(name, value, opts = {}) {
  const {
    maxAge,
    httpOnly = true,
    secure = true,
    sameSite = "lax",
    path = "/",
  } = opts;

  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`];
  if (typeof maxAge === "number") parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  if (sameSite) parts.push(`SameSite=${String(sameSite)[0].toUpperCase()}${String(sameSite).slice(1)}`);

  return parts.join("; ");
}

function buildAuthCookies({ accessToken, refreshToken, accessTtlSec, refreshTtlSec }) {
  const out = [];
  out.push(
    serializeCookie("access", accessToken, {
      maxAge: accessTtlSec,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    })
  );
  if (refreshToken && refreshTtlSec) {
    out.push(
      serializeCookie("refresh", refreshToken, {
        maxAge: refreshTtlSec,
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
      })
    );
  }
  return out;
}

module.exports = { serializeCookie, buildAuthCookies };
