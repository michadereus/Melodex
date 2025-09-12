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
  const [lastFilters, setLastFilters] = useState({ genre: 'pop', subgenre: 'all subgenres', decade: 'all decades' });
  const [isFetching, setIsFetching] = useState(false);
  const [contextUserID, setContextUserID] = useState(null);
  const [isBackgroundFetching, setIsBackgroundFetching] = useState(false);
  const [isRankPageActive, setIsRankPageActive] = useState(false);

  // Guard to prevent overlapping background fetches (also reduces StrictMode double-effect spam)
  const inFlightRef = useRef(false);

  useEffect(() => {
    console.log('SongProvider useEffect: Setting contextUserID to', userID);
    setContextUserID(userID);
  }, [userID]);

  // Background fetching logic with retries + in-flight guard
  useEffect(() => {
    const fetchMoreSongs = async () => {
      const shouldFetch =
        !!contextUserID &&
        mode === 'new' &&
        isRankPageActive &&
        !inFlightRef.current &&
        !isBackgroundFetching &&
        songList.length < 20; // adjust threshold as desired

      if (!shouldFetch) {
        console.log('Background fetch skipped:', {
          contextUserID,
          mode,
          isRankPageActive,
          isBackgroundFetching,
          songListLength: songList.length
        });
        return;
      }

      console.log('Triggering background fetch for more songs');
      inFlightRef.current = true;
      setIsBackgroundFetching(true);

      let retries = 0;
      const maxRetries = 3;
      let newSongs = [];

      while (retries < maxRetries) {
        try {
          newSongs = await generateNewSongs(lastFilters, true);
          console.log('Background fetch result:', newSongs);
          if (newSongs.length > 0) {
            setSongBuffer(prevBuffer => [...prevBuffer, ...newSongs]);
            console.log('Background fetch added songs to buffer:', newSongs.length);
            break;
          } else {
            console.warn(`Background fetch returned no songs on attempt ${retries + 1}`);
            retries++;
            if (retries === maxRetries) {
              console.error('Max retries reached, no songs fetched');
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error(`Background fetch failed on attempt ${retries + 1}:`, error);
          retries++;
          if (retries === maxRetries) {
            console.error('Max retries reached, failed to fetch songs');
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      inFlightRef.current = false;
      setIsBackgroundFetching(false);
    };

    fetchMoreSongs();
  }, [songList, contextUserID, mode, isBackgroundFetching, lastFilters, isRankPageActive]);

  useEffect(() => {
    if (songList.length < 10 && songBuffer.length > 0) {
      const batchSize = Math.min(30, songBuffer.length);
      const newSongs = songBuffer.slice(0, batchSize);
      setSongList(prevList => [...prevList, ...newSongs]);
      setSongBuffer(prevBuffer => prevBuffer.slice(batchSize));
      console.log('Replenished songList from buffer:', newSongs.length);
    } else if (songList.length === 0 && songBuffer.length === 0 && mode === 'new' && contextUserID && isRankPageActive) {
      console.log('Song list and buffer are empty, fetching more songs');
      generateNewSongs(lastFilters).then(newSongs => {
        if (newSongs.length > 0) {
          setSongList(newSongs);
          console.log('Fetched new songs due to empty list:', newSongs.length);
        } else {
          console.warn('No new songs available to fetch');
        }
      });
    }
  }, [songList, songBuffer, mode, contextUserID, lastFilters, isRankPageActive]);

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

  const generateNewSongs = async (filters = lastFilters, isBackground = false) => {
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
      if (error.name === 'AbortError') {
        console.log('Fetch aborted due to timeout');
      } else if (error.message.includes('NetworkError')) {
        console.log('Network error occurred, possibly backend server is not running');
      }
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
      if (genre !== 'any') {
        payload.genre = genre;
      }
      if (subgenre !== 'any') {
        payload.subgenre = subgenre;
      }
      console.log('fetchRankedSongs payload:', payload);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`HTTP error fetching ranked songs! Status: ${response.status}`);
        throw new Error('Failed to fetch ranked songs');
      }

      const text = await response.text();
      console.log('Raw response from ranked songs:', text);

      try {
        const ranked = JSON.parse(text);
        console.log('Parsed ranked songs:', ranked);
        setRankedSongs(ranked);
        return ranked;
      } catch (parseError) {
        console.error('JSON parse error in fetchRankedSongs:', parseError, 'Raw response:', text);
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
      console.log('selectSong called with:', { winnerId, loserId, userID, currentPair });
      // Ensure consistent type conversion for deezerID comparison
      const winnerSong = currentPair.find(s => s.deezerID.toString() === winnerId.toString());
      const loserSong = currentPair.find(s => s.deezerID.toString() === loserId.toString());
      console.log('Winner song:', winnerSong);
      console.log('Loser song:', loserSong);

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
      console.log('Sending payload to /api/user-songs/upsert:', payload);

      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/user-songs/upsert`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update song ratings: ${errorText}`);
      }

      const { newRatingA, newRatingB } = await response.json();
      console.log(`Updated ratings - Winner: ${newRatingA}, Loser: ${newRatingB}`);

      const updatedList = songList.filter(song => String(song.deezerID) !== String(winnerId) && String(song.deezerID) !== String(loserId));
      setSongList(updatedList);
      setRankedSongs(prevRanked => {
        const updated = prevRanked.filter(song =>
          String(song.deezerID) !== String(winnerSong.deezerID) && String(song.deezerID) !== String(loserSong.deezerID)
        );
        return [
          ...updated,
          { ...winnerSong, ranking: newRatingA },
          { ...loserSong, ranking: newRatingB }
        ];
      });

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
      console.log('skipSong called with songId:', songId, 'userID:', userID);
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
      console.log('Sending skip payload to /api/user-songs/upsert:', payload);

      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/user-songs/upsert`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to skip song: ${errorText}`);
      }

      console.log('Song skipped successfully:', songId);

      if (mode === 'rerank') {
        const reRankSongs = await fetchReRankingData();
        if (reRankSongs.length > 0) {
          const newSong = reRankSongs.find(s => String(s.deezerID) !== String(keptSong.deezerID));
          if (newSong) {
            setCurrentPair([keptSong, newSong]);
          } else {
            setCurrentPair([keptSong]);
          }
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
        setIsRankPageActive
      }}
    >
      {children}
    </SongContext.Provider>
  );
};

export default SongProvider;
