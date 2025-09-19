// Filepath: Melodex/melodex-front-end/src/contexts/SongContext.jsx
import React, { createContext, useState, useCallback, useContext, useEffect, useRef } from 'react';
import { useUserContext } from './UserContext';

const SongContext = createContext();

export const useSongContext = () => {
  const context = useContext(SongContext);
  if (!context) throw new Error('useSongContext must be used within a SongProvider');
  return context;
};

export const SongProvider = ({ children }) => {
  const { userID } = useUserContext();
  console.log('SongProvider: userID from UserContext:', userID);

  const [songList, setSongList] = useState([]);
  const [songBuffer, setSongBuffer] = useState([]);
  const [currentPair, setCurrentPair] = useState([]);
  const [rankedSongs, setRankedSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('new');
  const [selectedGenre, setSelectedGenre] = useState('any');

  // These are controlled by /rank apply
  const [lastFilters, setLastFilters] = useState({ genre: 'any', subgenre: 'any', decade: 'all decades' });
  const [filtersApplied, setFiltersApplied] = useState(false);

  const [isBackgroundFetching, setIsBackgroundFetching] = useState(false);
  const [isRankPageActive, setIsRankPageActive] = useState(false);
  const [contextUserID, setContextUserID] = useState(null);

  // Guards/refs
  const inFlightRef = useRef(false);
  const lastBgFetchAtRef = useRef(0);
  const unmountedRef = useRef(false);

  // For accurate totals during bursts:
  const listLenRef = useRef(0);
  const bufferLenRef = useRef(0);
  useEffect(() => { listLenRef.current = songList.length; }, [songList.length]);
  useEffect(() => { bufferLenRef.current = songBuffer.length; }, [songBuffer.length]);

  // Prefetch tuning (feel free to tweak)
  const PREFETCH_TARGET = 30;       // aim to keep list+buffer around this
  const LOW_WATERMARK   = 10;       // when list drops below this, refill from buffer
  const PREFETCH_COOLDOWN_MS = 6000;
  const MAX_PAGES_PER_BURST = 2;    // smaller burst
  const MAX_BUFFER = 40;            // hard cap on buffer size

  useEffect(() => {
    unmountedRef.current = false;
    return () => { unmountedRef.current = true; };
  }, []);

  useEffect(() => {
    console.log('SongProvider useEffect: Setting contextUserID to', userID);
    setContextUserID(userID);
  }, [userID]);

  // ---- Burst background prefetch (only /rank after filters applied) ----
  useEffect(() => {
    const runBurstPrefetch = async () => {
      const totalAvailableStart = songList.length + songBuffer.length;
      const now = Date.now();
      const cooledDown = now - lastBgFetchAtRef.current >= PREFETCH_COOLDOWN_MS;

      const canFetch =
        !!contextUserID &&
        mode === 'new' &&
        isRankPageActive &&
        filtersApplied &&
        cooledDown &&
        !inFlightRef.current &&
        !isBackgroundFetching &&
        totalAvailableStart > 0 &&                  // <-- wait for *some* songs to exist (avoids overlap with initial fetch)
        totalAvailableStart < PREFETCH_TARGET;

      if (!canFetch) {
        console.log('Background fetch skipped:', {
          contextUserID,
          mode,
          isRankPageActive,
          filtersApplied,
          isBackgroundFetching,
          cooledDown,
          totalAvailable: totalAvailableStart,
          songListLength: songList.length,
          songBufferLength: songBuffer.length
        });
        return;
      }

      console.log('Triggering background fetch BURST (start totalAvailable:', totalAvailableStart, ')');
      inFlightRef.current = true;
      setIsBackgroundFetching(true);
      lastBgFetchAtRef.current = now;

      try {
        let pagesFetched = 0;

        while (pagesFetched < MAX_PAGES_PER_BURST) {
          // live totals from refs so we count changes during the burst
          const liveTotal = listLenRef.current + bufferLenRef.current;
          if (liveTotal >= PREFETCH_TARGET) break;

          const newSongs = await generateNewSongs(lastFilters, true);
          pagesFetched += 1;

          if (!newSongs || newSongs.length === 0) {
            console.warn('Burst prefetch: page returned 0 songs; stopping burst.');
            break;
          }

          setSongBuffer(prev => {
            // Append but enforce hard cap
            const updated = [...prev, ...newSongs];
            let final = updated;
            if (updated.length > MAX_BUFFER) {
              final = updated.slice(0, MAX_BUFFER);
            }
            console.log(`Burst page ${pagesFetched}: +${newSongs.length} songs -> buffer size now: ${final.length}`);
            return final;
          });
        }
      } catch (err) {
        console.error('Burst prefetch error:', err);
      } finally {
        inFlightRef.current = false;
        if (!unmountedRef.current) setIsBackgroundFetching(false);
        console.log('Background fetch BURST complete.');
      }
    };

    runBurstPrefetch();
  }, [
    songList.length,          // only lengths (not arrays) to avoid identity churn
    songBuffer.length,
    contextUserID,
    mode,
    isRankPageActive,
    filtersApplied
  ]);

  // ---- Refill visible list from buffer when it gets low ----
  useEffect(() => {
    if (songList.length < LOW_WATERMARK && songBuffer.length > 0) {
      const want = LOW_WATERMARK * 2; // ~20 at a time
      const batchSize = Math.min(want, songBuffer.length);
      const newSongs = songBuffer.slice(0, batchSize);
      setSongList(prevList => [...prevList, ...newSongs]);
      setSongBuffer(prevBuffer => prevBuffer.slice(batchSize));
      console.log('Replenished songList from buffer:', newSongs.length, 'list size now:', (songList.length + newSongs.length));
    } else if (
      songList.length === 0 &&
      songBuffer.length === 0 &&
      mode === 'new' &&
      contextUserID &&
      isRankPageActive &&
      filtersApplied
    ) {
      console.log('Song list and buffer empty after filters; fetching initial songs');
      generateNewSongs(lastFilters).then(newSongs => {
        if (newSongs.length > 0) {
          setSongList(newSongs);
          console.log('Initial fetch (post-apply):', newSongs.length);
        } else {
          console.warn('Initial fetch returned no songs');
        }
      });
    }
  }, [songList.length, songBuffer.length, mode, contextUserID, lastFilters, isRankPageActive, filtersApplied]);

  const getNextPair = useCallback((songsToUse = songList) => {
    if (!Array.isArray(songsToUse)) {
      console.error('getNextPair: songsToUse is not an array', songsToUse);
      setCurrentPair([]);
      return;
    }
    const validSongs = songsToUse.filter(song => song && song.deezerID);
    console.log('getNextPair: Valid songs available:', validSongs.length, validSongs);
    if (validSongs.length < 2) {
      console.log('getNextPair: Not enough valid songs, currentPair set to empty');
      setCurrentPair([]);
      return;
    }
    const song1 = validSongs[0];
    const song2 = validSongs.find(song => String(song.deezerID) !== String(song1.deezerID));
    if (!song2) {
      console.error('getNextPair: Could not find a second song');
      setCurrentPair([]);
      return;
    }
    const newPair = [song1, song2];
    setCurrentPair(newPair);
    setSongList(validSongs.filter(song => String(song.deezerID) !== String(song1.deezerID) && String(song.deezerID) !== String(song2.deezerID)));
    console.log('getNextPair: New pair set:', newPair);
  }, [songList]);

  const generateNewSongs = async (filters = lastFilters ?? { genre: 'any', subgenre: 'any', decade: 'all decades' }, isBackground = false) => {
    if (!userID) return [];
    if (!isBackground) {
      setLoading(true);
      console.log('Loading set to true');
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('generateNewSongs fetch timed out');
      }, 30000);

      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/user-songs/new`;
      console.log('generateNewSongs filters:', filters);
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ userID, ...filters }),
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch new songs: ${response.status} ${errorText}`);
      }
      const songs = await response.json();
      return songs;
    } catch (error) {
      console.error('Failed to generate new songs:', error);
      return [];
    } finally {
      if (!isBackground) {
        setLoading(false);
        console.log('Loading set to false');
      }
    }
  };

  const fetchReRankingData = async (genre = selectedGenre, subgenre = 'any', setContext = true) => {
    if (!contextUserID) {
      console.error('No userID available for fetchReRankingData');
      return [];
    }
    setLoading(true);
    console.log('Loading set to true');
    try {
      console.log('fetchReRankingData with genre:', genre, 'subgenre:', subgenre);
      const payload = { userID: contextUserID };
      if (subgenre !== 'any') {
        payload.subgenre = subgenre;
        if (genre !== 'any') payload.genre = genre;
      } else if (genre !== 'any') {
        payload.genre = genre;
      }
      console.log('fetchReRankingData payload:', payload);
      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/user-songs/rerank`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to fetch re-ranking data');
      const reRankSongs = await response.json();
      console.log('fetchReRankingData: Retrieved songs:', reRankSongs);
      if (setContext) {
        setSongList(reRankSongs);
        getNextPair(reRankSongs);
      }
      return reRankSongs;
    } catch (error) {
      console.error('Failed to fetch re-ranking data:', error);
      return [];
    } finally {
      setLoading(false);
      console.log('Loading set to false');
    }
  };

  const fetchRankedSongs = useCallback(async ({ userID: fetchUserID, genre = selectedGenre, subgenre = 'any' }) => {
    const idToUse = fetchUserID || contextUserID;
    console.log('fetchRankedSongs called with userID:', idToUse, 'genre:', genre, 'subgenre:', subgenre);
    if (!idToUse) {
      console.error('No userID available for fetchRankedSongs');
      setRankedSongs([]);
      return [];
    }
    setLoading(true);
    console.log('Loading set to true');
    const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/user-songs/ranked`;
    console.log('Fetching ranked songs from:', url);

    try {
      const payload = { userID: idToUse };
      if (genre !== 'any') payload.genre = genre;
      if (subgenre !== 'any') payload.subgenre = subgenre;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to fetch ranked songs');

      const text = await response.text();
      try {
        const ranked = JSON.parse(text);
        setRankedSongs(ranked);
        return ranked;
      } catch {
        setRankedSongs([]);
        return [];
      }
    } catch (error) {
      console.error('Failed to fetch ranked songs:', error);
      setRankedSongs([]);
      return [];
    } finally {
      setLoading(false);
      console.log('Loading set to false');
    }
  }, [contextUserID, selectedGenre]);

  const selectSong = async (winnerId, loserId, resetProcessing) => {
    if (!contextUserID) {
      console.error('No userID available for selectSong');
      resetProcessing?.();
      return;
    }
    setLoading(true);
    console.log('Loading set to true');
    try {
      const winnerSong = currentPair.find(s => s.deezerID.toString() === winnerId.toString());
      const loserSong = currentPair.find(s => s.deezerID.toString() === loserId.toString());
      if (!winnerSong || !loserSong) {
        console.error('Winner or loser song not found in currentPair', { winnerId, loserId, currentPair });
        resetProcessing?.();
        return;
      }

      const payload = {
        userID,
        deezerID: winnerSong.deezerID,
        opponentDeezerID: loserSong.deezerID,
        result: 'win',
        winnerSongName: winnerSong.songName,
        winnerArtist: winnerSong.artist,
        winnerGenre: winnerSong.genre,
        winnerSubgenre: winnerSong.subgenre || null,
        winnerDecade: winnerSong.decade || null,
        winnerAlbumCover: winnerSong.albumCover,
        winnerPreviewURL: winnerSong.previewURL,
        loserSongName: loserSong.songName,
        loserArtist: loserSong.artist,
        loserGenre: loserSong.genre,
        loserSubgenre: loserSong.subgenre || null,
        loserDecade: loserSong.decade || null,
        loserAlbumCover: loserSong.albumCover,
        loserPreviewURL: loserSong.previewURL,
      };

      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/user-songs/upsert`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to update song ratings');

      const { newRatingA, newRatingB } = await response.json();

      const updatedList = songList.filter(song => String(song.deezerID) !== String(winnerId) && String(song.deezerID) !== String(loserId));
      setSongList(updatedList);
      setRankedSongs(prev => ([
        ...prev.filter(s =>
          String(s.deezerID) !== String(winnerSong.deezerID) &&
          String(s.deezerID) !== String(loserSong.deezerID)
        ),
        { ...winnerSong, ranking: newRatingA },
        { ...loserSong, ranking: newRatingB }
      ]));

      if (mode === 'new') {
        getNextPair(updatedList);
      } else if (mode === 'rerank') {
        const newPair = await fetchReRankingData();
        setCurrentPair(newPair.length >= 2 ? newPair : []);
        setSongList([]);
      }
    } catch (error) {
      console.error('Failed to select song:', error.message);
    } finally {
      setLoading(false);
      console.log('Loading set to false');
      resetProcessing?.();
    }
  };

  const skipSong = async (songId, resetProcessing) => {
    if (!contextUserID) {
      console.error('No userID available for skipSong');
      resetProcessing?.();
      return;
    }
    setLoading(true);
    console.log('Loading set to true');
    try {
      const skippedSong = currentPair.find(s => s.deezerID.toString() === songId.toString());
      const keptSong = currentPair.find(s => s.deezerID.toString() !== songId.toString());
      if (!skippedSong || !keptSong) {
        console.error('Skipped song or kept song not found in currentPair:', { songId, currentPair });
        resetProcessing?.();
        return;
      }

      const payload = {
        userID,
        deezerID: songId,
        ranking: null,
        skipped: true,
        songName: skippedSong.songName || 'Unknown Song',
        artist: skippedSong.artist || 'Unknown Artist',
        genre: skippedSong.genre || 'unknown',
        subgenre: skippedSong.subgenre || null,
        decade: skippedSong.decade || null,
        albumCover: skippedSong.albumCover || '',
        previewURL: skippedSong.previewURL || '',
      };

      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/user-songs/upsert`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to skip song');

      if (mode === 'rerank') {
        const reRankSongs = await fetchReRankingData();
        if (reRankSongs.length > 0) {
          const newSong = reRankSongs.find(s => String(s.deezerID) !== String(keptSong.deezerID));
          setCurrentPair(newSong ? [keptSong, newSong] : [keptSong]);
        } else {
          setCurrentPair([]);
        }
      } else {
        if (songList.length > 0) {
          const nextSong = songList[0];
          setCurrentPair([nextSong, keptSong]);
          setSongList(songList.slice(1));
        } else {
          setCurrentPair([]);
        }
      }
    } catch (error) {
      console.error('Failed to skip song:', error.message);
      setCurrentPair([]);
    } finally {
      setLoading(false);
      console.log('Loading set to false');
      resetProcessing?.();
    }
  };

  const refreshPair = useCallback(async (resetProcessing) => {
    if (!contextUserID) {
      console.error('No userID available for refreshPair');
      resetProcessing?.();
      return;
    }
    setLoading(true);
    console.log('Loading set to true');
    try {
      if (mode === 'new' && currentPair.length === 2) {
        await Promise.all([
          skipSong(currentPair[0].deezerID),
          skipSong(currentPair[1].deezerID),
        ]);
        getNextPair(songList);
      } else if (mode === 'rerank') {
        const newPair = await fetchReRankingData();
        setCurrentPair(newPair.length >= 2 ? newPair : []);
      }
    } catch (error) {
      console.error('Failed to refresh pair:', error);
      setCurrentPair([]);
    } finally {
      setLoading(false);
      console.log('Loading set to false');
      resetProcessing?.();
    }
  }, [mode, currentPair, songList, skipSong, fetchReRankingData]);

  useEffect(() => {
    setCurrentPair([]);
  }, [mode]);

  return (
    <SongContext.Provider
      value={{
        songList,
        setSongList,
        songBuffer,
        setSongBuffer,
        currentPair,
        setCurrentPair,
        rankedSongs,
        loading,
        setLoading,
        mode,
        setMode,
        getNextPair,
        generateNewSongs,
        fetchReRankingData,
        selectSong,
        skipSong,
        fetchRankedSongs,
        refreshPair,
        selectedGenre,
        setSelectedGenre,
        userID: contextUserID,
        setIsRankPageActive,
        setLastFilters,
        setFiltersApplied
      }}
    >
      {children}
    </SongContext.Provider>
  );
};

export default SongProvider;
