const axios = require('axios');

class UserSongsController {
  static async getNewSongsForUser(req, res) {
    const { userID, genre = 'pop', subgenre, decade } = req.body;
    const db = req.app.locals.db;
    const numSongs = 30;

    if (!userID) {
      console.error('No userID provided in getNewSongsForUser');
      return res.status(400).json({ error: 'userID is required' });
    }

    try {
      console.log('START getNewSongsForUser for userID:', userID);
      console.log('Fetching user songs from DB...');
      const userSongs = await db.collection('user_songs').find({ userID }).toArray();
      console.log('User songs from DB:', userSongs);
      const userDeezerIDs = userSongs.map(song => song.deezerID);
      console.log('User deezerIDs:', userDeezerIDs);

      const seenSongs = userSongs.map(song => `${song.songName}, ${song.artist}`);
      const songsString = seenSongs.length > 0 ? seenSongs.join(', ') : 'None';

      let startYear, endYear;
      if (decade && decade !== 'all decades') {
        startYear = parseInt(decade.slice(0, 3)) * 10;
        endYear = startYear + 9;
      } else {
        startYear = 1900;
        endYear = new Date().getFullYear();
      }

      let promptGenre = genre;
      if (subgenre && subgenre !== 'any') {
        promptGenre = `${genre} with subgenre ${subgenre}`;
      } else {
        promptGenre = `${genre} with all subgenres`;
      }

      const prompt = `Please generate a list of ${numSongs} well-known hit songs in the ${promptGenre} genre, released between ${startYear} and ${endYear}. Each song should be formatted as "Song Name, Artist". Do NOT include any of the following songs: ${songsString}. Ensure the response has exactly ${numSongs} unique songs, with no artist appearing more than twice. The response must contain no explanations, only the song list.`;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
          temperature: 0.9,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        }
      );

      const songList = response.data.choices[0].message.content
        .trim()
        .split('\n')
        .map(line => line.trim());

      if (songList.length !== numSongs) {
        console.warn(`OpenAI returned ${songList.length} songs instead of ${numSongs}`);
      }

      const initialRanking = await UserSongsController.getAverageRanking(db, userID, genre, subgenre);
      console.log(`Initial ranking for new ${genre} songs (subgenre: ${subgenre || 'any'}): ${initialRanking}`);

      const transformedSongs = songList.map(songString => {
        const parts = songString.split(/,\s*/);
        const songNameRaw = parts[0];
        const artistRaw = parts.slice(1).join(', ');
        const songName = songNameRaw.replace(/^\d+\.\s*"?(.*?)"?$/, '$1').trim();
        const artist = artistRaw.replace(/^"?(.*?)"?$/, '$1').trim();
        return {
          songName,
          artist,
          genre,
          subgenre: subgenre || null,
          decade: decade || null,
          albumCover: '',
          previewURL: '',
          ranking: initialRanking,
          skipped: false,
        };
      });

      const enrichedSongs = await UserSongsController.enrichSongsWithDeezer(transformedSongs);
      console.log('Enriched songs before filter:', enrichedSongs);

      const newSongs = enrichedSongs.filter(song => !userDeezerIDs.includes(song.deezerID));
      console.log('New songs after filter:', newSongs);

      console.log('END getNewSongsForUser, sending response with', newSongs.length, 'songs...');
      res.status(200).json(newSongs);
    } catch (error) {
      console.error('Error in getNewSongsForUser:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to fetch new songs' });
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
      winnerSubgenre,
      winnerDecade,
      winnerAlbumCover,
      winnerPreviewURL,
      loserSongName,
      loserArtist,
      loserGenre,
      loserSubgenre,
      loserDecade,
      loserAlbumCover,
      loserPreviewURL,
      ranking,
      skipped,
    } = req.body;
    const db = req.app.locals.db;
    const K = 32;

    if (!userID) {
      console.error('No userID provided in upsertUserSong');
      return res.status(400).json({ error: 'userID is required' });
    }

    try {
      console.log('Starting upsertUserSong for userID:', userID);

      console.log('Fetching song with userID:', userID, 'deezerID:', deezerID);
      let song = await db.collection('user_songs').findOne({ userID, deezerID });
      console.log('Found song:', song);

      if (!song) {
        const initialRanking = ranking !== undefined
          ? ranking
          : await UserSongsController.getAverageRanking(db, userID, winnerGenre, winnerSubgenre);
        song = {
          userID,
          deezerID,
          songName: winnerSongName || 'Unknown Song',
          artist: winnerArtist || 'Unknown Artist',
          genre: winnerGenre || 'unknown',
          subgenre: winnerSubgenre || null,
          decade: winnerDecade || null,
          albumCover: winnerAlbumCover || '',
          previewURL: winnerPreviewURL || '',
          ranking: initialRanking,
          skipped: skipped || false,
        };
        console.log('Created new song entry with initial ranking:', song);
      } else {
        if (winnerSongName) song.songName = winnerSongName;
        if (winnerArtist) song.artist = winnerArtist;
        if (winnerGenre) song.genre = winnerGenre;
        if (winnerSubgenre !== undefined) song.subgenre = winnerSubgenre;
        if (winnerDecade !== undefined) song.decade = winnerDecade;
        if (winnerAlbumCover) song.albumCover = winnerAlbumCover;
        if (winnerPreviewURL) song.previewURL = winnerPreviewURL;
        if (ranking !== undefined) song.ranking = ranking;
        if (skipped !== undefined) song.skipped = skipped;
        console.log('Updated existing song:', song);
      }

      if (!opponentDeezerID) {
        console.log('No opponentDeezerID, performing standalone update');
        await db.collection('user_songs').updateOne(
          { userID, deezerID },
          { $set: song },
          { upsert: true }
        );
        console.log('Standalone song updated');
        res.status(200).json({ message: 'Song updated', song });
        return;
      }

      console.log('Fetching opponent with userID:', userID, 'deezerID:', opponentDeezerID);
      let opponent = await db.collection('user_songs').findOne({ userID, deezerID: opponentDeezerID });
      console.log('Found opponent:', opponent);
      if (!opponent) {
        const initialOpponentRanking = await UserSongsController.getAverageRanking(db, userID, loserGenre, loserSubgenre);
        opponent = {
          userID,
          deezerID: opponentDeezerID,
          songName: loserSongName || 'Unknown Song',
          artist: loserArtist || 'Unknown Artist',
          genre: loserGenre || 'unknown',
          subgenre: loserSubgenre || null,
          decade: loserDecade || null,
          albumCover: loserAlbumCover || '',
          previewURL: loserPreviewURL || '',
          ranking: initialOpponentRanking,
          skipped: false,
        };
        console.log('Created new opponent entry with initial ranking:', opponent);
      } else {
        if (loserSongName) opponent.songName = loserSongName;
        if (loserArtist) opponent.artist = loserArtist;
        if (loserGenre) opponent.genre = loserGenre;
        if (loserSubgenre !== undefined) opponent.subgenre = loserSubgenre;
        if (loserDecade !== undefined) opponent.decade = loserDecade;
        if (loserAlbumCover) opponent.albumCover = loserAlbumCover;
        if (loserPreviewURL) opponent.previewURL = loserPreviewURL;
        console.log('Updated existing opponent:', opponent);
      }

      if (result) {
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
        console.log('Missing result, sending 400');
        res.status(400).json({ error: 'Missing result when opponentDeezerID is provided' });
      }
    } catch (error) {
      console.error('Error upserting user song:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to upsert user song' });
    }
  }

  static async getRankedSongsForUser(req, res) {
    const { userID, genre, subgenre } = req.body;
    const db = req.app.locals.db;

    if (!userID) {
      console.error('No userID provided in getRankedSongsForUser');
      return res.status(400).json({ error: 'userID is required' });
    }

    try {
      const query = { userID, skipped: false };
      if (subgenre && subgenre !== 'any') {
        query.subgenre = subgenre;
        if (genre && genre !== 'any') query.genre = genre;
      } else if (genre && genre !== 'any') {
        query.genre = genre;
      }
      console.log('getRankedSongsForUser query:', query);
      const rankedSongs = await db.collection('user_songs')
        .find(query)
        .toArray();
      console.log('Fetched ranked songs:', rankedSongs);
      res.status(200).json(rankedSongs);
    } catch (error) {
      console.error('Error fetching ranked songs:', error);
      res.status(500).json({ error: 'Failed to fetch ranked songs' });
    }
  }

  static async getReRankSongsForUser(req, res) {
    const { userID, genre, subgenre } = req.body;
    const db = req.app.locals.db;

    if (!userID) {
      console.error('No userID provided in getReRankSongsForUser');
      return res.status(400).json({ error: 'userID is required' });
    }

    try {
      const query = { userID, skipped: false };
      if (subgenre && subgenre !== 'any') {
        query.subgenre = subgenre;
        if (genre && genre !== 'any') query.genre = genre;
      } else if (genre && genre !== 'any') {
        query.genre = genre;
      }
      console.log('getReRankSongsForUser query:', query);
      const rankedSongs = await db.collection('user_songs')
        .find(query)
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

  static async getDeezerInfo(req, res) {
    const { songs } = req.body;

    // No userID check here since this endpoint doesn't require it
    // It’s a utility function that enriches song data, not tied to a user
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
        const cleanedArtist = UserSongsController.cleanArtistName(song.artist);
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
        
        const selectedTrack = UserSongsController.findMatchingTrack(data.data, cleanedArtist);
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
        return song;
      } finally {
        console.log(`END processing song: ${song.songName}`);
      }
    });
    
    console.log('Awaiting all enrichment promises...');
    const enrichedSongs = await Promise.all(enrichedSongsPromises);
    console.log('END enrichSongsWithDeezer, returning', enrichedSongs.length, 'songs:', enrichedSongs);
    return enrichedSongs;
  }

  static async getAverageRanking(db, userID, genre, subgenre) {
    if (!userID) {
      console.error('No userID provided in getAverageRanking');
      return 1200; // Default ranking as a fallback
    }

    const query = { userID, genre, skipped: false, ranking: { $ne: null } };
    if (subgenre && subgenre !== 'any' && subgenre !== null) {
      query.subgenre = subgenre;
    }
    console.log('Query for average ranking:', query);
    const similarSongs = await db.collection('user_songs').find(query).toArray();
    console.log(`Found ${similarSongs.length} similar songs:`, similarSongs.map(song => ({
      deezerID: song.deezerID,
      songName: song.songName,
      artist: song.artist,
      subgenre: song.subgenre,
      ranking: song.ranking
    })));

    if (similarSongs.length === 0) {
      console.log('No similar songs found, defaulting to 1200');
      return 1200;
    }

    const totalRanking = similarSongs.reduce((sum, song) => sum + song.ranking, 0);
    const average = Math.round(totalRanking / similarSongs.length);
    console.log(`Total ranking sum: ${totalRanking}, number of songs: ${similarSongs.length}, average: ${average}`);
    return average;
  }

  static cleanArtistName(artist) {
    const keywords = ['featuring', 'ft', 'ft.', 'feature'];
    const regex = new RegExp(`\\s+(${keywords.join('|')}).*`, 'i');
    return artist.replace(regex, '').trim();
  }

  static findMatchingTrack(tracks, inputArtist) {
    if (!tracks || tracks.length === 0) return null;

    const inputWords = inputArtist.toLowerCase().split(/\s+/);
    const matchWords = inputWords.length >= 2 ? inputWords.slice(0, 2).join(' ') : inputWords[0];

    for (const track of tracks) {
      const trackWords = track.artist.name.toLowerCase().split(/\s+/);
      const trackMatchWords = trackWords.length >= 2 ? trackWords.slice(0, 2).join(' ') : trackWords[0];

      if (trackMatchWords === matchWords) {
        return track;
      }
    }
    return tracks[0];
  }
}

module.exports = UserSongsController;