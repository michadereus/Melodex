// routes/api.js
// Defines API routes for Melodex backend

const express = require('express');
const router = express.Router();

const SongsController = require('../controllers/SongsController');
const SeenSongsController = require('../controllers/SeenSongsController');
const RankingsController = require('../controllers/RankingsController');
const SongGenerationService = require('../services/SongGenerationService');
const RankedSongsService = require('../services/RankedSongsService');

// Songs routes
router.get('/all-songs', SongsController.getAllSongs);
router.post('/songs', SongsController.addSong);

// Seen songs route
router.post('/seen-songs', SeenSongsController.updateSeenSongs);

// Rankings route
router.post('/rankings', RankingsController.upsertRanking);

// Service routes
router.post('/generate-songs', SongGenerationService.generateNewSongs);
router.post('/ranked-songs', RankedSongsService.getRankedSongs);
router.post('/songs-by-deezer-ids', SongsController.getSongsByDeezerIDsRoute);

module.exports = router;