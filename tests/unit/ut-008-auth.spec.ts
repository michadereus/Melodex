import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import ensureSpotifyConnected from "../../melodex-front-end/src/utils/spotifyAuthGuard.js";

const realFetch = global.fetch;

describe("UT-008-Auth — Refresh on 401 (inside AuthGuard)", () => {
  beforeEach(() => { /* @ts-ignore */ global.fetch = vi.fn(); });
  afterEach(() => { global.fetch = realFetch; vi.restoreAllMocks(); });

  it("401 on /auth/session → refresh succeeds → retry session connected=true", async () => {
    const gf = global.fetch as unknown as Mock;
    gf.mockResolvedValueOnce(new Response(null, { status: 401 })); // session 401
    gf.mockResolvedValueOnce(new Response(null, { status: 200 })); // refresh ok
    gf.mockResolvedValueOnce(new Response(JSON.stringify({ connected: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    })); // session retry ok

    const decision = await ensureSpotifyConnected("");
    expect(decision).toEqual({ shouldRedirect: false });
    expect(gf).toHaveBeenCalledTimes(3);
  });

  it("401 on /auth/session → refresh fails → redirect to /auth/start", async () => {
    const gf = global.fetch as unknown as Mock;
    gf.mockResolvedValueOnce(new Response(null, { status: 401 })); // session 401
    gf.mockResolvedValueOnce(new Response(null, { status: 401 })); // refresh fails

    const decision = await ensureSpotifyConnected("");
    expect(decision.shouldRedirect).toBe(true);
    expect(String(decision.to)).toMatch(/\/auth\/start$/);
  });
});
