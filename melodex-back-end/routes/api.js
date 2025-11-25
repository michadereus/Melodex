// melodex-back-end/routes/api.js
const express = require('express');

// ---- API router (/api/**) ----
const apiRouter = express.Router();
const UserSongsController = require('../controllers/UserSongsController');
const {
  requireSpotifyAuth,
  exportPlaylist,
} = require("../controllers/AuthController");

// songs
apiRouter.post('/user-songs/new',         UserSongsController.getNewSongsForUser);
apiRouter.post('/user-songs/rerank',      UserSongsController.getReRankSongsForUser);
apiRouter.post('/user-songs/upsert',      UserSongsController.upsertUserSong);
apiRouter.post('/user-songs/ranked',      UserSongsController.getRankedSongsForUser);
apiRouter.post('/user-songs/deezer-info', UserSongsController.getDeezerInfo);
apiRouter.post('/user-songs/rehydrate',   UserSongsController.rehydrateSongMetadata);

// export (mounted as POST /api/playlist/export)
apiRouter.post('/playlist/export', requireSpotifyAuth, exportPlaylist);

// auth 
const authRouter = express.Router();
const AuthController = require('../controllers/AuthController');
authRouter.get('/auth/start',    AuthController.start);
authRouter.get('/auth/callback', AuthController.callback);
authRouter.get('/auth/session',  AuthController.session);
authRouter.post('/auth/revoke',  AuthController.revoke); 
authRouter.post('/auth/refresh', AuthController.refresh);
authRouter.post(
  "/auth/debug/spotify-create",
  AuthController.debugSpotifyCreate
);

module.exports = { apiRouter, authRouter };
