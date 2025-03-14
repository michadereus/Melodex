class UserSongsController {
  static async getGlobalSongs(req, res) {
    res.status(410).json({ message: 'Deprecated endpoint' });
  }

  static async getNewSongsForUser(req, res) {
    res.status(410).json({ message: 'Deprecated endpoint' });
  }

  static async getReRankSongsForUser(req, res) {
    const { userID } = req.body;
    const db = req.app.locals.db;
    const reRankSongs = await db.collection('user_songs')
      .find({ userID, skipped: false })
      .toArray();
    res.status(200).json(reRankSongs);
  }

  static async upsertUserSong(req, res) {
    const { userID, deezerID, ranking, skipped, songName, artist, genre, albumCover, previewURL } = req.body;
    const db = req.app.locals.db;

    const userSongData = {
      userID,
      deezerID,
      songName: songName || "Unknown Song",
      artist: artist || "Unknown Artist",
      genre: genre || "unknown",
      albumCover: albumCover || "",
      previewURL: previewURL || "",
      ranking,
      skipped,
    };

    await db.collection('user_songs').updateOne(
      { userID, deezerID },
      { $set: userSongData },
      { upsert: true }
    );
    res.status(200).json({ message: 'User song updated' });
  }

  static async getRankedSongsForUser(req, res) {
    const { userID } = req.body;
    const db = req.app.locals.db;
    const rankedSongs = await db.collection('user_songs')
      .find({ userID, skipped: false })
      .toArray();
    res.status(200).json(rankedSongs);
  }

  // New endpoint to fetch Deezer info (mocked for now)
  static async getDeezerInfo(req, res) {
    const { songs } = req.body; // Expecting an array of songs with deezerID
    try {
      // Mock Deezer API response
      const enrichedSongs = songs.map(song => ({
        ...song,
        deezerID: song.deezerID,
        previewURL: `https://mock.deezer.com/preview/${song.deezerID}.mp3`,
        albumCover: `https://mock.deezer.com/album/${song.deezerID}.jpg`,
      }));
      res.status(200).json(enrichedSongs);
    } catch (error) {
      console.error('Error fetching Deezer info:', error);
      res.status(500).json({ error: 'Failed to fetch Deezer info' });
    }
  }
}

module.exports = UserSongsController;