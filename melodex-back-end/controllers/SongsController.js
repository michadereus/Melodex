// backend/controllers/SongsController.js
class SongsController {
  static async getAllSongs(req, res) {
    const db = req.app.locals.db;
    try {
      const songs = await db.collection('songs').find().toArray();
      res.status(200).json(songs);
    } catch (error) {
      console.error('Error fetching all songs:', error);
      res.status(500).json({ error: 'Failed to fetch songs' });
    }
  }

  static async addSong(req, res) {
    const songData = req.body;
    const db = req.app.locals.db;
    try {
      const existingSong = await db.collection('songs').findOne({ deezerID: songData.deezerID });
      if (existingSong) {
        return res.status(400).json({ error: 'Song with this deezerID already exists' });
      }
      await db.collection('songs').insertOne(songData);
      res.status(201).json({ message: 'Song added successfully' });
    } catch (error) {
      console.error('Error adding song:', error);
      res.status(500).json({ error: 'Failed to add song' });
    }
  }

  static async getSongsByDeezerIDs(req, deezerIDs) { // Add req parameter
    const db = req.app.locals.db;
    try {
      const songs = await db.collection('songs')
        .find({ deezerID: { $in: deezerIDs } })
        .toArray();
      return songs;
    } catch (error) {
      console.error('Error fetching songs by deezerIDs:', error);
      throw error;
    }
  }
}

module.exports = SongsController;