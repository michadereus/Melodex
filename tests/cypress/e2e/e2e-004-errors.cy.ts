// tests/cypress/e2e/e2e-004-errors.cy.ts
// @ts-nocheck

describe("E2E-004 — Backend failure → progress shows error state", () => {
  const ranked = [
    {
      _id: "a1",
      deezerID: "111",
      songName: "Alpha",
      artist: "Artist A",
      ranking: 100,
      albumCover: "/placeholder-cover.png",
      previewURL: "https://foo.example/stream.mp3?hdnea=exp=1999999999~acl=/*",
      spotifyUri: "spotify:track:111",
    },
    {
      _id: "b2",
      deezerID: "222",
      songName: "Beta",
      artist: "Artist B",
      ranking: 95,
      albumCover: "/placeholder-cover.png",
      previewURL: "https://foo.example/stream.mp3?hdnea=exp=1999999999~acl=/*",
      spotifyUri: "spotify:track:222",
    },
  ];

  beforeEach(() => {
    cy.viewport(1440, 900);

    // Stub auth/session defensively; Rankings bypasses this in E2E harness,
    // but if it ever fires we want a stable response.
    cy.intercept("GET", "**/auth/session", {
      statusCode: 200,
      body: { connected: true },
    }).as("authSession");

    // Guard: we should not hit /auth/start on this path.
    cy.intercept("GET", "**/auth/start", () => {
      throw new Error("Unexpected /auth/start during E2E-004.");
    });

    // Export: first call fails with 502 + guidance, second call succeeds.
    let exportCalls = 0;
    cy.intercept(
      {
        method: "POST",
        url: /\/(api\/)?playlist\/export(?:\?.*)?$/,
      },
      (req) => {
        exportCalls += 1;

        if (exportCalls === 1) {
          // Simulated backend failure with shaped envelope
          return req.reply({
            statusCode: 502,
            body: {
              ok: false,
              code: "SPOTIFY_ERROR",
              message: "Simulated failure for E2E-004",
              hint: "Please retry or adjust your selection.",
            },
          });
        }

        // Success on retry
        return req.reply({
          statusCode: 200,
          body: {
            ok: true,
            playlistUrl: "https://open.spotify.com/playlist/e2e004-retry-ok",
          },
        });
      }
    ).as("exportCall");

    // Optional: quiet any rehydrate chatter (same pattern as other E2Es)
    cy.intercept(
      {
        method: "POST",
        url: /\/(api\/)?user-songs\/rehydrate(?:\?.*)?$/,
      },
      { statusCode: 204 }
    );

    cy.visit("/rankings", {
      onBeforeLoad(win) {
        // Bypass auth requirement in UserContext
        (win as any).__E2E_REQUIRE_AUTH__ = false;

        // Keep same-origin API root (Rankings will tack on /api as needed)
        (win as any).__API_BASE__ = win.location.origin;

        // Seed ranked songs so Rankings renders cards immediately
        (win as any).__TEST_RANKED__ = ranked;
      },
    });

    // Cards render from injected data
    cy.get('[data-testid="song-card"]', { timeout: 12000 }).should(
      "have.length.at.least",
      1
    );
  });

  it("shows loading, then a user-visible error banner with recovery guidance", () => {
    // Enter selection mode
    cy.get('[data-testid="export-spotify-cta"]', { timeout: 8000 }).click();
    cy.get('[data-testid="selection-mode-root"]').should("exist");

    // Ensure at least one selected (don’t assume auto-seed if it ever changes)
    cy.get('[data-testid="selection-summary"]').then(($el) => {
      const count = Number($el.attr("data-count") || "0");
      if (!Number.isFinite(count) || count === 0) {
        cy.get('input[type="checkbox"][data-testid^="song-checkbox-"]')
          .first()
          .check({ force: true });
        cy.get('[data-testid="selection-summary"][data-count!="0"]', {
          timeout: 8000,
        }).should("exist");
      }
    });

    // First export -> fails, shows error state + guidance
    cy.get('[data-testid="export-confirm"]').as("confirm");
    cy.get("@confirm").should("be.enabled").click();

    // Wait for the first export call to complete
    cy.wait("@exportCall", { timeout: 15000 })
      .its("response.statusCode")
      .should("eq", 502);

    // Progress readout appears
    cy.get('[data-testid="export-progress"]', { timeout: 8000 })
      .should("exist")
      .and("contain.text", "Creating");

    // Error banner appears (shaped message + recovery hint)
    cy.get('[data-testid="export-error"]', { timeout: 8000 }).within(() => {
      cy.contains(/simulated failure for e2e-004/i);
      cy.contains(/retry|try again|adjust/i);
    });

    // Retry -> success path
    cy.get('[data-testid="export-retry"]').click();

    // Second export resolves with ok:true + playlistUrl
    cy.wait("@exportCall", { timeout: 15000 })
      .its("response.statusCode")
      .should("eq", 200);

    // Success link rendered and wired to the retry URL
    cy.get('[data-testid="export-success-link"]', { timeout: 8000 }).should(
      "have.attr",
      "href",
      "https://open.spotify.com/playlist/e2e004-retry-ok"
    );

    cy.get('[data-testid="export-progress"]').should("not.exist");
    cy.get('[data-testid="export-confirm"]').should("be.disabled");
  });
});
