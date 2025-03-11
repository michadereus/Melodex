// RankedSongsService.js
// Combines rankings and song data for ranked songs endpoint

const RankingsController = require('../controllers/RankingsController');
const SongsController = require('../controllers/SongsController');

class RankedSongsService {
  // POST /api/ranked-songs
  // Retrieves full song details for a user's ranked songs
  static async getRankedSongs(req, res) {
    const { uID } = req.body;
    try {
      // Step 1: Fetch deezerIDs and ratings from rankings
      const rankedData = await RankingsController.getRankedDeezerIDs(uID);
      const deezerIDs = rankedData.map(item => item.deezerID);

      // Step 2: Fetch song details using deezerIDs
      const songs = await SongsController.getSongsByDeezerIDs(deezerIDs);

      // Combine ratings with song details
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