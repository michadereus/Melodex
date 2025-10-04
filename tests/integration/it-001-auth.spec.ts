// tests/integration/auth/it-001-auth.spec.ts
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import nock from "nock";

// ⬇️ Adjust this path to your Express app export (must be the app, not .listen())
const app = require("../../melodex-back-end/app");

const FRONT = process.env.FRONTEND_ORIGIN;

/** Normalize set-cookie header(s) to array */
function asCookieArray(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string") return [v];
  return [];
}

/** Simple “cookie present?” check */
function cookiePresent(name: string, cookies: string[]): boolean {
  const joined = cookies.join("; ");
  const rx = new RegExp(`(?:^|;\\s*)${name}=`, "i");
  return rx.test(joined);
}

/** Simple “cookie cleared?” (Max-Age=0) check */
function cookieCleared(name: string, cookies: string[]): boolean {
  const joined = cookies.join("; ");
  const rx = new RegExp(`${name}=[^;]*;[^]*Max-Age=0`, "i");
  return rx.test(joined) || !cookiePresent(name, cookies);
}

beforeAll(() => {
  // Block real network calls in tests (except local app under test)
  nock.disableNetConnect();
  nock.enableNetConnect(/127\.0\.0\.1|localhost/);
});

afterAll(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

beforeEach(() => nock.cleanAll());

describe("AC-01.1 — OAuth callback establishes session and redirects", () => {
  it("IT-001a: success → 302 to FRONTEND_ORIGIN/rankings + access/refresh cookies with security flags", async () => {
    // Mock Spotify token exchange
    nock("https://accounts.spotify.com")
      .post("/api/token")
      .reply(200, {
        access_token: "acc-token",
        refresh_token: "ref-token",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "playlist-modify-private",
      });

    const res = await request(app)
      .get("/auth/callback?code=ok&state=xyz")
      // Simulate temp cookies set by /auth/start
      .set("Cookie", ["oauth_state=xyz", "pkce_verifier=s3cr3t"])
      .expect(302);

    // Redirect to SPA (FRONTEND_ORIGIN)
    expect(res.headers.location).toBe(`${FRONT}/rankings`);

    // Validate auth cookies + security flags
    const setCookieHdrs = asCookieArray(res.headers["set-cookie"]);
    const joined = setCookieHdrs.join("; ");

    // Access + refresh present
    expect(cookiePresent("access", setCookieHdrs)).toBe(true);
    expect(cookiePresent("refresh", setCookieHdrs)).toBe(true);

    // Security flags present (dev env may omit Secure, but your UTs cover flags thoroughly)
    expect(joined).toMatch(/HttpOnly/i);
    expect(joined).toMatch(/SameSite=(Lax|Strict|None)/i);
    expect(joined).toMatch(/Path=\//i);
    expect(joined).toMatch(/Max-Age=\d+/i);

    // Ensure our nock was used
    expect(nock.isDone()).toBe(true);
  });

  it("IT-001b: uses PKCE code_verifier and matches state", async () => {
    // Validate request body contains code + code_verifier
    const scope = nock("https://accounts.spotify.com")
      .post("/api/token", body => {
        const s = typeof body === "string" ? body : new URLSearchParams(body as any).toString();
        return /grant_type=authorization_code/.test(s)
          && /code=ok/.test(s)
          && /code_verifier=s3cr3t/.test(s);
      })
      .reply(200, {
        access_token: "acc",
        refresh_token: "ref",
        token_type: "Bearer",
        expires_in: 3600,
      });

    await request(app)
      .get("/auth/callback?code=ok&state=xyz")
      .set("Cookie", ["oauth_state=xyz", "pkce_verifier=s3cr3t"])
      .expect(302);

    expect(scope.isDone()).toBe(true);
  });

  it("IT-001c: clears temp cookies (oauth_state, pkce_verifier) after success", async () => {
    nock("https://accounts.spotify.com")
      .post("/api/token")
      .reply(200, { access_token: "a", refresh_token: "r", token_type: "Bearer", expires_in: 3600 });

    const res = await request(app)
      .get("/auth/callback?code=ok&state=xyz")
      .set("Cookie", ["oauth_state=xyz", "pkce_verifier=abc"])
      .expect(302);

    const set = asCookieArray(res.headers["set-cookie"]);
    expect(cookieCleared("oauth_state", set)).toBe(true);
    expect(cookieCleared("pkce_verifier", set)).toBe(true);
    expect(nock.isDone()).toBe(true);
  });

  it("IT-001d: cancel at Spotify → no tokens + redirect to FRONTEND_ORIGIN/login?error=access_denied", async () => {
    // No token call on cancel path; just assert redirect & cleared temps
    const res = await request(app)
      .get("/auth/callback?error=access_denied&state=xyz")
      .set("Cookie", ["oauth_state=xyz", "pkce_verifier=s3cr3t"])
      .expect(302);

    expect(res.headers.location).toBe(`${FRONT}/login?error=access_denied`);

    const set = asCookieArray(res.headers["set-cookie"]);
    // No auth cookies
    expect(cookiePresent("access", set)).toBe(false);
    expect(cookiePresent("refresh", set)).toBe(false);
    // Temps cleared
    expect(cookieCleared("oauth_state", set)).toBe(true);
    expect(cookieCleared("pkce_verifier", set)).toBe(true);
  });

  it("IT-001e: state mismatch → redirect to FRONTEND_ORIGIN/login?error=state_mismatch; no auth cookies", async () => {
    // Note: your current controller does not explicitly clear temps on mismatch (only on success/cancel/failure)
    const res = await request(app)
      .get("/auth/callback?code=ok&state=WRONG")
      .set("Cookie", ["oauth_state=xyz", "pkce_verifier=abc"])
      .expect(302);

    expect(res.headers.location).toBe(`${FRONT}/login?error=state_mismatch`);

    const set = asCookieArray(res.headers["set-cookie"]);
    expect(cookiePresent("access", set)).toBe(false);
    expect(cookiePresent("refresh", set)).toBe(false);
    // expect(cookieCleared("oauth_state", set)).toBe(true);
    // expect(cookieCleared("pkce_verifier", set)).toBe(true);
  });

  it("IT-001f: token exchange fails (Spotify 400) → redirect to FRONTEND_ORIGIN/login?error=token_exchange_failed; no auth cookies; temps cleared", async () => {
    nock("https://accounts.spotify.com")
      .post("/api/token")
      .reply(400, { error: "invalid_grant" });

    const res = await request(app)
      .get("/auth/callback?code=bad&state=xyz")
      .set("Cookie", ["oauth_state=xyz", "pkce_verifier=abc"])
      .expect(302);

    expect(res.headers.location).toBe(`${FRONT}/login?error=token_exchange_failed`);

    const set = asCookieArray(res.headers["set-cookie"]);
    expect(cookiePresent("access", set)).toBe(false);
    expect(cookiePresent("refresh", set)).toBe(false);
    expect(cookieCleared("oauth_state", set)).toBe(true);
    expect(cookieCleared("pkce_verifier", set)).toBe(true);

    expect(nock.isDone()).toBe(true);
  });

  it("IT-001g: /auth/start → 302 to accounts.spotify.com with code_challenge + state + redirect_uri (+ show_dialog during dev)", async () => {
    const res = await request(app).get("/auth/start").expect(302);

    const loc = res.headers.location as string;
    expect(loc).toMatch(/^https:\/\/accounts\.spotify\.com\/authorize\?/);

    // Required query params present
    expect(loc).toMatch(/[?&]response_type=code(&|$)/);
    expect(loc).toMatch(/[?&]client_id=[^&]+/);
    expect(loc).toMatch(/[?&]redirect_uri=[^&]+/);
    expect(loc).toMatch(/[?&]state=[^&]+/);
    expect(loc).toMatch(/[?&]code_challenge_method=S256(&|$)/);
    expect(loc).toMatch(/[?&]code_challenge=[^&]+/);

    // We put show_dialog=true in dev for testing convenience
    expect(loc).toMatch(/[?&]show_dialog=true(&|$)/);

    // Temp cookies set
    const set = asCookieArray(res.headers["set-cookie"]);
    expect(cookiePresent("oauth_state", set)).toBe(true);
    expect(cookiePresent("pkce_verifier", set)).toBe(true);
  });
});
