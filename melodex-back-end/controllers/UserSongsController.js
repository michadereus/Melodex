class UserSongsController {
  static async getGlobalSongs(req, res) {
    res.status(410).json({ message: 'Deprecated endpoint' });
  }

  static async getNewSongsForUser(req, res) {
    const { userID } = req.body;
    const db = req.app.locals.db;
    const hardcodedSongs = [
      { deezerID: "001", songName: "Song 1", artist: "Artist 1", genre: "unknown", albumCover: "https://mock.deezer.com/album/001.jpg", previewURL: "https://mock.deezer.com/preview/001.mp3", ranking: null, skipped: false },
      { deezerID: "002", songName: "Song 2", artist: "Artist 2", genre: "unknown", albumCover: "https://mock.deezer.com/album/002.jpg", previewURL: "https://mock.deezer.com/preview/002.mp3", ranking: null, skipped: false },
      { deezerID: "003", songName: "Song 3", artist: "Artist 3", genre: "unknown", albumCover: "https://mock.deezer.com/album/003.jpg", previewURL: "https://mock.deezer.com/preview/003.mp3", ranking: null, skipped: false },
      { deezerID: "004", songName: "Song 4", artist: "Artist 4", genre: "unknown", albumCover: "https://mock.deezer.com/album/004.jpg", previewURL: "https://mock.deezer.com/preview/004.mp3", ranking: null, skipped: false },
      { deezerID: "005", songName: "Song 5", artist: "Artist 5", genre: "unknown", albumCover: "https://mock.deezer.com/album/005.jpg", previewURL: "https://mock.deezer.com/preview/005.mp3", ranking: null, skipped: false },
      { deezerID: "006", songName: "Song 6", artist: "Artist 6", genre: "unknown", albumCover: "https://mock.deezer.com/album/006.jpg", previewURL: "https://mock.deezer.com/preview/006.mp3", ranking: null, skipped: false },
      { deezerID: "007", songName: "Song 7", artist: "Artist 7", genre: "unknown", albumCover: "https://mock.deezer.com/album/007.jpg", previewURL: "https://mock.deezer.com/preview/007.mp3", ranking: null, skipped: false },
      { deezerID: "008", songName: "Song 8", artist: "Artist 8", genre: "unknown", albumCover: "https://mock.deezer.com/album/008.jpg", previewURL: "https://mock.deezer.com/preview/008.mp3", ranking: null, skipped: false },
      { deezerID: "009", songName: "Song 9", artist: "Artist 9", genre: "unknown", albumCover: "https://mock.deezer.com/album/009.jpg", previewURL: "https://mock.deezer.com/preview/009.mp3", ranking: null, skipped: false },
      { deezerID: "010", songName: "Song 10", artist: "Artist 10", genre: "unknown", albumCover: "https://mock.deezer.com/album/010.jpg", previewURL: "https://mock.deezer.com/preview/010.mp3", ranking: null, skipped: false },
      { deezerID: "011", songName: "Song 11", artist: "Artist 11", genre: "unknown", albumCover: "https://mock.deezer.com/album/011.jpg", previewURL: "https://mock.deezer.com/preview/011.mp3", ranking: null, skipped: false },
      { deezerID: "012", songName: "Song 12", artist: "Artist 12", genre: "unknown", albumCover: "https://mock.deezer.com/album/012.jpg", previewURL: "https://mock.deezer.com/preview/012.mp3", ranking: null, skipped: false },
      { deezerID: "013", songName: "Song 13", artist: "Artist 13", genre: "unknown", albumCover: "https://mock.deezer.com/album/013.jpg", previewURL: "https://mock.deezer.com/preview/013.mp3", ranking: null, skipped: false },
      { deezerID: "014", songName: "Song 14", artist: "Artist 14", genre: "unknown", albumCover: "https://mock.deezer.com/album/014.jpg", previewURL: "https://mock.deezer.com/preview/014.mp3", ranking: null, skipped: false },
      { deezerID: "015", songName: "Song 15", artist: "Artist 15", genre: "unknown", albumCover: "https://mock.deezer.com/album/015.jpg", previewURL: "https://mock.deezer.com/preview/015.mp3", ranking: null, skipped: false },
      { deezerID: "016", songName: "Song 16", artist: "Artist 16", genre: "unknown", albumCover: "https://mock.deezer.com/album/016.jpg", previewURL: "https://mock.deezer.com/preview/016.mp3", ranking: null, skipped: false },
      { deezerID: "017", songName: "Song 17", artist: "Artist 17", genre: "unknown", albumCover: "https://mock.deezer.com/album/017.jpg", previewURL: "https://mock.deezer.com/preview/017.mp3", ranking: null, skipped: false },
      { deezerID: "018", songName: "Song 18", artist: "Artist 18", genre: "unknown", albumCover: "https://mock.deezer.com/album/018.jpg", previewURL: "https://mock.deezer.com/preview/018.mp3", ranking: null, skipped: false },
      { deezerID: "019", songName: "Song 19", artist: "Artist 19", genre: "unknown", albumCover: "https://mock.deezer.com/album/019.jpg", previewURL: "https://mock.deezer.com/preview/019.mp3", ranking: null, skipped: false },
      { deezerID: "020", songName: "Song 20", artist: "Artist 20", genre: "unknown", albumCover: "https://mock.deezer.com/album/020.jpg", previewURL: "https://mock.deezer.com/preview/020.mp3", ranking: null, skipped: false },
    ];
    try {
      console.log('Fetching user songs for:', userID);
      const userSongs = await db.collection('user_songs')
        .find({ userID }) // Include all songs (ranked or skipped)
        .toArray();
      console.log('User songs from DB:', userSongs);
      const userDeezerIDs = userSongs.map(song => song.deezerID);
      console.log('User deezerIDs:', userDeezerIDs);
      const newSongs = hardcodedSongs.filter(song => !userDeezerIDs.includes(song.deezerID));
      console.log('New songs after filter:', newSongs);
      res.status(200).json(newSongs);
    } catch (error) {
      console.error('Error fetching new songs:', error);
      res.status(500).json({ error: 'Failed to fetch new songs' });
    }
  }

  static async getReRankSongsForUser(req, res) {
    const { userID } = req.body;
    const db = req.app.locals.db;
    try {
      const rankedSongs = await db.collection('user_songs')
        .find({ userID, skipped: false })
        .toArray();
      if (rankedSongs.length < 2) {
        res.status(200).json([]); // Not enough songs to re-rank
      } else {
        // Shuffle the array and pick the first two songs
        const shuffled = rankedSongs.sort(() => 0.5 - Math.random());
        const randomPair = shuffled.slice(0, 2);
        console.log('Returning random pair:', randomPair.map(s => s.songName));
        res.status(200).json(randomPair); // Return only 2 songs
      }
    } catch (error) {
      console.error('Error fetching rerank songs:', error);
      res.status(500).json({ error: 'Failed to fetch rerank songs' });
    }
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

  static async getDeezerInfo(req, res) {
    const { songs } = req.body;
    try {
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