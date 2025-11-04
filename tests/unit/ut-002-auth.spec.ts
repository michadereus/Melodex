// File: tests/unit/ut-002-auth.spec.ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../melodex-back-end/app.js";

/**
 * UT-002 — Auth revoke clears tokens
 *
 * Focuses only on /auth/revoke and /auth/session.
 * Ensures Set-Cookie clears both access and refresh tokens,
 * and /auth/session returns connected:false afterward.
 */
describe("UT-002 — Auth revoke clears tokens", () => {
  it("returns ok:true and clears access/refresh cookies", async () => {
    const res = await request(app)
      .post("/auth/revoke")
      .set("Cookie", ["access=abc", "refresh=def"])
      .expect(200);

    expect(res.body).toMatchObject({ ok: true });

    // Normalize to array for safety
    const rawSetCookies = res.headers["set-cookie"];
    const setCookies: string[] = Array.isArray(rawSetCookies)
      ? rawSetCookies
      : rawSetCookies
      ? [rawSetCookies]
      : [];

    expect(setCookies.length).toBeGreaterThan(0);

    const clearedAccess = setCookies.some((c) => /access=.*Max-Age=0/i.test(c));
    const clearedRefresh = setCookies.some((c) => /refresh=.*Max-Age=0/i.test(c));

    expect(clearedAccess).toBe(true);
    expect(clearedRefresh).toBe(true);
  });

  it("/auth/session reports disconnected after revoke", async () => {
    // Initially: stub cookie so it looks connected
    const initial = await request(app)
      .get("/auth/session")
      .set("Cookie", ["access=test"])
      .expect(200);
    expect(initial.body).toMatchObject({ connected: true });

    // Now revoke, which should clear auth cookies
    await request(app)
      .post("/auth/revoke")
      .set("Cookie", ["access=test", "refresh=test2"])
      .expect(200);

    // Then call /auth/session with no cookies — should be disconnected
    const after = await request(app).get("/auth/session").expect(200);
    expect(after.body).toMatchObject({ connected: false });
  });
});
