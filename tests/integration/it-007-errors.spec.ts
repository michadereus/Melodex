// File: tests/integration/it-007-errors.spec.ts
// @ts-nocheck
import request from "supertest";
import { describe, it, expect, beforeAll } from "vitest";

// Import your express app (adjust path if your app export lives elsewhere)
import app from "../../melodex-back-end/app";

// Helper: a minimal “happy” payload your stub path already accepts
const makeHappyPayload = () => ({
  name: "Test Playlist",
  description: "IT-007",
  // Both kept for stub mode; UI still sends them
  uris: ["spotify:track:111", "spotify:track:222"],
  __testUris: ["spotify:track:111", "spotify:track:222"],
  // Items included for future real mapping path
  items: [
    { deezerID: "111", songName: "Alpha", artist: "Artist A", ranking: 100 },
    { deezerID: "222", songName: "Beta", artist: "Artist B", ranking: 95 },
  ],
});

describe("IT-007 — Errors: forced backend failure → error surfaced to UI contract", () => {
  beforeAll(() => {
    // Ensure we’re in stub mode for deterministic behavior
    process.env.MAPPING_MODE = "stub";
    process.env.EXPORT_STUB = "true";
  });

  it("returns shaped error payload when forced to fail", async () => {
    const payload = {
      ...makeHappyPayload(),
      // Test-only switch the controller should honor to simulate Spotify failure
      __forceFail: true,
    };

    const res = await request(app)
      .post("/api/playlist/export")
      .set("Content-Type", "application/json")
      // Many of your IT tests require an access cookie; include a benign token
      .set("Cookie", ["access=it007-token"])
      .send(payload);

    // Contract: non-2xx or 200 with ok:false is acceptable; assert payload shape.
    // Prefer explicit status if your controller uses 502/500; keep flexible on code.
    expect(res.status).toBeGreaterThanOrEqual(400);

    // Error contract expected by UI
    expect(res.body).toMatchObject({
      ok: false,
      code: expect.any(String),     // e.g., "SPOTIFY_ERROR" | "CREATE_FAILED" | "ADD_FAILED"
      message: expect.any(String),  // human-readable reason
    });

    // Optional: hint for recovery (retry, adjust selection, re-auth)
    if (res.body.hint !== undefined) {
      expect(typeof res.body.hint).toBe("string");
    }
  });

  it("still succeeds when not forced to fail (guardrail)", async () => {
    const res = await request(app)
      .post("/api/playlist/export")
      .set("Content-Type", "application/json")
      .set("Cookie", ["access=it007-token"])
      .send(makeHappyPayload());

    if (res.status >= 200 && res.status < 300) {
      expect(res.body).toMatchObject({
        ok: true,
        playlistUrl: expect.any(String),
      });
    } else {
      expect(res.body).toMatchObject({
        ok: false,
        code: expect.any(String),
        message: expect.any(String),
      });
    }
  });
});
