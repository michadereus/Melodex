// tests/cypress/e2e/e2e-010-real-url.cy.ts
// E2E-010 — ExportRealUrl: success UI wires playlistUrl from backend

describe("E2E-010 — ExportRealUrl: success UI shows backend playlistUrl", () => {
  const playlistUrl = "https://open.spotify.com/playlist/e2e-010-ut-real-url";

  const songs = [
    {
      _id: "e10-1",
      songName: "Alpha Echo",
      artist: "Test Artist 1",
      deezerID: 10101,
      ranking: 2100,
      albumCover: "/test/e10-cover1.jpg",
      previewURL: "https://cdns-preview-1.aac?hdnea=exp=9999999999~acl=/*",
    },
    {
      _id: "e10-2",
      songName: "Bravo Foxtrot",
      artist: "Test Artist 2",
      deezerID: 20202,
      ranking: 2000,
      albumCover: "/test/e10-cover2.jpg",
      previewURL: "https://cdns-preview-2.aac?hdnea=exp=9999999999~acl=/*",
    },
    {
      _id: "e10-3",
      songName: "Charlie Golf",
      artist: "Test Artist 3",
      deezerID: 30303,
      ranking: 1950,
      albumCover: "/test/e10-cover3.jpg",
      previewURL: "https://cdns-preview-3.aac?hdnea=exp=9999999999~acl=/*",
    },
  ];

  const parseBody = (b: any) => (typeof b === "string" ? JSON.parse(b) : b);

  beforeEach(() => {
    cy.viewport(1440, 900);

    // Auth/session fires when entering export flow
    cy.intercept("GET", "**/auth/session", {
      statusCode: 200,
      body: { connected: true },
    }).as("authSession");

    // Guard: no auth/start redirect expected in this happy path
    cy.intercept("GET", "**/auth/start", () => {
      throw new Error("Unexpected /auth/start during E2E-010 happy path.");
    });

    // Ranked songs (match with or without /api)
    cy.intercept(
      { method: "POST", url: /\/(api\/)?user-songs\/ranked(?:\?.*)?$/ },
      (req) => {
        const body = parseBody(req.body ?? "{}");
        // We don’t care about the filter here — keep it simple and always return the same ranked set.
        if (body && body.filter) {
          // no-op, just acknowledging the field
        }

        req.reply({ statusCode: 200, body: songs });
      }
    ).as("rankedSongs");

    // Export (match with or without /api) — stubbed success with a real-looking URL.
    cy.intercept(
      { method: "POST", url: /\/(api\/)?playlist\/export(?:\?.*)?$/ },
      (req) => {
        const body = parseBody(req.body ?? "{}");

        // Light sanity check to keep this aligned with E2E-001 contract,
        // but avoid coupling to any extra fields.
        expect(body).to.have.property("uris");
        expect(body.uris).to.be.an("array").and.not.to.be.empty;

        req.reply({
          statusCode: 200,
          body: {
            ok: true,
            playlistUrl,
          },
        });
      }
    ).as("exportCall");

    // Optional: quiet any rehydrate chatter
    cy.intercept(
      { method: "POST", url: /\/(api\/)?user-songs\/rehydrate(?:\?.*)?$/ },
      { statusCode: 204 }
    );

    cy.visit("/rankings", {
      onBeforeLoad(win) {
        // Standard E2E harness toggles: bypass auth guard, keep same-origin API root.
        (win as any).__E2E_REQUIRE_AUTH__ = false;
        (win as any).__API_BASE__ = win.location.origin;
      },
    });

    // Wait for ranked list to render
    cy.wait("@rankedSongs", { timeout: 15000 });
    cy.get("li.song-box", { timeout: 10000 }).should(
      "have.length",
      songs.length
    );
  });

  it("wires playlistUrl from export response into the success link", () => {
    cy.location("pathname", { timeout: 10000 }).should("eq", "/rankings");

    // Enter inline export flow (triggers GET /auth/session)
    cy.get('[data-testid="export-spotify-cta"]').should("be.visible").click();

    cy.contains(/Export to Spotify/i).should("be.visible");

    cy.wait("@authSession", { timeout: 10000 });

    // Confirm should be enabled with default inline selection and name/desc
    cy.get('[data-testid="export-confirm"]')
      .should("be.visible")
      .and("be.enabled")
      .click();

    // Backend export call happens once with our stubbed response
    cy.wait("@exportCall", { timeout: 15000 })
      .its("response.statusCode")
      .should("eq", 200);

    // No error banner should be shown in this clean success path
    cy.get('[data-testid="export-error"]').should("not.exist");

    // Success link is visible, and its href is exactly the playlistUrl we returned.
    cy.get('a[data-testid="export-success-link"]', { timeout: 10000 })
      .should("be.visible")
      .and("have.attr", "href", playlistUrl);

    // Confirm remains locked after success, consistent with E2E-001
    cy.get('[data-testid="export-confirm"]').should("be.disabled");
  });
});
