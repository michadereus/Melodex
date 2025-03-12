// frontend/src/contexts/SongContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SongContext = createContext();
export const useSongContext = () => useContext(SongContext);

export const SongProvider = ({ children }) => {
  const [seenSongs, setSeenSongs] = useState([]);
  const [songList, setSongList] = useState([]);
  const [currentPair, setCurrentPair] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('new');
  const [rankedSongs, setRankedSongs] = useState([]);

  const API_BASE_URL = 'http://localhost:3000/api';
  const userId = 'testUser';

  const fetchSeenSongs = async () => {
    if (mode === 'rerank') return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/seen-songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uID: userId }),
      });
      if (!response.ok) {
        console.log('Fetch seen songs failed with status:', response.status, await response.text());
        throw new Error('Failed to fetch seen songs');
      }
      const data = await response.json();
      console.log('Seen songs data:', data); // Debug
      setSeenSongs(data.titles || []);
    } catch (error) {
      console.error('Failed to fetch seen songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewSongs = async () => {
  if (mode === 'rerank') return;
  setLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/generate-songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uID: userId }),
    });
    if (!response.ok) throw new Error('Failed to generate songs');
    const newSongs = await response.json();
    // Remove duplicates by deezerID
    const uniqueSongs = Array.from(
      new Map(newSongs.map(song => [song.deezerID, song])).values()
    );
    console.log('Generated songs:', uniqueSongs);
    setSongList(prev => [...prev, ...uniqueSongs]);
    return uniqueSongs;
  } catch (error) {
    console.error('Failed to generate new songs:', error);
    return [];
  } finally {
    setLoading(false);
  }
};


  // Fetch re-ranking data (rerank mode only)
  const fetchReRankingData = async () => {
    if (mode === 'new') return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ranked-songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uID: userId }),
      });
      if (!response.ok) throw new Error('Failed to fetch re-ranking data');
      const songs = await response.json();
      setSongList(songs);
      await getNextPair(songs);
    } catch (error) {
      console.error('Failed to fetch re-ranking data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch ranked songs
  const fetchRankedSongs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ranked-songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uID: userId }),
      });
      if (!response.ok) throw new Error('Failed to fetch ranked songs');
      const ranked = await response.json();
      setRankedSongs(ranked);
    } catch (error) {
      console.error('Failed to fetch ranked songs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get next pair of songs
  const getNextPair = async (list = songList) => {
    if (mode === 'new' && list.length < 2) {
      const newSongs = await generateNewSongs();
      if (newSongs.length >= 2) {
        setCurrentPair(newSongs.slice(0, 2));
        setSongList(newSongs.slice(2));
      } else if (newSongs.length === 1) {
        setCurrentPair([newSongs[0]]);
        setSongList([]);
      } else {
        setCurrentPair([]);
      }
    } else if (mode === 'rerank' && list.length < 2) {
      setCurrentPair(list);
      setSongList([]);
    } else {
      const nextTwo = list.slice(0, 2);
      setCurrentPair(nextTwo);
      setSongList(list.slice(2));
    }
  };

  // Handle song selection
  const selectSong = async (winnerId, loserId) => {
  setLoading(true);
  try {
    console.log('Selecting winner:', winnerId, 'loser:', loserId);
    await fetch(`${API_BASE_URL}/rankings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uID: userId, deezerID: winnerId, rating: 1550 }),
    });
    if (loserId) {
      await fetch(`${API_BASE_URL}/rankings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uID: userId, deezerID: loserId, rating: 1450 }),
      });
    }
    if (mode === 'new') {
      const newSeen = [winnerId];
      if (loserId) newSeen.push(loserId);
      await fetch(`${API_BASE_URL}/seen-songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uID: userId, titles: newSeen, genreField: 'rock90' }),
      });
      setSeenSongs(prev => [...prev, ...newSeen]);
    }
    await getNextPair();
    console.log('After select - Current pair:', currentPair);
  } catch (error) {
    console.error('Failed to select song:', error);
  } finally {
    setLoading(false);
  }
};

  // Skip one song
const skipSong = async (songId) => {
  setLoading(true);
  try {
    console.log('Skipping song:', songId);
    if (mode === 'new') {
      await fetch(`${API_BASE_URL}/seen-songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uID: userId, titles: [songId], genreField: 'rock90' }),
      });
      setSeenSongs(prev => [...prev, songId]);
    }
    const remainingSong = currentPair.find(s => s.deezerID !== songId);
    console.log('Remaining song:', remainingSong);
    if (!remainingSong) {
      setCurrentPair([]); // All done
      return;
    }
    if (songList.length === 0 && mode === 'new') {
      const newSongs = await generateNewSongs();
      console.log('New songs after skip:', newSongs);
      if (newSongs.length > 0) {
        setCurrentPair([remainingSong, newSongs[0]]);
        setSongList(newSongs.slice(1));
      } else {
        setCurrentPair([remainingSong]);
      }
    } else if (songList.length > 0) {
      setCurrentPair([remainingSong, songList[0]]);
      setSongList(songList.slice(1));
    } else {
      setCurrentPair([remainingSong]);
    }
    console.log('New current pair:', currentPair);
  } catch (error) {
    console.error('Failed to skip song:', error);
  } finally {
    setLoading(false);
  }
};

  // Skip both songs
  const skipBothSongs = async () => {
    setLoading(true);
    try {
      if (mode === 'new') {
        const songIds = currentPair.map(s => s.deezerID);
        await fetch(`${API_BASE_URL}/seen-songs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uID: userId, titles: songIds, genreField: 'rock90' }),
        });
        setSeenSongs(prev => [...prev, ...songIds]);
      }
      await getNextPair();
    } catch (error) {
      console.error('Failed to skip both songs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        if (mode === 'new') {
          await fetchSeenSongs();
          await generateNewSongs();
          await getNextPair();
        } else {
          await fetchReRankingData();
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [mode]);

  const value = {
    seenSongs,
    songList,
    currentPair,
    loading,
    mode,
    setMode,
    fetchSeenSongs,
    generateNewSongs,
    fetchReRankingData,
    selectSong,
    skipSong,
    skipBothSongs,
    rankedSongs,
    fetchRankedSongs,
  };

  return <SongContext.Provider value={value}>{children}</SongContext.Provider>;
};