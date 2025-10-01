import { describe, it, expect } from "vitest";
import request from "supertest";
const app = require("../../melodex-back-end/app");

describe("IT-002 — /auth/session", () => {
  it("returns connected=false with no access cookie", async () => {
    const res = await request(app).get("/auth/session").expect(200);
    expect(res.body).toEqual({ connected: false });
  });

  it("returns connected=true when access cookie present", async () => {
    const res = await request(app)
      .get("/auth/session")
      .set("Cookie", ["access=acc-token"]) // mirrors your cookie name
      .expect(200);
    expect(res.body).toEqual({ connected: true });
  });
});
