// backend/services/SongGenerationService.js
const SeenSongsController = require('../controllers/SeenSongsController');
const SongsController = require('../controllers/SongsController');

class SongGenerationService {
static async generateNewSongs(req, res) {
  const { uID } = req.body;
  try {
    const seenTitles = await SeenSongsController.getSeenSongTitles(req, uID);
    console.log('Seen titles:', seenTitles);
    const db = req.app.locals.db;
    const allSongs = await db.collection('songs').find().toArray();
    console.log('All songs:', allSongs.map(s => s.deezerID));
    const uniqueSongs = Array.from(
      new Map(allSongs.map(song => [song.deezerID, song])).values()
    );
    const newSongs = uniqueSongs.filter(song => !seenTitles.includes(song.deezerID));
    console.log('New songs:', newSongs.map(s => s.deezerID));
    res.status(200).json(newSongs);
  } catch (error) {
    console.error('Error generating new songs:', error);
    res.status(500).json({ error: 'Failed to generate songs' });
  }
}
}

module.exports = SongGenerationService;