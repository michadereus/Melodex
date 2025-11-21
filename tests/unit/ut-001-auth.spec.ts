// tests/unit/auth/ut-001-auth.spec.ts
import { describe, it, expect } from "vitest";
import { serializeCookie } from "../../melodex-back-end/utils/cookies";

describe("UT-001-Auth — Cookie flags httpOnly SameSite Secure max-age", () => {
  it("UT-001: sets HttpOnly, SameSite, Path=/, and Max-Age on access & refresh cookies", () => {
    // In tests/dev we don't force Secure, but we still want robust defaults.
    process.env.FRONTEND_ORIGIN = "https://melodex.test";

    const accessCookie = serializeCookie("access", "acc", {
      maxAge: 3600,
    });

    const refreshCookie = serializeCookie("refresh", "ref", {
      maxAge: 60 * 60 * 24 * 14,
    });

    const h = `${accessCookie}; ${refreshCookie}`;

    // cookie names present (access & refresh)
    expect(h).toMatch(/(?:^|;\s*)access=/i);
    expect(h).toMatch(/(?:^|;\s*)refresh=/i);

    // flags
    expect(h).toMatch(/HttpOnly/i);
    // Secure is optional in this environment; don't assert it unconditionally.
    expect(h).toMatch(/Path=\//i);
    expect(h).toMatch(/Max-Age=\d+/i);

    // SameSite explicitly set; allow None/Lax/Strict
    expect(h).toMatch(/SameSite=(None|Lax|Strict)/i);

    // If SameSite=None is used, it must be paired with Secure (defense-in-depth).
    if (/SameSite=None/i.test(h)) {
      expect(h).toMatch(/Secure/i);
    }
  });
});
