// Filepath: melodex-back-end/controllers/UserSongsController.js
const axios = require('axios');
const { ObjectId } = require('mongodb');

/* ------------------------------ helpers ------------------------------ */

function normalize(s = '') {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function pickBestMatch(items, name, artist) {
  const nName = normalize(name);
  const nArtist = normalize(artist);
  const scored = items.map((it, i) => {
    const t = normalize(it.title || it.title_short || '');
    const a = normalize(it.artist?.name || '');
    let score = 0;
    if (a && nArtist && (a === nArtist || a.includes(nArtist) || nArtist.includes(a))) score += 3;
    if (t && nName && (t === nName || t.includes(nName) || nName.includes(t))) score += 2;
    if (it.preview) score += 1;
    // small positional bias to earlier results
    score += Math.max(0, 1 - i * 0.001);
    return { it, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0]?.it;
  if (top) {
    console.log('[rehydrate] pickBestMatch ->', {
      pickedId: top.id,
      pickedTitle: top.title || top.title_short,
      pickedArtist: top.artist?.name,
      hadPreview: !!top.preview,
    });
  }
  return top;
}

async function fetchTrackById(id) {
  if (!id) return null;
  try {
    console.log('[rehydrate] Try Deezer by ID:', id);
    const { data } = await axios.get(`https://api.deezer.com/track/${id}`, { timeout: 10000 });
    if (!data || !data.id) {
      console.log('[rehydrate] Deezer by ID returned no data/invalid payload for', id);
      return null; // Deezer sometimes returns {}
    }
    console.log('[rehydrate] Deezer by ID hit:', {
      id: data.id,
      title: data.title || data.title_short,
      artist: data.artist?.name,
      hasPreview: !!data.preview,
    });
    return data;
  } catch (e) {
    console.log('[rehydrate] Deezer by ID error for', id, '-', e?.message || e);
    return null;
  }
}

async function searchDeezerSmart(songName, artist) {
  const tries = [
    `track:"${songName}" artist:"${artist}"`,
    `track:"${songName}" artist:${artist}`,
  ];

  for (const q of tries) {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(q)}`;
    try {
      console.log('[rehydrate] Search Deezer:', q);
      const { data } = await axios.get(url, { timeout: 10000 });
      const items = Array.isArray(data?.data) ? data.data : [];
      console.log('[rehydrate] Search results:', { query: q, count: items.length });
      if (items.length) {
        const best = (typeof pickBestMatch === 'function')
          ? (pickBestMatch(items, songName, artist) || items[0])
          : items[0];
        if (best) {
          console.log('[rehydrate] Search selected:', {
            id: best.id,
            title: best.title || best.title_short,
            artist: best.artist?.name,
            hasPreview: !!best.preview,
          });
          return best;
        }
      }
    } catch (e) {
      console.log('[rehydrate] Search error for', q, '-', e?.message || e);
      // swallow and try next strategy
    }
  }
  return null;
}

// quick TTL parser for signed Deezer preview URLs
function parsePreviewExpiryFromUrl(u) {
  try {
    if (!u) return { exp: null, now: Math.floor(Date.now() / 1000), ttl: null };
    const q = new URL(u).searchParams;
    const hdnea = q.get('hdnea') || '';
    const m = /exp=(\d+)/.exec(hdnea);
    const now = Math.floor(Date.now() / 1000);
    if (!m) return { exp: null, now, ttl: null };
    const exp = parseInt(m[1], 10);
    return { exp, now, ttl: exp - now };
  } catch {
    return { exp: null, now: Math.floor(Date.now() / 1000), ttl: null };
  }
}

function isDeezerPreviewLikelyValid(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const qs = url.split('?')[1] || '';
    const params = new URLSearchParams(qs);
    const hdnea = params.get('hdnea') || '';
    const m = /exp=(\d+)/.exec(hdnea);
    if (!m) return true; // if no exp present, let it pass
    const exp = parseInt(m[1], 10);
    const now = Math.floor(Date.now() / 1000);
    return exp - now > 60; // “likely valid” if >60s remain
  } catch {
    return true;
  }
}

class UserSongsController {
  // ----- ALIAS added to match router wiring -----
  static async rehydrateSong(req, res) {
    return UserSongsController.rehydrateSongMetadata(req, res);
  }

  static async rehydrateSongMetadata(req, res) {
    try {
      const db = req.app.locals.db;
      if (!db) {
        console.error('Database not connected in rehydrateSongMetadata');
        return res.status(500).json({ error: 'Database connection unavailable' });
      }

      const { userID, songId, fallbackDeezerID, songName, artist } = req.body || {};
      if (!userID || !(songName && artist) || (!songId && !fallbackDeezerID)) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      console.log('[rehydrate] START:', req.body);

      // 1) Try the known Deezer ID first (cheap + reliable)
      let best = null;
      if (fallbackDeezerID != null) {
        const byId = await fetchTrackById(fallbackDeezerID);
        if (byId) {
          const ttl = parsePreviewExpiryFromUrl(byId.preview);
          console.log('[rehydrate] By-ID preview TTL:', {
            id: byId.id,
            hasPreview: !!byId.preview,
            ttl: ttl.ttl,
            exp: ttl.exp,
          });
        }
        if (byId && byId.preview) best = byId; // if preview exists, we're done
      }

      // 2) Otherwise search quoted → unquoted, using the EXACT artist (no cleaning)
      if (!best) {
        best = await searchDeezerSmart(songName, artist);
      }

      if (!best) {
        console.warn('[rehydrate] No Deezer match found');
        return res.status(404).json({ error: 'No Deezer match found' });
      }

      const updatedFields = {
        deezerID: best.id,
        songName: best.title || best.title_short || songName,
        artist: best.artist?.name || artist,
        albumCover: best.album?.cover_medium || best.album?.cover || '',
        previewURL: best.preview || '',
        lastDeezerRefresh: new Date().toISOString(),
      };

      const ttl = parsePreviewExpiryFromUrl(updatedFields.previewURL);
      console.log('[rehydrate] Selected track:', {
        id: updatedFields.deezerID,
        title: updatedFields.songName,
        artist: updatedFields.artist,
        hasPreview: !!updatedFields.previewURL,
        previewTTL: ttl.ttl,
        previewExp: ttl.exp,
      });

      // Identify the "old" row/document to update
      let oldFilter = null;
      let oldDoc = null;
      if (songId) {
        try {
          oldFilter = { _id: new ObjectId(String(songId)), userID };
        } catch (_) {
          oldFilter = null;
        }
      }
      if (!oldFilter && fallbackDeezerID != null) {
        oldFilter = { userID, deezerID: Number(fallbackDeezerID) || fallbackDeezerID };
      }
      if (oldFilter) {
        oldDoc = await db.collection('user_songs').findOne(oldFilter);
      } else {
        oldDoc = await db.collection('user_songs').findOne({ userID, songName, artist });
        oldFilter = oldDoc ? { _id: oldDoc._id } : null;
      }

      // Merge if a different doc already has the new deezerID
      const existingWithNew = await db.collection('user_songs').findOne({
        userID,
        deezerID: updatedFields.deezerID,
      });

      if (existingWithNew && (!oldDoc || String(existingWithNew._id) !== String(oldDoc._id))) {
        await db.collection('user_songs').updateOne(
          { _id: existingWithNew._id },
          { $set: updatedFields }
        );
        if (oldDoc) {
          await db.collection('user_songs').deleteOne({ _id: oldDoc._id });
          console.log('[rehydrate] MERGE: deleted old doc', oldDoc._id.toString(), 'into', existingWithNew._id.toString());
        }
        const merged = await db.collection('user_songs').findOne({ _id: existingWithNew._id });
        console.log('[rehydrate] MERGED into existing doc:', merged?._id?.toString());
        return res.json(merged);
      }

      // Otherwise update in place (or upsert if we only had name/artist)
      const r = await db.collection('user_songs').findOneAndUpdate(
        oldFilter || { userID, songName, artist },
        { $set: updatedFields },
        { upsert: !oldFilter, returnDocument: 'after' }
      );

      const doc =
        r.value ||
        (oldFilter
          ? await db.collection('user_songs').findOne(oldFilter)
          : await db.collection('user_songs').findOne({ userID, deezerID: updatedFields.deezerID }));

      console.log('[rehydrate] UPDATED doc:', doc?._id?.toString());
      return res.json(doc || updatedFields);
    } catch (err) {
      console.error('rehydrateSongMetadata error:', err);
      if (String(err).includes('E11000')) {
        return res.status(409).json({ error: 'Duplicate deezerID for user (merge path should handle this).' });
      }
      return res.status(500).json({ error: 'Server error rehydrating song' });
    }
  }

  /* -------------------------- NEW SONGS (GPT) -------------------------- */
  static async getNewSongsForUser(req, res) {
    const { userID, genre = 'pop', subgenre, decade } = req.body;
    const db = req.app.locals.db;
    let numSongs = 15;
    const minSongs = 10;
    const maxAttempts = 3;
    let attempt = 0;
    let newSongs = [];

    if (!userID) {
      console.error('No userID provided in getNewSongsForUser');
      return res.status(400).json({ error: 'userID is required' });
    }
    if (!db) {
      console.error('Database not connected in getNewSongsForUser');
      return res.status(500).json({ error: 'Database connection unavailable' });
    }
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not set in getNewSongsForUser');
      return res.status(500).json({ error: 'OpenAI API key missing' });
    }

    try {
      console.log('START getNewSongsForUser for userID:', userID);
      const userSongs = await db.collection('user_songs').find({ userID }).toArray();
      const userDeezerIDs = userSongs.map(s => s.deezerID);

      const seenSongs = userSongs.map(s => `${s.songName}, ${s.artist}`);
      const songsString = seenSongs.length ? seenSongs.join(', ') : 'None';

      let startYear, endYear;
      if (decade && decade !== 'all decades') {
        startYear = parseInt(decade.slice(0, 3)) * 10;
        endYear = startYear + 9;
      } else {
        startYear = 1900;
        endYear = new Date().getFullYear();
      }

      const promptGenre =
        subgenre && subgenre !== 'any'
          ? `${genre} with subgenre ${subgenre}`
          : `${genre} with all subgenres`;

      while (newSongs.length < minSongs && attempt < maxAttempts) {
        attempt++;
        const prompt = `Generate a list of ${numSongs} well-known hit songs in the ${promptGenre} genre, released between ${startYear} and ${endYear}. Each song must be formatted as "Song Name, Artist". Exclude the following songs: ${songsString}. Ensure the response has exactly ${numSongs} unique songs, with no artist appearing more than twice. Focus on lesser-known hits to avoid repetition. Provide only the song list, no explanations.`;

        const aiResp = await axios.post(
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
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
          }
        );

        const lines = aiResp.data.choices[0].message.content
          .trim()
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean);

        const initialRanking = await UserSongsController.getAverageRanking(
          db,
          userID,
          genre,
          subgenre
        );

        const toEnrich = lines.map(line => {
          const parts = line.split(/,\s*/);
          const songNameRaw = parts[0];
          const artistRaw = parts.slice(1).join(', ');
          const songName = songNameRaw.replace(/^\d+\.\s*"?(.*?)"?$/, '$1').trim();
          const artist = artistRaw.replace(/^"?(.*?)"?$/, '$1').trim();
          return {
            userID,
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

        const enriched = await UserSongsController.enrichSongsWithDeezer(toEnrich);
        newSongs = enriched.filter(s => !userDeezerIDs.includes(s.deezerID));

        if (newSongs.length < minSongs && attempt < maxAttempts) {
          numSongs = Math.min(numSongs + 10, 50);
        }
      }

      return res.status(200).json(newSongs);
    } catch (err) {
      console.error('Error in getNewSongsForUser:', err.message, err.stack);
      return res.status(500).json({ error: 'Failed to fetch new songs', details: err.message });
    }
  }

  /* ----------------------------- UPSERT/PLAY ---------------------------- */
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

    if (!userID) return res.status(400).json({ error: 'userID is required' });
    if (!db) return res.status(500).json({ error: 'Database connection unavailable' });

    try {
      let song = await db.collection('user_songs').findOne({ userID, deezerID });

      if (!song) {
        const initialRanking =
          ranking !== undefined
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
      }

      if (!opponentDeezerID) {
        await db.collection('user_songs').updateOne(
          { userID, deezerID },
          { $set: song },
          { upsert: true }
        );
        return res.status(200).json({ message: 'Song updated', song });
      }

      let opponent = await db.collection('user_songs').findOne({ userID, deezerID: opponentDeezerID });
      if (!opponent) {
        const initialOpponentRanking = await UserSongsController.getAverageRanking(
          db,
          userID,
          loserGenre,
          loserSubgenre
        );
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
      } else {
        if (loserSongName) opponent.songName = loserSongName;
        if (loserArtist) opponent.artist = loserArtist;
        if (loserGenre) opponent.genre = loserGenre;
        if (loserSubgenre !== undefined) opponent.subgenre = loserSubgenre;
        if (loserDecade !== undefined) opponent.decade = loserDecade;
        if (loserAlbumCover) opponent.albumCover = loserAlbumCover;
        if (loserPreviewURL) opponent.previewURL = loserPreviewURL;
      }

      if (result) {
        const R_A = song.ranking || 1200;
        const R_B = opponent.ranking || 1200;
        const E_A = 1 / (1 + Math.pow(10, (R_B - R_A) / 400));
        const E_B = 1 / (1 + Math.pow(10, (R_A - R_B) / 400));
        const S_A = result === 'win' ? 1 : 0;
        const S_B = 1 - S_A;

        const newRatingA = Math.round(R_A + K * (S_A - E_A));
        const newRatingB = Math.round(R_B + K * (S_B - E_B));

        song.ranking = newRatingA;
        opponent.ranking = newRatingB;

        await db.collection('user_songs').updateOne({ userID, deezerID }, { $set: song }, { upsert: true });
        await db.collection('user_songs').updateOne(
          { userID, deezerID: opponentDeezerID },
          { $set: opponent },
          { upsert: true }
        );

        return res.status(200).json({ message: 'User song ratings updated', newRatingA, newRatingB });
      } else {
        return res.status(400).json({ error: 'Missing result when opponentDeezerID is provided' });
      }
    } catch (err) {
      console.error('Error upserting user song:', err.message, err.stack);
      return res.status(500).json({ error: 'Failed to upsert user song' });
    }
  }

  /* ---------------------------- RANKED SONGS ---------------------------- */
  static async getRankedSongsForUser(req, res) {
    const { userID, genre, subgenre } = req.body;
    const db = req.app.locals.db;

    if (!userID) return res.status(400).json({ error: 'userID is required' });
    if (!db) return res.status(500).json({ error: 'Database connection unavailable' });

    try {
      const query = { userID, skipped: false };
      if (subgenre && subgenre !== 'any') {
        query.subgenre = subgenre;
        if (genre && genre !== 'any') query.genre = genre;
      } else if (genre && genre !== 'any') {
        query.genre = genre;
      }

      const rankedSongs = await db.collection('user_songs').find(query).toArray();
      return res.status(200).json(rankedSongs);
    } catch (err) {
      console.error('Error fetching ranked songs:', err);
      return res.status(500).json({ error: 'Failed to fetch ranked songs' });
    }
  }

  /* ------------------------------ RE-RANKING ---------------------------- */
  static async getReRankSongsForUser(req, res) {
    const { userID, genre, subgenre } = req.body;
    const db = req.app.locals.db;

    if (!userID) return res.status(400).json({ error: 'userID is required' });
    if (!db) return res.status(500).json({ error: 'Database connection unavailable' });

    try {
      const query = { userID, skipped: false };
      if (subgenre && subgenre !== 'any') {
        query.subgenre = subgenre;
        if (genre && genre !== 'any') query.genre = genre;
      } else if (genre && genre !== 'any') {
        query.genre = genre;
      }

      const rankedSongs = await db.collection('user_songs').find(query).toArray();
      if (rankedSongs.length < 2) return res.status(200).json([]);

      const shuffled = rankedSongs.sort(() => 0.5 - Math.random());
      const randomPair = shuffled.slice(0, 2);
      return res.status(200).json(randomPair);
    } catch (err) {
      console.error('Error fetching rerank songs:', err.message, err.stack);
      return res.status(500).json({ error: 'Failed to fetch rerank songs', details: err.message });
    }
  }

 /* ---------------------------- DEEZER ENRICH --------------------------- */
  static async getDeezerInfo(req, res) {
    const { songs } = req.body;
    if (!Array.isArray(songs)) {
      return res.status(400).json({ error: 'songs must be an array' });
    }

    const db = req.app.locals.db;
    if (!db) {
      console.error('Database not connected in getDeezerInfo');
      return res.status(500).json({ error: 'Database connection unavailable' });
    }

    try {
      const validPreviewCount = songs.filter(s => s.previewURL && isDeezerPreviewLikelyValid(s.previewURL)).length;
      console.log('[deezer-info] Incoming songs:', {
        total: songs.length,
        alreadyValidPreview: validPreviewCount,
      });

      // 1) Enrich in memory
      const enriched = await UserSongsController.enrichSongsWithDeezer(songs);

      // 2) Persist to DB so fixes are permanent and future loads don’t re-trigger
      const bulk = db.collection('user_songs').initializeUnorderedBulkOp();
      const toReturn = [];

      for (const s of enriched) {
        // Prefer _id -> (userID, deezerID) -> (userID, name+artist)
        let filter = null;

        if (s._id) {
          try {
            filter = { _id: new ObjectId(String(s._id)) };
          } catch {
            filter = null;
          }
        }
        if (!filter && s.userID && s.deezerID != null) {
          filter = { userID: s.userID, deezerID: Number(s.deezerID) || s.deezerID };
        }
        if (!filter && s.userID && s.songName && s.artist) {
          filter = { userID: s.userID, songName: s.songName, artist: s.artist };
        }

        const setFields = {
          songName: s.songName || '',
          artist: s.artist || '',
          deezerID: s.deezerID ?? null,
          albumCover: s.albumCover || '',
          previewURL: s.previewURL || '',
          lastDeezerRefresh: s.lastDeezerRefresh || new Date().toISOString(),
        };

        if (filter) {
          bulk.find(filter).upsert().updateOne({ $set: setFields });
        } else {
          console.log('[deezer-info] SKIP persist (no filter):', { songName: s.songName, artist: s.artist });
        }

        toReturn.push({ ...s, ...setFields });
      }

      if (bulk.length > 0) {
        try {
          await bulk.execute();
        } catch (e) {
          // If there are dup key races (deezerID unique per user), just log; UI still updates.
          console.warn('bulk.execute warning in getDeezerInfo:', e?.message || e);
        }
      }

      console.log('[deezer-info] Outgoing enriched:', {
        total: toReturn.length,
        withPreview: toReturn.filter(x => !!x.previewURL).length,
      });

      // 3) Send enriched docs back so the UI can merge progressively
      return res.status(200).json(toReturn);
    } catch (err) {
      console.error('Error in getDeezerInfo:', err.message, err.stack);
      return res.status(500).json({ error: 'Failed to fetch Deezer info' });
    }
  }


  // CHANGED: quoted→unquoted fallbacks and, if needed, fall back to un-cleaned artist
  static async enrichSongsWithDeezer(songs = []) {
    const tryVariants = async (songName, artist, cleanedArtist) => {
      const variants = [
        `track:"${songName}" artist:"${cleanedArtist}"`, // preferred: cleaned + quoted
        `track:"${songName}" artist:${cleanedArtist}`,   // fallback: cleaned + unquoted
        `track:"${songName}" artist:"${artist}"`,        // last resorts: raw artist
        `track:"${songName}" artist:${artist}`,
      ];

      for (const q of variants) {
        const url = `https://api.deezer.com/search?q=${encodeURIComponent(q)}`;
        let items = [];
        try {
          console.log('[deezer-info] Search:', q);
          const { data } = await axios.get(url, { timeout: 10000 });
          items = Array.isArray(data?.data) ? data.data : [];
          console.log('[deezer-info] Search results:', { query: q, count: items.length });
        } catch (e) {
          console.log('[deezer-info] Search error for', q, '-', e?.message || e);
          items = [];
        }
        if (items.length > 0) {
          return { items, qTried: q };
        }
      }
      return { items: [], qTried: null };
    };

    const out = [];
    for (const song of songs) {
      const songName = song.songName || '';
      const artist = song.artist || '';
      const cleanedArtist = this.cleanArtistName(artist);

      // Early return: if we already have a working preview (and basic metadata),
      if (song.previewURL && isDeezerPreviewLikelyValid(song.previewURL) && song.deezerID && song.albumCover) {
        const ttl = parsePreviewExpiryFromUrl(song.previewURL);
        console.log('[deezer-info] Skip (already valid preview):', {
          songName,
          artist,
          deezerID: song.deezerID,
          ttl: ttl.ttl,
          exp: ttl.exp,
        });
        out.push({
          ...song,
          lastDeezerRefresh: song.lastDeezerRefresh || new Date().toISOString(),
        });
        continue;
      }

      const { items, qTried } = await tryVariants(songName, artist, cleanedArtist);
      if (items.length === 0) {
        console.log('[deezer-info] No results for:', { songName, artist });
        out.push(song);
        continue;
      }

      const best = (typeof pickBestMatch === 'function')
        ? pickBestMatch(items, songName, artist)
        : items[0];

      const ttl = parsePreviewExpiryFromUrl(best?.preview);
      console.log('[deezer-info] Selected:', {
        songName,
        artist,
        pickedId: best?.id,
        pickedTitle: best?.title || best?.title_short,
        pickedArtist: best?.artist?.name,
        hasPreview: !!best?.preview,
        fromQuery: qTried,
        ttl: ttl.ttl,
        exp: ttl.exp,
      });

      out.push({
        ...song,
        deezerID: best?.id ?? song.deezerID,
        songName: best?.title || best?.title_short || songName,
        artist: best?.artist?.name || artist,
        albumCover: best?.album?.cover_medium || best?.album?.cover || song.albumCover || '',
        previewURL: best?.preview || song.previewURL || '',
        lastDeezerRefresh: new Date().toISOString(),
      });
    }

    console.log('[deezer-info] enrichSongsWithDeezer summary:', {
      input: songs.length,
      output: out.length,
      withPreview: out.filter(x => !!x.previewURL).length,
    });

    return out;
  }

  /* --------------------------- ranking baseline ------------------------- */
  static async getAverageRanking(db, userID, genre, subgenre) {
    if (!userID || !db) return 1200;

    const query = { userID, skipped: false, ranking: { $ne: null } };
    if (genre && genre !== 'any') query.genre = genre;
    if (subgenre && subgenre !== 'any' && subgenre !== null) query.subgenre = subgenre;

    const similar = await db.collection('user_songs').find(query).toArray();
    if (!similar.length) return 1200;

    const total = similar.reduce((sum, s) => sum + (s.ranking || 1200), 0);
    return Math.round(total / similar.length);
  }

  /* ------------------------------- misc -------------------------------- */
  static cleanArtistName(artist) {
    const keywords = ['featuring', 'feat', 'feat.', 'ft', 'ft.', 'feature', '&'];
    const regex = new RegExp(`\\s+(${keywords.join('|')}).*`, 'i');
    return (artist || '').replace(regex, '').trim();
  }
}

module.exports = UserSongsController;
