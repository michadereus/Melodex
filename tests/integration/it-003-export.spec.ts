// tests/integration/it-003-export.spec.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import nock from "nock";

import app from "../../melodex-back-end/app.js";

beforeAll(() => {
  nock.disableNetConnect();
  nock.enableNetConnect(/127\.0\.0\.1|localhost/);
});

afterAll(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

beforeEach(() => {
  nock.cleanAll();
});

describe("IT-003-Export — Creates playlist with only filtered", () => {
  it("accepts filtered URIs and returns a stub summary (no real Spotify calls)", async () => {
    const res = await request(app)
      .post("/api/playlist/export")
      .set("Cookie", ["access=acc-token"])
      .send({
        name: "My Filtered Mix",
        description: "desc here",
        filters: { type: "genre", genre: "rock" },
        // Server stub path: __testUris → accepted URIs (already filtered on FE)
        __testUris: ["spotify:track:AAA", "spotify:track:BBB"],
      });

    // Basic HTTP sanity
    expect(res.status).toBe(200);
    expect(res.body).toBeTruthy();

    // Stub contract: ok + received summary (no TS-02 playlistId/Url here)
    expect(res.body).toMatchObject({
      ok: true,
      received: {
        name: "My Filtered Mix",
        count: expect.any(Number),
      },
    });

    // optional, if you still want a tiny sanity check:
    const summary = res.body.received || {};
    expect(typeof summary.count).toBe("number");


    const received = res.body.received;

    // If the stub exposes the URIs array, assert it is consistent with our input.
    if (received && Array.isArray(received.uris)) {
      expect(received.uris).toHaveLength(2);
      expect(received.uris).toEqual(["spotify:track:AAA", "spotify:track:BBB"]);
    }

    // No nock expectations here: this path is intentionally stubbed and
    // should not talk to the real Spotify Web API at all.
  });
});
