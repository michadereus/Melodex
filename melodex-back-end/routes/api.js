const express = require('express');
const router = express.Router();
const UserSongsController = require('../controllers/UserSongsController');

// User songs endpoints
router.get('/user-songs/global', UserSongsController.getGlobalSongs);
router.post('/user-songs/new', UserSongsController.getNewSongsForUser);
router.post('/user-songs/rerank', UserSongsController.getReRankSongsForUser);
router.post('/user-songs/upsert', UserSongsController.upsertUserSong);
router.post('/user-songs/ranked', UserSongsController.getRankedSongsForUser);

module.exports = router;