// SongsController.js
// Handles direct MongoDB operations for the 'songs' collection

class SongsController {
  // GET /api/all-songs
  // Retrieves all songs from the songs collection
  static async getAllSongs(req, res) {
    try {
      // TODO: Implement MongoDB query to fetch all songs
      const songs = []; // Placeholder: Replace with actual query result
      res.status(200).json(songs);
    } catch (error) {
      console.error('Error fetching all songs:', error);
      res.status(500).json({ error: 'Failed to fetch songs' });
    }
  }

  // POST /api/songs
  // Adds a new song to the songs collection
  static async addSong(req, res) {
    const songData = req.body; // { deezerID, title, artist, albumCover, previewLink, genre }
    try {
      // TODO: Check for duplicate deezerID and insert into songs collection
      // Example: await db.collection('songs').insertOne(songData);
      res.status(201).json({ message: 'Song added successfully' });
    } catch (error) {
      console.error('Error adding song:', error);
      res.status(500).json({ error: 'Failed to add song' });
    }
  }

  // Helper function: Fetches songs by an array of deezerIDs
  // Used by RankedSongsService
  static async getSongsByDeezerIDs(deezerIDs) {
    try {
      // TODO: Implement MongoDB query to fetch songs where deezerID is in deezerIDs array
      // Example: await db.collection('songs').find({ deezerID: { $in: deezerIDs } }).toArray();
      const songs = []; // Placeholder: Replace with actual query result
      return songs;
    } catch (error) {
      console.error('Error fetching songs by deezerIDs:', error);
      throw error;
    }
  }
}

module.exports = SongsController;