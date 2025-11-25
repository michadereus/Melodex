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

  it("returns a stub summary envelope for a normal export payload (no __testUris)", async () => {
    const uris = [
      "spotify:track:TEST1",
      "spotify:track:TEST2",
      "spotify:track:TEST3",
    ];

    const res = await request(app)
      .post("/api/playlist/export")
      // Satisfy requireSpotifyAuth
      .set("Cookie", "access=test-access-token")
      .send({
        name: "Melodex DEF-005 Stub Test",
        description: "Integration: manual export without __testUris",
        uris,
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
    expect(res.headers["content-type"]).toMatch(/json/i);

    // Envelope: stubbed success with a summary-style payload.
    // In stub mode we don't require TS-02 playlistId/Url; we just assert the
    // high-level "ok" plus a stable summary contract.
    expect(res.body).toMatchObject({
      ok: true,
      received: {
        name: "Melodex DEF-005 Stub Test",
        count: uris.length,
      },
    });

    // If the stub echoes kept URIs, they must match the request;
    // otherwise it's fine for kept to be absent or empty.
    const kept = Array.isArray(res.body.kept) ? res.body.kept : [];
    if (kept.length) {
      expect(kept).toEqual(uris);
    }

    // Guard against leaking legacy / test-only fields
    expect(res.body).not.toHaveProperty("__testUris");
    expect(res.body).not.toHaveProperty("added");
  });
});
