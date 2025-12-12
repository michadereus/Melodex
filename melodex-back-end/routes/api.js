// melodex-back-end/routes/api.js
const express = require("express");

// ---- API router (/api/**) ----
const apiRouter = express.Router();
const UserSongsController = require("../controllers/UserSongsController");
const AuthController = require("../controllers/AuthController");

// Debug: what actually got exported?
console.log(
  "[routes/api] UserSongsController keys:",
  Object.keys(UserSongsController || {})
);
console.log(
  "[routes/api] AuthController keys:",
  Object.keys(AuthController || {})
);

function ensureHandler(fn, label) {
  if (typeof fn === "function") return fn;
  console.error(
    `[routes/api] MISSING handler for ${label} — wiring fallback 500 handler`
  );
  return (req, res) => {
    return res.status(500).json({
      error: `Handler missing for ${label} on server`,
    });
  };
}

// Auth wrappers
const requireSpotifyAuth = ensureHandler(
  AuthController.requireSpotifyAuth,
  "AuthController.requireSpotifyAuth"
);
const exportPlaylist = ensureHandler(
  AuthController.exportPlaylist,
  "AuthController.exportPlaylist"
);

// songs
apiRouter.post(
  "/user-songs/new",
  ensureHandler(
    UserSongsController.getNewSongsForUser,
    "UserSongsController.getNewSongsForUser"
  )
);
apiRouter.post(
  "/user-songs/rerank",
  ensureHandler(
    UserSongsController.getReRankSongsForUser,
    "UserSongsController.getReRankSongsForUser"
  )
);
apiRouter.post(
  "/user-songs/upsert",
  ensureHandler(
    UserSongsController.upsertUserSong,
    "UserSongsController.upsertUserSong"
  )
);
apiRouter.post(
  "/user-songs/ranked",
  ensureHandler(
    UserSongsController.getRankedSongsForUser,
    "UserSongsController.getRankedSongsForUser"
  )
);
apiRouter.post(
  "/user-songs/deezer-info",
  ensureHandler(
    UserSongsController.getDeezerInfo,
    "UserSongsController.getDeezerInfo"
  )
);
apiRouter.post(
  "/user-songs/rehydrate",
  ensureHandler(
    UserSongsController.rehydrateSongMetadata,
    "UserSongsController.rehydrateSongMetadata"
  )
);

// export (mounted as POST /api/playlist/export)
apiRouter.post("/playlist/export", requireSpotifyAuth, exportPlaylist);

// auth
const authRouter = express.Router();
authRouter.get(
  "/auth/start",
  ensureHandler(AuthController.start, "AuthController.start")
);
authRouter.get(
  "/auth/callback",
  ensureHandler(AuthController.callback, "AuthController.callback")
);
authRouter.get(
  "/auth/session",
  ensureHandler(AuthController.session, "AuthController.session")
);
authRouter.post(
  "/auth/revoke",
  ensureHandler(AuthController.revoke, "AuthController.revoke")
);
authRouter.post(
  "/auth/refresh",
  ensureHandler(AuthController.refresh, "AuthController.refresh")
);
authRouter.post(
  "/auth/debug/spotify-create",
  ensureHandler(
    AuthController.debugSpotifyCreate,
    "AuthController.debugSpotifyCreate"
  )
);

module.exports = { apiRouter, authRouter };
