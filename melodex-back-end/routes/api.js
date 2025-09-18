// melodex-back-end/routes/api.js
const express = require('express');
const router = express.Router();
const UserSongsController = require('../controllers/UserSongsController');

// User songs endpoints
router.post('/user-songs/new', UserSongsController.getNewSongsForUser);
router.post('/user-songs/rerank', UserSongsController.getReRankSongsForUser);
router.post('/user-songs/upsert', UserSongsController.upsertUserSong);
router.post('/user-songs/ranked', UserSongsController.getRankedSongsForUser);
router.post('/user-songs/deezer-info', UserSongsController.getDeezerInfo); // New endpoint
router.post('/user-songs/rehydrate', UserSongsController.rehydrateSongMetadata);

module.exports = router;