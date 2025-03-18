// Melodex/melodex-front-end/src/contexts/SongContext.jsx
import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';

const SongContext = createContext();
const API_BASE_URL = 'http://localhost:3000/api';
const userID = 'testUser';

export const useSongContext = () => {
  const context = useContext(SongContext);
  if (!context) throw new Error('useSongContext must be used within a SongProvider');
  return context;
};

export const SongProvider = ({ children }) => {
  const [songList, setSongList] = useState([]);
  const [songBuffer, setSongBuffer] = useState([]);
  const [currentPair, setCurrentPair] = useState([]);
  const [rankedSongs, setRankedSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('new');
  const [selectedGenre, setSelectedGenre] = useState('any');
  const [lastFilters, setLastFilters] = useState({ genre: 'pop', subgenre: 'all subgenres', decade: 'all decades' }); // Reintroduced
  const [isFetching, setIsFetching] = useState(false);

  const getNextPair = useCallback((songsToUse = songList) => {
    const validSongs = songsToUse.filter(song => song && song.deezerID);
    if (validSongs.length < 2) {
      setCurrentPair([]);
      console.log('getNextPair: Not enough valid songs, currentPair set to empty');
      return;
    }
    const song1 = validSongs[0];
    const song2 = validSongs.find(song => song.deezerID !== song1.deezerID);
    if (!song2) {
      const updatedList = validSongs.filter(song => song.deezerID !== song1.deezerID);
      setSongList(updatedList);
      getNextPair(updatedList);
      return;
    }
    const newPair = [song1, song2];
    setCurrentPair(newPair);
    setSongList(validSongs.filter(song => song.deezerID !== song1.deezerID && song.deezerID !== song2.deezerID));
    console.log('getNextPair: New pair set:', newPair);
  }, [songList]);

  const generateNewSongs = async (filters = lastFilters, isBackground = false) => {
    try {
      const payload = { userID, ...filters };
      console.log('generateNewSongs with payload:', payload);
      const response = await fetch(`${API_BASE_URL}/user-songs/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to fetch new songs');
      const newSongs = await response.json();
      console.log('generateNewSongs: Fetched songs:', newSongs);
      if (isBackground) {
        setSongBuffer(prev => [...prev, ...newSongs]);
      } else {
        setSongList(prev => [...prev, ...newSongs]);
        setLastFilters(filters); // Update lastFilters when new songs are generated
        getNextPair(newSongs);
      }
      return newSongs;
    } catch (error) {
      console.error('Failed to generate new songs:', error);
      return [];
    }
  };

  const fetchReRankingData = async (genre = selectedGenre) => {
    setLoading(true);
    try {
      console.log('fetchReRankingData with genre:', genre);
      const response = await fetch(`${API_BASE_URL}/user-songs/rerank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, genre }),
      });
      if (!response.ok) throw new Error('Failed to fetch re-ranking data');
      const reRankSongs = await response.json();
      console.log('fetchReRankingData: Retrieved songs:', reRankSongs);
      setSongList(reRankSongs);
      getNextPair(reRankSongs);
      return reRankSongs;
    } catch (error) {
      console.error('Failed to fetch re-ranking data:', error);
      setSongList([]);
      setCurrentPair([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchRankedSongs = useCallback(async (genre = selectedGenre) => {
    setLoading(true);
    try {
      console.log('fetchRankedSongs with genre:', genre);
      const response = await fetch(`${API_BASE_URL}/user-songs/ranked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, genre }),
      });
      if (!response.ok) throw new Error('Failed to fetch ranked songs');
      const ranked = await response.json();
      console.log('fetchRankedSongs: Retrieved songs:', ranked);
      setRankedSongs(ranked);
      return ranked;
    } catch (error) {
      console.error('Failed to fetch ranked songs:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [selectedGenre]);

  const selectSong = async (winnerId, loserId) => {
    setLoading(true);
    try {
      console.log('selectSong called with:', { winnerId, loserId, currentPair });
      if (!loserId) {
        console.error('No loserId provided, aborting');
        return;
      }
      const winnerSong = currentPair.find(s => s.deezerID === winnerId);
      const loserSong = currentPair.find(s => s.deezerID === loserId);
      console.log('Winner song:', winnerSong);
      console.log('Loser song:', loserSong);

      if (!winnerSong || !loserSong) {
        console.error('Winner or loser song not found in currentPair', { winnerId, loserId, currentPair });
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
        winnerAlbumCover: winnerSong.albumCover,
        winnerPreviewURL: winnerSong.previewURL,
        loserSongName: loserSong.songName,
        loserArtist: loserSong.artist,
        loserGenre: loserSong.genre,
        loserAlbumCover: loserSong.albumCover,
        loserPreviewURL: loserSong.previewURL,
      };
      console.log('Sending payload to /api/user-songs/upsert:', payload);

      const response = await fetch(`${API_BASE_URL}/user-songs/upsert`, {
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

      setCurrentPair([]);

      setRankedSongs(prevRanked => {
        const updated = prevRanked.filter(song => 
          song.deezerID !== winnerSong.deezerID && song.deezerID !== loserSong.deezerID
        );
        return [
          ...updated,
          { ...winnerSong, ranking: newRatingA },
          { ...loserSong, ranking: newRatingB }
        ];
      });

      if (mode === 'new') {
        const updatedList = songList.filter(song => song.deezerID !== winnerId && song.deezerID !== loserId);
        setSongList(updatedList);
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
    }
  };

  const skipSong = async (songId) => {
    setLoading(true);
    try {
      console.log('skipSong called with songId:', songId);
      const skippedSong = currentPair.find(s => s.deezerID === songId);
      const keptSong = currentPair.find(s => s.deezerID !== songId);
      
      if (!skippedSong || !keptSong) {
        console.error('Skipped song or kept song not found in currentPair:', { songId, currentPair });
        return;
      }

      const payload = {
        userID,
        deezerID: songId,
        ranking: null,
        skipped: true,
        songName: skippedSong.songName || 'Unknown Song',
        artist: skippedSong.artist || 'Unknown Artist',
        albumCover: skippedSong.albumCover || '',
        previewURL: skippedSong.previewURL || '',
      };
      console.log('Sending skip payload to /api/user-songs/upsert:', payload);

      const response = await fetch(`${API_BASE_URL}/user-songs/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to skip song: ${errorText}`);
      }

      console.log('Song skipped successfully:', songId);

      if (songList.length > 0) {
        const nextSong = songList[0];
        setCurrentPair([nextSong, keptSong]);
        setSongList(songList.slice(1));
      } else {
        setCurrentPair([]);
      }
    } catch (error) {
      console.error('Failed to skip song:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshPair = useCallback(async () => {
    setLoading(true);
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
    }
  }, [mode, currentPair, songList, skipSong, fetchReRankingData]);

  const maintainSongBuffer = useCallback(async () => {
    const MIN_BUFFER_SIZE = 30;
    const FETCH_THRESHOLD = 20;

    if (mode !== 'new' || isFetching || songList.length > FETCH_THRESHOLD) return;

    if (songBuffer.length < MIN_BUFFER_SIZE) {
      console.log('Buffer below', MIN_BUFFER_SIZE, ', fetching more songs in background...');
      setIsFetching(true);
      await generateNewSongs(lastFilters, true);
      setIsFetching(false);
    }

    if (songList.length < 2 && songBuffer.length > 0) {
      const songsToMove = songBuffer.slice(0, Math.min(30 - songList.length, songBuffer.length));
      setSongList(prev => [...prev, ...songsToMove]);
      setSongBuffer(prev => prev.slice(songsToMove.length));
      console.log('Moved', songsToMove.length, 'songs from buffer to songList');
      getNextPair();
    }
  }, [songList, songBuffer, mode, lastFilters, isFetching, generateNewSongs, getNextPair]);

  useEffect(() => {
    maintainSongBuffer();
  }, [maintainSongBuffer]);

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
      }}
    >
      {children}
    </SongContext.Provider>
  );
};