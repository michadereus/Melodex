import ensureSpotifyConnected from "../../melodex-front-end/src/utils/spotifyAuthGuard.js";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const realFetch = global.fetch;

describe("UI-001 — AuthGuard (export action)", () => {
  beforeEach(() => { /* @ts-ignore */ global.fetch = vi.fn(); });
  afterEach(() => { global.fetch = realFetch; vi.restoreAllMocks(); });

  it("unauthenticated → shouldRedirect:/auth/start", async () => {
    // @ts-ignore
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ connected: false }) });
    const decision = await ensureSpotifyConnected("");
    expect(decision).toEqual({ shouldRedirect: true, to: "/auth/start" });
  });

  it("authenticated → proceed without redirect", async () => {
    // @ts-ignore
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ connected: true }) });
    const decision = await ensureSpotifyConnected("");
    expect(decision).toEqual({ shouldRedirect: false });
  });

  it("backend not reachable → default to connect flow", async () => {
    // @ts-ignore
    global.fetch.mockRejectedValue(new Error("boom"));
    const decision = await ensureSpotifyConnected("");
    expect(decision).toEqual({ shouldRedirect: true, to: "/auth/start" });
  });
});
