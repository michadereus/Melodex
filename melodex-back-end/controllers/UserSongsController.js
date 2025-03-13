class UserSongsController {
  static async getGlobalSongs(req, res) {
    const db = req.app.locals.db;
    const globalSongs = await db.collection('user_songs').find({ userID: "global" }).toArray();
    res.status(200).json(globalSongs);
  }

  static async getNewSongsForUser(req, res) {
    const { userID } = req.body;
    const db = req.app.locals.db;
    try {
      // Use distinct directly on the collection
      const userInteractedDeezerIDs = await db.collection('user_songs')
        .distinct('deezerID', { userID });
      const newSongs = await db.collection('user_songs')
        .find({
          userID: "global",
          deezerID: { $nin: userInteractedDeezerIDs },
        })
        .toArray();
      res.status(200).json(newSongs);
    } catch (error) {
      console.error('Error in getNewSongsForUser:', error);
      res.status(500).json({ error: 'Failed to fetch new songs' });
    }
  }

  static async getReRankSongsForUser(req, res) {
    const { userID } = req.body;
    const db = req.app.locals.db;
    const reRankSongs = await db.collection('user_songs')
      .find({
        userID,
        skipped: false,
      })
      .toArray();
    res.status(200).json(reRankSongs);
  }

  static async upsertUserSong(req, res) {
    const { userID, deezerID, ranking, skipped, songName, artist, genre, albumCover, previewURL } = req.body;
    const db = req.app.locals.db;

    if (userID === "global") {
      const globalSongData = {
        userID,
        deezerID,
        songName,
        artist,
        genre: genre || "unknown",
        albumCover: albumCover || "",
        previewURL: previewURL || "",
        ranking,
        skipped: skipped || false,
      };
      await db.collection('user_songs').updateOne(
        { userID, deezerID },
        { $set: globalSongData },
        { upsert: true }
      );
      return res.status(200).json({ message: 'Global song updated' });
    }

    const globalSong = await db.collection('user_songs').findOne({ userID: "global", deezerID });
    if (!globalSong) {
      return res.status(404).json({ error: 'Global song not found' });
    }

    const userSongData = {
      userID,
      deezerID,
      songName: globalSong.songName,
      artist: globalSong.artist,
      genre: globalSong.genre || "unknown",
      albumCover: globalSong.albumCover || "",
      previewURL: globalSong.previewURL || "",
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
      .find({
        userID,
        skipped: false,
      })
      .toArray();
    res.status(200).json(rankedSongs);
  }
}

module.exports = UserSongsController;