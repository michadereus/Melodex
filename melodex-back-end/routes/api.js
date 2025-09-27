// melodex-back-end/routes/api.js
const express = require('express');

// ---- API router (/api/**) ----
const apiRouter = express.Router();
const UserSongsController = require('../controllers/UserSongsController');

apiRouter.post('/user-songs/new', UserSongsController.getNewSongsForUser);
apiRouter.post('/user-songs/rerank', UserSongsController.getReRankSongsForUser);
apiRouter.post('/user-songs/upsert', UserSongsController.upsertUserSong);
apiRouter.post('/user-songs/ranked', UserSongsController.getRankedSongsForUser);
apiRouter.post('/user-songs/deezer-info', UserSongsController.getDeezerInfo);
apiRouter.post('/user-songs/rehydrate', UserSongsController.rehydrateSongMetadata);

// ---- Auth router (top-level /auth/**) ----
const authRouter = express.Router();
const AuthController = require('../controllers/AuthController');

// Start OAuth (state + PKCE)
authRouter.get('/auth/start', AuthController.start);
// Callback (validate state, exchange code, set cookies, redirect to /rankings)
authRouter.get('/auth/callback', AuthController.callback);

module.exports = { apiRouter, authRouter };
