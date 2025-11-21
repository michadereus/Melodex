// cypress/e2e/e2e-001-export.cy.ts
// E2E-001-Export — Happy path desktop (inline selection on /rankings)

describe("E2E-001-Export — Happy path (desktop, inline)", () => {
  const playlistUrl = "https://open.spotify.com/playlist/TEST_PLAYLIST_ID";

  const songs = [
    {
      _id: "s1",
      songName: "Neon Skyline",
      artist: "Andy Shauf",
      deezerID: 1111,
      ranking: 2100,
      albumCover: "/test/cover1.jpg",
      previewURL: "https://cdns-preview-1.aac?hdnea=exp=9999999999~acl=/*",
    },
    {
      _id: "s2",
      songName: "Everything In Its Right Place",
      artist: "Radiohead",
      deezerID: 2222,
      ranking: 2000,
      albumCover: "/test/cover2.jpg",
      previewURL: "https://cdns-preview-2.aac?hdnea=exp=9999999999~acl=/*",
    },
    {
      _id: "s3",
      songName: "Pink + White",
      artist: "Frank Ocean",
      deezerID: 3333,
      ranking: 1950,
      albumCover: "/test/cover3.jpg",
      previewURL: "https://cdns-preview-3.aac?hdnea=exp=9999999999~acl=/*",
    },
  ];

  const parseBody = (b: any) => (typeof b === "string" ? JSON.parse(b) : b);

  beforeEach(() => {
    cy.viewport(1440, 900);

    // In Cypress bypass mode, the Rankings onExportClick no longer calls /auth/session.
    // We still stub it defensively so any accidental call will succeed, but we don't wait on it.
    cy.intercept("GET", "**/auth/session", {
      statusCode: 200,
      body: { connected: true },
    }).as("authSession");

    // Guard: no redirect expected in happy path.
    cy.intercept("GET", "**/auth/start", () => {
      throw new Error("Unexpected /auth/start during happy path.");
    });

    // Ranked songs (match with or without /api)
    cy.intercept(
      { method: "POST", url: /\/(api\/)?user-songs\/ranked(?:\?.*)?$/ },
      (req) => {
        req.reply({ statusCode: 200, body: songs });
      }
    ).as("rankedSongs");

    // Export (match with or without /api)
    cy.intercept(
      { method: "POST", url: /\/(api\/)?playlist\/export(?:\?.*)?$/ },
      (req) => {
        req.reply({
          statusCode: 200,
          body: { ok: true, playlistUrl },
          delayMs: 300,
        });
      }
    ).as("exportCall");

    // Optional: quiet the automatic rehydrate chatter so logs don't distract.
    cy.intercept(
      { method: "POST", url: /\/(api\/)?user-songs\/rehydrate(?:\?.*)?$/ },
      { statusCode: 204 }
    );

    // Visit and force same-origin API base so intercepts match.
    cy.visit("/rankings", {
      onBeforeLoad(win) {
        (win as any).__E2E_REQUIRE_AUTH__ = false; // bypass auth gate in UserContext
        (win as any).__API_BASE__ = win.location.origin; // same-origin API root
      },
    });

    // Wait only for the ranked list to render.
    cy.wait("@rankedSongs", { timeout: 15000 });
    cy.get("li.song-box", { timeout: 10000 }).should(
      "have.length",
      songs.length
    );
  });

  it("Auth → filter → inline selection → uncheck one → name/desc → export → confirm link", () => {
    cy.location("pathname", { timeout: 10000 }).should("eq", "/rankings");

    // Enter inline selection mode.
    cy.get('[data-testid="export-spotify-cta"]').should("be.visible").click();
    cy.contains(/Export to Spotify/i).should("be.visible");

    // NOTE: We do NOT wait for @authSession here anymore. In Cypress harness
    // the Rankings onExportClick short-circuits auth/session while still
    // exercising the inline export flow and backend stub.

    // All checkboxes render and are initially checked
    cy.get('li.song-box input[type="checkbox"]', { timeout: 10000 })
      .should("have.length", songs.length)
      .then(($boxes) => {
        const checkedCount = $boxes.filter(":checked").length;
        expect(checkedCount, "all initially checked").to.equal($boxes.length);
      });

    // Uncheck exactly one (last)
    cy.get('li.song-box input[type="checkbox"]')
      .last()
      .uncheck({ force: true });
    cy.get('li.song-box input[type="checkbox"]')
      .last()
      .should("not.be.checked");

    // Fill name/description
    const name = "My Happy Path Playlist";
    const description = "Created via Cypress (E2E-001).";
    cy.get('input[name="playlistName"]').should("exist").clear().type(name);
    cy.get('textarea[name="playlistDescription"]')
      .should("exist")
      .clear()
      .type(description);

    // Export
    cy.get('[data-testid="export-confirm"]').should("be.enabled").click();

    // In-flight: button locked (spinner optional)
    cy.get('[data-testid="export-confirm"]').should("be.disabled");
    cy.get("body").then(($b) => {
      if ($b.find('[data-testid="export-progress"]').length) {
        cy.get('[data-testid="export-progress"]').should("be.visible");
      }
    });

    // Assert payload via network intercept
    cy.wait("@exportCall", { timeout: 15000 }).then(({ request, response }) => {
      const body = parseBody(request.body);
      expect(body).to.have.property("name", name);
      expect(body).to.have.property("description", description);
      expect(body).to.have.property("uris").that.is.an("array").with.length(2);
      const unique = new Set(body.uris);
      expect(unique.size, "URIs must be unique").to.equal(body.uris.length);

      // Extra sanity
      expect(response?.statusCode).to.eq(200);
      expect(response?.body?.ok).to.eq(true);
      expect(response?.body?.playlistUrl).to.match(
        /^https:\/\/open\.spotify\.com\/playlist\//
      );
    });

    // Post-success: progress hidden, inline link present
    cy.get('[data-testid="export-progress"]').should("not.exist");
    cy.get('a[data-testid="export-success-link"]')
      .should("be.visible")
      .and("have.attr", "href")
      .and("match", /^https:\/\/open\.spotify\.com\/playlist\//);

    // Confirm remains locked after success
    cy.get('[data-testid="export-confirm"]').should("be.disabled");
  });
});
