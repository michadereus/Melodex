// tests/unit/auth/ut-001-auth.spec.ts
import { describe, it, expect } from "vitest";
const { buildAuthCookies } = require("../../melodex-back-end/auth/cookies");

describe("UT-Cookies — secure flags", () => {
  it("sets HttpOnly, Secure, SameSite and Max-Age", () => {
    const headers = buildAuthCookies({
      accessToken: "acc",
      refreshToken: "ref",
      accessTtlSec: 3600,
      refreshTtlSec: 60 * 60 * 24 * 14,
    });
    const h = headers.join("; ");
    expect(h).toMatch(/access=/i);
    expect(h).toMatch(/refresh=/i);
    expect(h).toMatch(/HttpOnly/i);
    expect(h).toMatch(/Secure/i);
    expect(h).toMatch(/SameSite=(Lax|Strict)/i);
    expect(h).toMatch(/Path=\//i);
    expect(h).toMatch(/Max-Age=\d+/i);
  });
});
