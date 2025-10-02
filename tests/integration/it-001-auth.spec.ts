// tests/integration/auth/it-auth.spec.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import nock from "nock";
// ⬇️ adjust to your Express app export (NOT .listen())
const app = require("../../melodex-back-end/app");

function asCookieArray(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string") return [v];
  return [];
}

describe("AC-01.1 — OAuth callback establishes session and redirects", () => {
  beforeAll(() => {
    nock.disableNetConnect();
    nock.enableNetConnect(/127\.0\.0\.1|localhost/);
  });
  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
  beforeEach(() => nock.cleanAll());

  it("IT-001a: success → 302 to /rankings + secure cookies", async () => {
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
      // include state cookie if your handler expects it
      .set("Cookie", ["oauth_state=xyz", "pkce_verifier=s3cr3t"])
      .expect(302);

    // Redirect to post-login route
    expect(res.headers.location).toBe("/rankings");

    // Validate auth cookies + security flags
    const setCookieHdrs = asCookieArray(res.headers["set-cookie"]);
    const setCookie = setCookieHdrs.join("; ");

    // At least access + refresh should be present
    expect(setCookie).toMatch(/(?:^|;\s*)access=/i);
    expect(setCookie).toMatch(/(?:^|;\s*)refresh=/i);

    // Security flags present on the cookies
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/Secure/i);
    expect(setCookie).toMatch(/SameSite=(Lax|Strict)/i);
    expect(setCookie).toMatch(/Path=\//i);
    expect(setCookie).toMatch(/Max-Age=\d+/i);
  });

  it("IT-001b: uses PKCE code_verifier and matches state", async () => {
    nock("https://accounts.spotify.com")
      .post("/api/token", (body) => {
        const s = typeof body === "string" ? body : new URLSearchParams(body as any).toString();
        return s.includes("code=ok") && s.includes("code_verifier=s3cr3t");
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
  });

  it("IT-001c: clears temp cookies (oauth_state, pkce_verifier) after success", async () => {
    nock("https://accounts.spotify.com")
      .post("/api/token")
      .reply(200, { access_token: "a", refresh_token: "r", token_type: "Bearer", expires_in: 3600 });

    const res = await request(app)
      .get("/auth/callback?code=ok&state=xyz")
      .set("Cookie", ["oauth_state=xyz", "pkce_verifier=abc"])
      .expect(302);

    const set = asCookieArray(res.headers["set-cookie"]).join("; ");

    const stateCleared = !/oauth_state=/.test(set) || /oauth_state=.*Max-Age=0/i.test(set);
    const pkceCleared  = !/pkce_verifier=/.test(set) || /pkce_verifier=.*Max-Age=0/i.test(set);

    expect(stateCleared).toBe(true);
    expect(pkceCleared).toBe(true);
  });

  it("IT-001d: cancel at Spotify → no tokens + redirect to /login?error=access_denied", async () => {
    // Simulate Spotify sending back an error + valid state
    const res = await request(app)
      .get("/auth/callback?error=access_denied&state=xyz")
      .set("Cookie", ["oauth_state=xyz", "pkce_verifier=s3cr3t"])
      .expect(302);

    // Redirect target preserves the error
    expect(res.headers.location).toMatch(/^\/login\?error=access_denied/);

    // No auth cookies should be set
    const set = asCookieArray(res.headers["set-cookie"]).join("; ");
    expect(set).not.toMatch(/(?:^|;\s*)access=/i);
    expect(set).not.toMatch(/(?:^|;\s*)refresh=/i);

    // Temp cookies should be cleared
    const stateCleared  = /oauth_state=.*Max-Age=0/i.test(set) || !/oauth_state=/.test(set);
    const pkceCleared   = /pkce_verifier=.*Max-Age=0/i.test(set) || !/pkce_verifier=/.test(set);

    expect(stateCleared).toBe(true);
    expect(pkceCleared).toBe(true);
  });
});
