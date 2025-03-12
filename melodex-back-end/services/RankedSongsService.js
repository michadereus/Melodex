// backend/services/RankedSongsService.js
const RankingsController = require('../controllers/RankingsController');
const SongsController = require('../controllers/SongsController');

class RankedSongsService {
  static async getRankedSongs(req, res) {
    const { uID } = req.body;
    try {
      const rankedData = await RankingsController.getRankedDeezerIDs(req, uID);
      const deezerIDs = rankedData.map(item => item.deezerID);
      const songs = await SongsController.getSongsByDeezerIDs(req, deezerIDs); // Helper call
      const rankedSongs = songs.map(song => {
        const ranking = rankedData.find(r => r.deezerID === song.deezerID);
        return { ...song, rating: ranking ? ranking.rating : null };
      });
      res.status(200).json(rankedSongs);
    } catch (error) {
      console.error('Error fetching ranked songs:', error);
      res.status(500).json({ error: 'Failed to fetch ranked songs' });
    }
  }
}

module.exports = RankedSongsService;