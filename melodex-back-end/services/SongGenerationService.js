// backend/services/SongGenerationService.js
const SeenSongsController = require('../controllers/SeenSongsController');
const SongsController = require('../controllers/SongsController');

class SongGenerationService {
  static async generateNewSongs(req, res) {
  const { uID } = req.body;
  try {
    const seenTitles = await SeenSongsController.getSeenSongTitles(req, uID); // Array of deezerIDs
    const db = req.app.locals.db;
    const allSongs = await db.collection('songs').find().toArray();
    const newSongs = allSongs.filter(song => !seenTitles.includes(song.deezerID)); // Filter by deezerID
    res.status(200).json(newSongs);
  } catch (error) {
    console.error('Error generating new songs:', error);
    res.status(500).json({ error: 'Failed to generate songs' });
  }
}
}

module.exports = SongGenerationService;