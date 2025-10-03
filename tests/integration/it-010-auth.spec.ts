// tests/integration/it-010-auth.spec.ts
import { describe, it, expect } from "vitest";
import request from "supertest";
const app = require("../../melodex-back-end/app");

describe("IT-010-Auth — revoke blocks Spotify actions", () => {
  const EXPORT_PATH = "/api/playlist/export"; // your stubbed route

  // Minimal payload your stub accepts
  const payload = { name: "Test Playlist", uris: ["spotify:track:123"] };

  it("unauthenticated → 401", async () => {
    const res = await request(app)
      .post(EXPORT_PATH)
      .send(payload); // <- put it here
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: expect.stringMatching(/AUTH/i) });
  });

  it("authenticated → 200 (auth passes)", async () => {
    const res = await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", ["access=acc-token"]) // your Spotify cookie key
      .send(payload); // <- and here
    expect(res.status).toBe(200); // stub returns 200 with { ok: true, received: { ... } }
    expect(res.body).toMatchObject({ ok: true });
  });

  it("after revoke → 401 again", async () => {
    await request(app).post("/auth/revoke");
    const res = await request(app).post(EXPORT_PATH).send(payload);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: expect.stringMatching(/AUTH/i) });
  });
});
