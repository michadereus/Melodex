// melodex-back-end/controllers/UserSongsController.js
class UserSongsController {
  static async getNewSongsForUser(req, res) {
    const { userID } = req.body;
    const db = req.app.locals.db;
    const hardcodedSongs = [
      { deezerID: "001", songName: "Bohemian Rhapsody", artist: "Queen", genre: "unknown", albumCover: "https://mock.deezer.com/album/001.jpg", previewURL: "https://mock.deezer.com/preview/001.mp3", ranking: null, skipped: false },
      { deezerID: "002", songName: "Shape of You", artist: "Ed Sheeran", genre: "unknown", albumCover: "https://mock.deezer.com/album/002.jpg", previewURL: "https://mock.deezer.com/preview/002.mp3", ranking: null, skipped: false },
      { deezerID: "003", songName: "Billie Jean", artist: "Michael Jackson", genre: "unknown", albumCover: "https://mock.deezer.com/album/003.jpg", previewURL: "https://mock.deezer.com/preview/003.mp3", ranking: null, skipped: false },
      { deezerID: "004", songName: "Sweet Child O' Mine", artist: "Guns N' Roses", genre: "unknown", albumCover: "https://mock.deezer.com/album/004.jpg", previewURL: "https://mock.deezer.com/preview/004.mp3", ranking: null, skipped: false },
      { deezerID: "005", songName: "Rolling in the Deep", artist: "Adele", genre: "unknown", albumCover: "https://mock.deezer.com/album/005.jpg", previewURL: "https://mock.deezer.com/preview/005.mp3", ranking: null, skipped: false },
      { deezerID: "006", songName: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", genre: "unknown", albumCover: "https://mock.deezer.com/album/006.jpg", previewURL: "https://mock.deezer.com/preview/006.mp3", ranking: null, skipped: false },
      { deezerID: "007", songName: "Imagine", artist: "John Lennon", genre: "unknown", albumCover: "https://mock.deezer.com/album/007.jpg", previewURL: "https://mock.deezer.com/preview/007.mp3", ranking: null, skipped: false },
      { deezerID: "008", songName: "Smells Like Teen Spirit", artist: "Nirvana", genre: "unknown", albumCover: "https://mock.deezer.com/album/008.jpg", previewURL: "https://mock.deezer.com/preview/008.mp3", ranking: null, skipped: false },
      { deezerID: "009", songName: "Bad Guy", artist: "Billie Eilish", genre: "unknown", albumCover: "https://mock.deezer.com/album/009.jpg", previewURL: "https://mock.deezer.com/preview/009.mp3", ranking: null, skipped: false },
      { deezerID: "010", songName: "Hotel California", artist: "Eagles", genre: "unknown", albumCover: "https://mock.deezer.com/album/010.jpg", previewURL: "https://mock.deezer.com/preview/010.mp3", ranking: null, skipped: false },
      { deezerID: "011", songName: "Blinding Lights", artist: "The Weeknd", genre: "unknown", albumCover: "https://mock.deezer.com/album/011.jpg", previewURL: "https://mock.deezer.com/preview/011.mp3", ranking: null, skipped: false },
      { deezerID: "012", songName: "Stairway to Heaven", artist: "Led Zeppelin", genre: "unknown", albumCover: "https://mock.deezer.com/album/012.jpg", previewURL: "https://mock.deezer.com/preview/012.mp3", ranking: null, skipped: false },
      { deezerID: "013", songName: "Dancing Queen", artist: "ABBA", genre: "unknown", albumCover: "https://mock.deezer.com/album/013.jpg", previewURL: "https://mock.deezer.com/preview/013.mp3", ranking: null, skipped: false },
      { deezerID: "014", songName: "Lose Yourself", artist: "Eminem", genre: "unknown", albumCover: "https://mock.deezer.com/album/014.jpg", previewURL: "https://mock.deezer.com/preview/014.mp3", ranking: null, skipped: false },
      { deezerID: "015", songName: "Hey Jude", artist: "The Beatles", genre: "unknown", albumCover: "https://mock.deezer.com/album/015.jpg", previewURL: "https://mock.deezer.com/preview/015.mp3", ranking: null, skipped: false },
      { deezerID: "016", songName: "Viva La Vida", artist: "Coldplay", genre: "unknown", albumCover: "https://mock.deezer.com/album/016.jpg", previewURL: "https://mock.deezer.com/preview/016.mp3", ranking: null, skipped: false },
      { deezerID: "017", songName: "Thriller", artist: "Michael Jackson", genre: "unknown", albumCover: "https://mock.deezer.com/album/017.jpg", previewURL: "https://mock.deezer.com/preview/017.mp3", ranking: null, skipped: false },
      { deezerID: "018", songName: "Someone Like You", artist: "Adele", genre: "unknown", albumCover: "https://mock.deezer.com/album/018.jpg", previewURL: "https://mock.deezer.com/preview/018.mp3", ranking: null, skipped: false },
      { deezerID: "019", songName: "Wonderwall", artist: "Oasis", genre: "unknown", albumCover: "https://mock.deezer.com/album/019.jpg", previewURL: "https://mock.deezer.com/preview/019.mp3", ranking: null, skipped: false },
      { deezerID: "020", songName: "Shake It Off", artist: "Taylor Swift", genre: "unknown", albumCover: "https://mock.deezer.com/album/020.jpg", previewURL: "https://mock.deezer.com/preview/020.mp3", ranking: null, skipped: false },
    ];
    try {
      console.log('START getNewSongsForUser for userID:', userID);
      console.log('Fetching user songs from DB...');
      const userSongs = await db.collection('user_songs').find({ userID }).toArray();
      console.log('User songs from DB:', userSongs);
      const userDeezerIDs = userSongs.map(song => song.deezerID);
      console.log('User deezerIDs:', userDeezerIDs);
      const newSongs = hardcodedSongs.filter(song => !userDeezerIDs.includes(song.deezerID));
      console.log('New songs after filter:', newSongs);

      console.log('Calling enrichSongsWithDeezer with', newSongs.length, 'songs...');
      const enrichedSongs = await UserSongsController.enrichSongsWithDeezer(newSongs);
      console.log('Enriched songs returned:', enrichedSongs);
      console.log('END getNewSongsForUser, sending response with', enrichedSongs.length, 'songs...');
      res.status(200).json(enrichedSongs);
    } catch (error) {
      console.error('Error in getNewSongsForUser:', error.message, error.stack);
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
      console.log('Ranked songs for rerank:', rankedSongs);
      if (rankedSongs.length < 2) {
        res.status(200).json([]);
      } else {
        const shuffled = rankedSongs.sort(() => 0.5 - Math.random());
        const randomPair = shuffled.slice(0, 2);
        console.log('Random pair for rerank:', randomPair);
        res.status(200).json(randomPair);
      }
    } catch (error) {
      console.error('Error fetching rerank songs:', error);
      res.status(500).json({ error: 'Failed to fetch rerank songs' });
    }
  }

  static async upsertUserSong(req, res) {
    console.log('Received body at /api/user-songs/upsert:', req.body);
    const {
      userID,
      deezerID,
      opponentDeezerID,
      result,
      winnerSongName,
      winnerArtist,
      winnerGenre,
      winnerAlbumCover,
      winnerPreviewURL,
      loserSongName,
      loserArtist,
      loserGenre,
      loserAlbumCover,
      loserPreviewURL,
    } = req.body;
    const db = req.app.locals.db;
    const K = 32;

    try {
      console.log('Starting upsertUserSong for userID:', userID);

      // Fetch winner song
      console.log('Fetching song with userID:', userID, 'deezerID:', deezerID);
      let song = await db.collection('user_songs').findOne({ userID, deezerID });
      console.log('Found song:', song);
      if (!song) {
        song = {
          userID,
          deezerID,
          songName: winnerSongName || 'Unknown Song',
          artist: winnerArtist || 'Unknown Artist',
          genre: winnerGenre || 'unknown',
          albumCover: winnerAlbumCover || '',
          previewURL: winnerPreviewURL || '',
          ranking: 1200,
          skipped: false,
        };
        console.log('Created new song entry:', song);
      } else {
        if (winnerSongName) song.songName = winnerSongName;
        if (winnerArtist) song.artist = winnerArtist;
        if (winnerGenre) song.genre = winnerGenre;
        if (winnerAlbumCover) song.albumCover = winnerAlbumCover;
        if (winnerPreviewURL) song.previewURL = winnerPreviewURL;
        console.log('Updated existing song:', song);
      }

      // Fetch loser song
      console.log('Fetching opponent with userID:', userID, 'deezerID:', opponentDeezerID);
      let opponent = await db.collection('user_songs').findOne({ userID, deezerID: opponentDeezerID });
      console.log('Found opponent:', opponent);
      if (!opponent) {
        opponent = {
          userID,
          deezerID: opponentDeezerID,
          songName: loserSongName || 'Unknown Song',
          artist: loserArtist || 'Unknown Artist',
          genre: loserGenre || 'unknown',
          albumCover: loserAlbumCover || '',
          previewURL: loserPreviewURL || '',
          ranking: 1200,
          skipped: false,
        };
        console.log('Created new opponent entry:', opponent);
      } else {
        if (loserSongName) opponent.songName = loserSongName;
        if (loserArtist) opponent.artist = loserArtist;
        if (loserGenre) opponent.genre = loserGenre;
        if (loserAlbumCover) opponent.albumCover = loserAlbumCover;
        if (loserPreviewURL) opponent.previewURL = loserPreviewURL;
        console.log('Updated existing opponent:', opponent);
      }

      if (result && opponentDeezerID) {
        const R_A = song.ranking || 1200;
        const R_B = opponent.ranking || 1200;
        const E_A = 1 / (1 + Math.pow(10, (R_B - R_A) / 400));
        const E_B = 1 / (1 + Math.pow(10, (R_A - R_B) / 400));
        const S_A = result === 'win' ? 1 : 0;
        const S_B = result === 'win' ? 0 : 1;

        const newRatingA = Math.round(R_A + K * (S_A - E_A));
        const newRatingB = Math.round(R_B + K * (S_B - E_B));

        song.ranking = newRatingA;
        opponent.ranking = newRatingB;

        console.log('Calculated new ratings:', { newRatingA, newRatingB });

        console.log('Updating winner song in DB:', song);
        await db.collection('user_songs').updateOne(
          { userID, deezerID },
          { $set: song },
          { upsert: true }
        );
        console.log('Winner song updated');

        console.log('Updating loser song in DB:', opponent);
        await db.collection('user_songs').updateOne(
          { userID, deezerID: opponentDeezerID },
          { $set: opponent },
          { upsert: true }
        );
        console.log('Loser song updated');

        console.log('Database updates completed');
        res.status(200).json({ message: 'User song ratings updated', newRatingA, newRatingB });
      } else {
        console.log('Missing result or opponentDeezerID, sending 400');
        res.status(400).json({ error: 'Missing result or opponentDeezerID' });
      }
    } catch (error) {
      console.error('Error upserting user song:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to upsert user song' });
    }
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
    console.log('START getDeezerInfo with songs:', songs);
    try {
      const enrichedSongs = await UserSongsController.enrichSongsWithDeezer(songs);
      console.log('END getDeezerInfo, enriched songs:', enrichedSongs);
      res.status(200).json(enrichedSongs);
    } catch (error) {
      console.error('Error in getDeezerInfo:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to fetch Deezer info' });
    }
  }

  static async enrichSongsWithDeezer(songs) {
    console.log('START enrichSongsWithDeezer with', songs.length, 'songs:', songs);
    const enrichedSongsPromises = songs.map(async (song) => {
      console.log(`START processing song: ${song.songName} by ${song.artist}`);
      try {
        const cleanedArtist = cleanArtistName(song.artist);
        console.log(`Cleaned artist for ${song.songName}: ${cleanedArtist}`);
        const searchUrl = `https://api.deezer.com/search?q=track:"${song.songName}" artist:${cleanedArtist}`;
        console.log(`Fetching Deezer URL: ${searchUrl}`);
        
        const response = await fetch(searchUrl);
        console.log(`Fetch completed for ${song.songName}, status: ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error for ${song.songName}! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Deezer data for ${song.songName}:`, data.data ? data.data.length : 0, 'tracks found');
        
        const selectedTrack = findMatchingTrack(data.data, cleanedArtist);
        if (selectedTrack) {
          console.log(`Selected track for ${song.songName}: ID=${selectedTrack.id}, Artist=${selectedTrack.artist.name}, Preview=${selectedTrack.preview}, Cover=${selectedTrack.album.cover_medium}`);
          const enrichedSong = {
            ...song,
            deezerID: selectedTrack.id,
            previewURL: selectedTrack.preview,
            albumCover: selectedTrack.album.cover_medium,
          };
          console.log(`Enriched song ${song.songName}:`, enrichedSong);
          return enrichedSong;
        } else {
          console.log(`No matching track found for ${song.songName}`);
          return song;
        }
      } catch (error) {
        console.error(`Error enriching ${song.songName}: ${error.message}, Stack: ${error.stack}`);
        return song; // Return original song on error
      } finally {
        console.log(`END processing song: ${song.songName}`);
      }
    });
    
    console.log('Awaiting all enrichment promises...');
    const enrichedSongs = await Promise.all(enrichedSongsPromises);
    console.log('END enrichSongsWithDeezer, returning', enrichedSongs.length, 'songs:', enrichedSongs);
    return enrichedSongs;
  }
}

// Clean the artist name by removing "featuring", "ft", etc.
function cleanArtistName(artist) {
  const keywords = ['featuring', 'ft', 'ft.', 'feature'];
  const regex = new RegExp(`\\s+(${keywords.join('|')}).*`, 'i');
  return artist.replace(regex, '').trim();
}

// Find the first track where the artist matches based on the first two words (or one)
function findMatchingTrack(tracks, inputArtist) {
  if (!tracks || tracks.length === 0) return null;

  const inputWords = inputArtist.toLowerCase().split(/\s+/);
  const matchWords = inputWords.length >= 2 ? inputWords.slice(0, 2).join(' ') : inputWords[0];

  for (const track of tracks) {
    const trackWords = track.artist.name.toLowerCase().split(/\s+/);
    const trackMatchWords = trackWords.length >= 2 ? trackWords.slice(0, 2).join(' ') : trackWords[0];

    if (trackMatchWords === matchWords) {
      return track; // Return the first match
    }
  }

  return tracks[0]; // Fallback to first track if no match
}

module.exports = UserSongsController;