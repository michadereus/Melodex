// tests/integration/it-014-export-manual-stub.spec.ts

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../melodex-back-end/app";

describe("IT-014 — Manual export uses stub path when __testUris is absent", () => {
  beforeAll(() => {
    // Explicitly force stub mode for this test.
    // Any value except "off" keeps stub behavior enabled.
    process.env.EXPORT_STUB = "on";
    // Ensure mapping stays in stub as well; avoids real lookups.
    process.env.MAPPING_MODE = "stub";
  });

  it("returns a TS-02/TS-03 style stub envelope for a normal export payload (no __testUris)", async () => {
    const res = await request(app)
      .post("/api/playlist/export")
      // Satisfy requireSpotifyAuth
      .set("Cookie", "access=test-access-token")
      .send({
        name: "Melodex DEF-005 Stub Test",
        description: "Integration: manual export without __testUris",
        uris: [
          "spotify:track:TEST1",
          "spotify:track:TEST2",
          "spotify:track:TEST3",
        ],
        items: [
          {
            deezerID: "821100262",
            songName: "Black Betty",
            artist: "Ram Jam",
            ranking: 1,
          },
          {
            deezerID: "104760756",
            songName: "I Want It That Way",
            artist: "Backstreet Boys",
            ranking: 2,
          },
          {
            deezerID: "561856742",
            songName: "Dancing On My Own",
            artist: "Robyn",
            ranking: 3,
          },
        ],
        filters: {
          genre: "pop",
          subgenre: "all",
          decade: "all",
        },
      });

    // HTTP status
    expect(res.status).toBe(200);

    // Envelope: stubbed success, TS-02/TS-03 style
    expect(res.body).toMatchObject({
      ok: true,
      playlistId: "pl_stub",
      playlistUrl: "https://open.spotify.com/playlist/pl_stub",
      skipped: [],
      failed: [],
    });

    // kept should echo our provided URIs exactly
    expect(Array.isArray(res.body.kept)).toBe(true);
    expect(res.body.kept).toEqual([
      "spotify:track:TEST1",
      "spotify:track:TEST2",
      "spotify:track:TEST3",
    ]);

    // Guard against leaking legacy / test-only fields
    expect(res.body).not.toHaveProperty("__testUris");
    expect(res.body).not.toHaveProperty("added");
    expect(res.body).not.toHaveProperty("received");
  });
});
