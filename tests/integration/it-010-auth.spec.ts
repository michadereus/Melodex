// tests/integration/it-010-auth.spec.ts
// IT-010 — Auth: revoke requires reconnect to export
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import nock from "nock";
import app from "../../melodex-back-end/app.js";

const EXPORT_PATH = "/api/playlist/export";
const SESSION_PATH = "/auth/session";
const REVOKE_PATH = "/auth/revoke";
const CALLBACK_PATH = "/auth/callback";

const payload = { name: "Test Playlist", uris: ["spotify:track:123"] };

function asCookieArray(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string") return [v];
  return [];
}

// Extract "name=value" from Set-Cookie lines
function pickCookie(name: string, setCookies: string[]): string | null {
  for (const line of setCookies) {
    const m = line.match(new RegExp(`\\b${name}=([^;]+)`));
    if (m) return `${name}=${m[1]}`;
  }
  return null;
}

beforeAll(() => {
  // Block real network; allow localhost (app under test)
  nock.disableNetConnect();
  nock.enableNetConnect(/127\.0\.0\.1|localhost/);
});

afterAll(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

beforeEach(() => {
  nock.cleanAll();
});

describe("IT-010 — Auth: revoke requires reconnect to export", () => {
  it("unauthenticated → 401 with AUTH code", async () => {
    const res = await request(app).post(EXPORT_PATH).send(payload);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: expect.stringMatching(/AUTH/i) });
  });

  it("authenticated via callback → export 200 (sanity)", async () => {
    // Stub Spotify token exchange for callback
    const scope = nock("https://accounts.spotify.com")
      .post("/api/token")
      .reply(200, {
        access_token: "acc-token",
        refresh_token: "ref-token",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "playlist-modify-private",
      });

    // Hit callback as if user completed /auth/start
    const cb = await request(app)
      .get(`${CALLBACK_PATH}?code=ok&state=abc123`)
      .set("Cookie", ["oauth_state=abc123", "pkce_verifier=s3cr3t"])
      .expect(302);

    const setCookies = asCookieArray(cb.headers["set-cookie"]);
    const access = pickCookie("access", setCookies);
    const refresh = pickCookie("refresh", setCookies);
    expect(access).toBeTruthy();

    // Use cookies explicitly to avoid Secure-on-HTTP issues
    const cookieHeader = refresh ? [access!, refresh] : [access!];

    // Export succeeds
    const res = await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", cookieHeader)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, received: { name: "Test Playlist", count: 1 } });
    expect(scope.isDone()).toBe(true);
  });

  it("after revoke → session shows connected:false and export → 401 (must reconnect)", async () => {
    // Authenticate first
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

    // Sanity: export works while authenticated
    await request(app).post(EXPORT_PATH).set("Cookie", cookieHeader).send(payload).expect(200);

    // Revoke clears cookies server-side
    await request(app).post(REVOKE_PATH).expect(200);

    // Session should now report connected:false
    const sess = await request(app).get(SESSION_PATH).expect(200);
    expect(sess.body).toMatchObject({ connected: false });

    // Export without cookies is blocked
    const res = await request(app).post(EXPORT_PATH).send(payload);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: expect.stringMatching(/AUTH/i) });
  });
});
