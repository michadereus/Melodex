// tests/unit/ui/ui-001-auth-guard.spec.ts
// UI-001 — AuthGuard (export action)

import ensureSpotifyConnected from "../../melodex-front-end/src/utils/spotifyAuthGuard.js";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type FetchResult = {
  ok: boolean;
  status?: number;
  json?: () => Promise<any>;
};

const realFetch = global.fetch;

// Minimal, safe typing around vi.fn()
type AnyMock = ReturnType<typeof vi.fn>;
function fetchMock(): AnyMock {
  return global.fetch as unknown as AnyMock;
}

// Queue a series of results/errors for fetch calls in order.
function queueFetch(...items: Array<FetchResult | Error>) {
  const f = fetchMock();
  for (const it of items) {
    if (it instanceof Error) {
      f.mockRejectedValueOnce(it);
    } else {
      f.mockResolvedValueOnce(it as any);
    }
  }
}

describe("UI-001 — AuthGuard (export action)", () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("authenticated → proceed without redirect", async () => {
    queueFetch({ ok: true, json: async () => ({ connected: true }) });

    const decision = await ensureSpotifyConnected("");
    expect(decision).toEqual({ shouldRedirect: false });

    expect(fetchMock()).toHaveBeenCalledWith("/auth/session", expect.any(Object));
  });

  it("unauthenticated (200 {connected:false}) → redirect to /auth/start", async () => {
    queueFetch({ ok: true, json: async () => ({ connected: false }) });

    const decision = await ensureSpotifyConnected("");
    expect(decision).toEqual({ shouldRedirect: true, to: "/auth/start" });
  });

  it("backend not reachable → redirect to /auth/start", async () => {
    queueFetch(new Error("boom"));

    const decision = await ensureSpotifyConnected("");
    expect(decision).toEqual({ shouldRedirect: true, to: "/auth/start" });
  });

  it("401 on session → refresh succeeds → retry connected:true → proceed", async () => {
    queueFetch(
      { ok: false, status: 401 },                          // /auth/session
      { ok: true, json: async () => ({ ok: true }) },      // /auth/refresh
      { ok: true, json: async () => ({ connected: true }) } // /auth/session (retry)
    );

    const decision = await ensureSpotifyConnected("");
    expect(decision).toEqual({ shouldRedirect: false });

    const calls = (fetchMock().mock.calls as any[]).map(([u]: any[]) => String(u));
    expect(calls[0]).toContain("/auth/session");
    expect(calls[1]).toContain("/auth/refresh");
    expect(calls[2]).toContain("/auth/session");
  });

  it("401 on session → refresh succeeds → retry still unauth → redirect", async () => {
    queueFetch(
      { ok: false, status: 401 },
      { ok: true, json: async () => ({ ok: true }) },
      { ok: true, json: async () => ({ connected: false }) }
    );

    const decision = await ensureSpotifyConnected("");
    expect(decision).toEqual({ shouldRedirect: true, to: "/auth/start" });
  });

  it("401 on session → refresh network error → redirect", async () => {
    queueFetch(
      { ok: false, status: 401 },
      new Error("refresh down")
    );

    const decision = await ensureSpotifyConnected("");
    expect(decision).toEqual({ shouldRedirect: true, to: "/auth/start" });
  });
});
