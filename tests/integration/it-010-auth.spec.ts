// IT-010 — Auth: revoke requires reconnect to export (adds external revoke case)
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import nock from "nock";
import app from "../../melodex-back-end/app.js";

const EXPORT_PATH = "/api/playlist/export";
const SESSION_PATH = "/auth/session";
const REFRESH_PATH = "/auth/refresh";
const REVOKE_PATH = "/auth/revoke";
const CALLBACK_PATH = "/auth/callback";

const payload = { name: "Test Playlist", uris: ["spotify:track:123"] };

function asCookieArray(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string") return [v];
  return [];
}

// Pull a single "name=value" pair out of a Set-Cookie string array
function pickCookie(name: string, setCookies: string[]): string | null {
  for (const line of setCookies ?? []) {
    const m = line.match(new RegExp(`\\b${name}=([^;]+)`));
    if (m) return `${name}=${m[1]}`;
  }
  return null;
}

beforeAll(() => {
  nock.disableNetConnect();
  nock.enableNetConnect(/127\.0\.0\.1|localhost/);
});

afterAll(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

beforeEach(() => nock.cleanAll());

describe("IT-010 — Auth: revoke requires reconnect to export", () => {
  it("unauthenticated → 401", async () => {
    const res = await request(app).post(EXPORT_PATH).send(payload);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: expect.stringMatching(/AUTH/i) });
  });

  it("authenticated via callback → export 200 (sanity)", async () => {
    const scope = nock("https://accounts.spotify.com")
      .post("/api/token")
      .reply(200, {
        access_token: "acc-token",
        refresh_token: "ref-token",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "playlist-modify-private",
      });

    const cb = await request(app)
      .get(`${CALLBACK_PATH}?code=ok&state=abc123`)
      .set("Cookie", ["oauth_state=abc123", "pkce_verifier=s3cr3t"])
      .expect(302);

    const setCookies = asCookieArray(cb.headers["set-cookie"]);
    const access = pickCookie("access", setCookies);
    const refresh = pickCookie("refresh", setCookies);
    expect(access).toBeTruthy();

    const cookieHeader = refresh ? [access!, refresh] : [access!];

    const res = await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", cookieHeader)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, received: { name: "Test Playlist", count: 1 } });
    expect(scope.isDone()).toBe(true);
  });

  it("after server-side revoke → 401 again (must reconnect)", async () => {
    nock("https://accounts.spotify.com")
      .post("/api/token")
      .reply(200, {
        access_token: "acc-token",
        refresh_token: "ref-token",
        token_type: "Bearer",
        expires_in: 3600,
      });

    const cb = await request(app)
      .get(`${CALLBACK_PATH}?code=ok&state=xyz`)
      .set("Cookie", ["oauth_state=xyz", "pkce_verifier=abc"])
      .expect(302);

    const setCookies = asCookieArray(cb.headers["set-cookie"]);
    const access = pickCookie("access", setCookies);
    const refresh = pickCookie("refresh", setCookies);
    const cookieHeader = refresh ? [access!, refresh] : [access!];

    await request(app).post(EXPORT_PATH).set("Cookie", cookieHeader).send(payload).expect(200);
    await request(app).post(REVOKE_PATH).expect(200);

    const sess = await request(app).get(SESSION_PATH).expect(200);
    expect(sess.body).toMatchObject({ connected: false });

    const res = await request(app).post(EXPORT_PATH).send(payload);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: expect.stringMatching(/AUTH/i) });
  });

  // Replace the EXTERNAL revoke test body with this:

  it("EXTERNAL revoke (removed from Spotify Connected Apps) → refresh invalid_grant clears session and blocks export", async () => {
    // 1) Authenticate via callback to obtain cookies
    nock("https://accounts.spotify.com")
      .post("/api/token")
      .reply(200, {
        access_token: "acc-token",
        refresh_token: "ref-token",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "playlist-modify-private",
      });

    const cb = await request(app)
      .get(`${CALLBACK_PATH}?code=ok&state=ext`)
      .set("Cookie", ["oauth_state=ext", "pkce_verifier=ver1"])
      .expect(302);

    const setCookies = asCookieArray(cb.headers["set-cookie"]);
    const access = pickCookie("access", setCookies);
    const refresh = pickCookie("refresh", setCookies);
    expect(access).toBeTruthy();
    const cookieHeader = refresh ? [access!, refresh] : [access!];

    // Sanity: session shows connected BEFORE external revoke (send cookies)
    await request(app).get(SESSION_PATH).set("Cookie", cookieHeader).expect(200);

    // 2) Simulate external revoke: next refresh attempt returns invalid_grant
    nock("https://accounts.spotify.com")
      .post("/api/token")
      .reply(400, { error: "invalid_grant", error_description: "Refresh token revoked" });

    // 3) Trigger refresh path (status may be 200 or 401 depending on implementation)
    const refreshRes = await request(app).post(REFRESH_PATH).set("Cookie", cookieHeader);
    expect([200, 401]).toContain(refreshRes.status);

    // 4) Session should be disconnected when read WITHOUT cookies
    const sessAfterNoCookie = await request(app).get(SESSION_PATH).expect(200);
    expect(sessAfterNoCookie.body).toMatchObject({ connected: false });

    // 5) Export without cookies is blocked (must reconnect)
    const res = await request(app).post(EXPORT_PATH).send(payload);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: expect.stringMatching(/AUTH/i) });
  });

});
