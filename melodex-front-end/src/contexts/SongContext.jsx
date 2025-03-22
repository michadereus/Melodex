// Melodex/melodex-front-end/src/contexts/SongContext.jsx
import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { useUserContext } from './UserContext';

const SongContext = createContext();
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://melodex-backend.us-east-1.elasticbeanstalk.com/api';

export const useSongContext = () => {
  const context = useContext(SongContext);
  if (!context) throw new Error('useSongContext must be used within a SongProvider');
  return context;
};

export const SongProvider = ({ children }) => {
  const { userID } = useUserContext();
  const [songList, setSongList] = useState([]);
  const [songBuffer, setSongBuffer] = useState([]);
  const [currentPair, setCurrentPair] = useState([]);
  const [rankedSongs, setRankedSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('new');
  const [selectedGenre, setSelectedGenre] = useState('any');
  const [lastFilters, setLastFilters] = useState({ genre: 'pop', subgenre: 'all subgenres', decade: 'all decades' });
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    setRankedSongs([]); // Reset on mount
  }, []);

  const getNextPair = useCallback((songsToUse = songList) => {
    const validSongs = songsToUse.filter(song => song && song.deezerID);
    console.log('getNextPair: Valid songs available:', validSongs.length, validSongs);
    if (validSongs.length < 2) {
      console.log('getNextPair: Not enough valid songs, currentPair set to empty');
      setCurrentPair([]);
      return;
    }
    const song1 = validSongs[0];
    const song2 = validSongs.find(song => song.deezerID !== song1.deezerID); // Fixed typo: song1ematode -> song1
    if (!song2) {
      console.error('getNextPair: Could not find a second song');
      setCurrentPair([]);
      return;
    }
    const newPair = [song1, song2];
    setCurrentPair(newPair);
    setSongList(validSongs.filter(song => song.deezerID !== song1.deezerID && song.deezerID !== song2.deezerID));
    console.log('getNextPair: New pair set:', newPair);
  }, [songList]);

  const generateNewSongs = async (filters = lastFilters, isBackground = false) => {
    if (!userID) {
      console.error('No userID available for generateNewSongs');
      return [];
    }
    setLoading(true);
    try {
      const payload = { 
        userID, 
        genre: filters.genre, 
        subgenre: filters.subgenre !== 'all subgenres' ? filters.subgenre : null, 
        decade: filters.decade !== 'all decades' ? filters.decade : null 
      };
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
        setSongList(newSongs);
        setLastFilters(filters);
        getNextPair(newSongs);
      }
      return newSongs;
    } catch (error) {
      console.error('Failed to generate new songs:', error);
      setSongList([]);
      setCurrentPair([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchReRankingData = async (genre = selectedGenre, subgenre = 'any', setContext = true) => {
    if (!userID) {
      console.error('No userID available for fetchReRankingData');
      return [];
    }
    setLoading(true);
    try {
      console.log('fetchReRankingData with genre:', genre, 'subgenre:', subgenre);
      const payload = { userID };
      if (subgenre !== 'any') {
        payload.subgenre = subgenre;
        if (genre !== 'any') payload.genre = genre;
      } else if (genre !== 'any') {
        payload.genre = genre;
      }
      console.log('fetchReRankingData payload:', payload);
      const response = await fetch(`${API_BASE_URL}/user-songs/rerank`, {
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
    }
  };

  async function fetchRankedSongs({ userID, genre = selectedGenre, subgenre = 'any' }) {
    if (!userID) {
      console.error('No userID available for fetchRankedSongs');
      setRankedSongs([]);
      return [];
    }
    setLoading(true);
    const url = 'https://melodex-backend.us-east-1.elasticbeanstalk.com/api/user-songs/ranked'; // Use HTTPS
    console.log('Fetching ranked songs from:', url);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, genre, subgenre })
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
    }
  }

  const selectSong = async (winnerId, loserId) => {
    if (!userID) {
      console.error('No userID available for selectSong');
      return;
    }
    setLoading(true);
    try {
      console.log('selectSong called with:', { winnerId, loserId, userID, currentPair });
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

      const updatedList = songList.filter(song => song.deezerID !== winnerId && song.deezerID !== loserId);
      setSongList(updatedList);
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
    if (!userID) {
      console.error('No userID available for skipSong');
      return;
    }
    setLoading(true);
    try {
      console.log('skipSong called with songId:', songId, 'userID:', userID);
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
        genre: skippedSong.genre || 'unknown',
        subgenre: skippedSong.subgenre || null,
        decade: skippedSong.decade || null,
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

      if (mode === 'rerank') {
        // Fetch new songs to re-rank
        const reRankSongs = await fetchReRankingData();
        if (reRankSongs.length > 0) {
          // Find a new song that isn’t the kept song
          const newSong = reRankSongs.find(s => s.deezerID !== keptSong.deezerID);
          if (newSong) {
            setCurrentPair([keptSong, newSong]);
          } else {
            setCurrentPair([keptSong]); // Only kept song remains if no new song is found
          }
        } else {
          setCurrentPair([]); // No songs left to re-rank
        }
      } else {
        // Original logic for 'new' mode
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
      setCurrentPair([]); // Reset on error
    } finally {
      setLoading(false);
    }
  };

  const refreshPair = useCallback(async () => {
    if (!userID) {
      console.error('No userID available for refreshPair');
      return;
    }
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