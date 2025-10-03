// tests/unit/auth/ut-001-auth.spec.ts
import { describe, it, expect } from "vitest";
const { buildAuthCookies } = require("../../melodex-back-end/auth/cookies");

describe("UT-001-Auth — Cookie flags httpOnly SameSite Secure max-age", () => {
  it("UT-001: sets HttpOnly, Secure, SameSite, Path=/, and Max-Age", () => {
    const headers = buildAuthCookies({
      accessToken: "acc",
      refreshToken: "ref",
      accessTtlSec: 3600,
      refreshTtlSec: 60 * 60 * 24 * 14,
    });

    const h = headers.join("; ");

    // cookie names present
    expect(h).toMatch(/(?:^|;\s*)access=/i);
    expect(h).toMatch(/(?:^|;\s*)refresh=/i);

    // flags
    expect(h).toMatch(/HttpOnly/i);
    expect(h).toMatch(/Secure/i);
    expect(h).toMatch(/SameSite=(Lax|Strict)/i);
    expect(h).toMatch(/Path=\//i);
    expect(h).toMatch(/Max-Age=\d+/i);

    // sanity: do NOT allow SameSite=None without Secure (defense-in-depth; implied by above)
    expect(h).not.toMatch(/SameSite=None/i);
  });
});
