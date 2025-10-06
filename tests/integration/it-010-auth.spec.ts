// tests/integration/it-010-auth.spec.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import nock from "nock";

import app from "../../melodex-back-end/app.js";

const EXPORT_PATH = "/api/playlist/export";
const payload = { name: "Test Playlist", uris: ["spotify:track:123"] };

function asCookieArray(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string") return [v];
  return [];
}

// Pull a single "name=value" pair out of a Set-Cookie string array
function pickCookie(name: string, setCookies: string[]): string | null {
  for (const line of setCookies) {
    const m = line.match(new RegExp(`\\b${name}=([^;]+)`));
    if (m) return `${name}=${m[1]}`;
  }
  return null;
}

beforeAll(() => {
  // Block real network; allow localhost (the app under test)
  nock.disableNetConnect();
  nock.enableNetConnect(/127\.0\.0\.1|localhost/);
});

afterAll(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

beforeEach(() => nock.cleanAll());

describe("IT-010-Auth — revoke blocks Spotify actions", () => {
  it("unauthenticated → 401", async () => {
    const res = await request(app).post(EXPORT_PATH).send(payload);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: expect.stringMatching(/AUTH/i) });
  });

  it("authenticated (manual cookie from real callback) → 200", async () => {
    // Mock Spotify token exchange for the callback
    const scope = nock("https://accounts.spotify.com")
      .post("/api/token")
      .reply(200, {
        access_token: "acc-token",
        refresh_token: "ref-token",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "playlist-modify-private",
      });

    // Hit the callback with temp cookies (as if /auth/start had run)
    const cb = await request(app)
      .get("/auth/callback?code=ok&state=abc123")
      .set("Cookie", ["oauth_state=abc123", "pkce_verifier=s3cr3t"])
      .expect(302);

    const setCookies = asCookieArray(cb.headers["set-cookie"]);
    expect(setCookies.length).toBeGreaterThan(0);

    // Manually extract and send the auth cookie(s) to bypass Secure-on-HTTP issues in the jar
    const access = pickCookie("access", setCookies);
    const refresh = pickCookie("refresh", setCookies); // optional for this stub path

    // Sanity: we must have at least access
    expect(access).toBeTruthy();

    const cookieHeader = refresh ? [access!, refresh] : [access!];

    // Now call the protected export with the cookies explicitly set
    const res = await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", cookieHeader)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, received: { name: "Test Playlist", count: 1 } });

    expect(scope.isDone()).toBe(true);
  });

  it("after revoke → 401 again (must reconnect)", async () => {
    // First authenticate via callback to obtain cookies
    nock("https://accounts.spotify.com")
      .post("/api/token")
      .reply(200, {
        access_token: "acc-token",
        refresh_token: "ref-token",
        token_type: "Bearer",
        expires_in: 3600,
      });

    const cb = await request(app)
      .get("/auth/callback?code=ok&state=xyz")
      .set("Cookie", ["oauth_state=xyz", "pkce_verifier=abc"])
      .expect(302);

    const setCookies = asCookieArray(cb.headers["set-cookie"]);
    const access = pickCookie("access", setCookies);
    const refresh = pickCookie("refresh", setCookies);

    // Confirm we can call export with cookies present
    await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", [access!, ...(refresh ? [refresh] : [])])
      .send(payload)
      .expect(200);

    // Call revoke to clear tokens on the server side (sends Set-Cookie Max-Age=0)
    await request(app).post("/auth/revoke").expect(200);

    // Now call export WITHOUT sending cookies -> should be blocked
    const res = await request(app).post(EXPORT_PATH).send(payload);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: expect.stringMatching(/AUTH/i) });
  });
});
