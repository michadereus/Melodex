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

  const mockSongs = [
    { id: 1, name: 'Song A', rating: 1500 },
    { id: 2, name: 'Song B', rating: 1400 },
    { id: 3, name: 'Song C', rating: 1300 },
    { id: 4, name: 'Song D', rating: 1200 },
  ];

  const fetchSeenSongs = async () => {
    if (mode === 'rerank') return;
    console.log('fetchSeenSongs called');
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setSeenSongs([1, 2]);
    setLoading(false);
  };

  const generateNewSongs = async () => {
    if (mode === 'rerank') return;
    console.log('generateNewSongs called');
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const newSongs = mockSongs.filter(song => !seenSongs.includes(song.id));
    setSongList(prev => [...prev, ...newSongs]);
    setLoading(false);
    return newSongs;
  };

  const fetchReRankingData = async () => {
    if (mode === 'new') return;
    console.log('fetchReRankingData called');
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const songs = mockSongs.slice(2);
    setSongList(songs);
    await getNextPair(songs);
    setLoading(false);
  };

  const fetchRankedSongs = useCallback(async (userId) => {
    console.log('fetchRankedSongs called');
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const mockRanked = mockSongs.map(song => ({
      ...song,
      rating: song.rating + (seenSongs.includes(song.id) ? 0 : Math.floor(Math.random() * 100) - 50),
    })).sort((a, b) => b.rating - a.rating);
    setRankedSongs(mockRanked);
    setLoading(false);
  }, [seenSongs]);

  const getNextPair = async (list = songList) => {
    console.log('getNextPair called');
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

  const selectSong = async (winnerId, loserId) => {
    console.log('selectSong called');
    const winner = currentPair.find(s => s.id === winnerId);
    const loser = currentPair.find(s => s.id !== winnerId);
    if (mode === 'new') {
      const newSeen = [winner.id];
      if (loser) newSeen.push(loser.id);
      setSeenSongs(prev => [...prev, ...newSeen]);
    }
    setRankedSongs(prev =>
      prev.map(song => {
        if (song.id === winnerId) return { ...song, rating: song.rating + 50 };
        if (song.id === loserId) return { ...song, rating: song.rating - 50 };
        return song;
      }).sort((a, b) => b.rating - a.rating)
    );
    await getNextPair();
  };

  const skipSong = async (songId) => {
    console.log('skipSong called');
    if (mode === 'new') {
      setSeenSongs(prev => [...prev, songId]);
    }
    const remainingSong = currentPair.find(s => s.id !== songId);
    if (songList.length === 0 && mode === 'new') {
      const newSongs = await generateNewSongs();
      if (newSongs.length > 0) {
        setCurrentPair([remainingSong, newSongs[0]]);
        setSongList(newSongs.slice(1));
      } else {
        setCurrentPair([remainingSong]);
      }
    } else if (songList.length === 0 && mode === 'rerank') {
      setCurrentPair([remainingSong]);
    } else {
      setCurrentPair([remainingSong, songList[0]]);
      setSongList(songList.slice(1));
    }
  };

  const skipBothSongs = async () => {
    console.log('skipBothSongs called');
    if (mode === 'new') {
      setSeenSongs(prev => [...prev, ...currentPair.map(s => s.id)]);
    }
    await getNextPair();
  };

  useEffect(() => {
    const loadInitialData = async () => {
      console.log('Context useEffect triggered, mode:', mode);
      setLoading(true);
      if (mode === 'new') {
        await fetchSeenSongs();
        await generateNewSongs();
        await getNextPair();
      } else if (mode === 'rerank') {
        await fetchReRankingData();
      }
      setLoading(false);
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


/*
import React, { createContext, useContext, useState, useEffect } from 'react';

const SongContext = createContext();
export const useSongContext = () => useContext(SongContext);

export const SongProvider = ({ children }) => {
  // State setup
  const [seenSongs, setSeenSongs] = useState([]);
  const [songList, setSongList] = useState([]);
  const [currentPair, setCurrentPair] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('new');

  // Fetch seen songs (new mode only)
  const fetchSeenSongs = async () => {
    if (mode === 'rerank') return;
    setLoading(true);
    try {
      const response = await fetch('/api/seen-songs');
      const data = await response.json();
      setSeenSongs(data);
    } catch (err) {
      console.error('Failed to fetch seen songs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate new songs (new mode only)
  const generateNewSongs = async () => {
    if (mode === 'rerank') return;
    setLoading(true);
    try {
      const response = await fetch('/api/generate-songs', {
        method: 'POST',
        body: JSON.stringify({ seenSongs }),
      });
      const newSongs = await response.json();
      setSongList(prev => [...prev, ...newSongs]);
      return newSongs;
    } catch (err) {
      console.error('Failed to generate new songs:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch re-ranking data (rerank mode only)
  const fetchReRankingData = async (userId) => {
    if (mode === 'new') return;
    setLoading(true);
    try {
      const response = await fetch('https://your-app-services-url/get-songs-by-ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const songs = await response.json();
      setSongList(songs);
      await getNextPair(songs);
    } catch (err) {
      console.error('Failed to fetch re-ranking data:', err);
    } finally {
      setLoading(false);
    }
  };

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
    const winner = currentPair.find(s => s.id === winnerId);
    const loser = currentPair.find(s => s.id !== winnerId);
    if (mode === 'new') {
      await Promise.all([
        fetch('/api/songs', { method: 'POST', body: JSON.stringify(winner) }),
        loser && fetch('/api/songs', { method: 'POST', body: JSON.stringify(loser) }),
      ]);
      const newSeen = [winner.id];
      if (loser) newSeen.push(loser.id);
      setSeenSongs(prev => [...prev, ...newSeen]);
    }
    await fetch('/api/ratings', {
      method: 'POST',
      body: JSON.stringify({ winnerId, loserId: loser?.id }),
    });
    await getNextPair();
  };

  // Skip one song
  const skipSong = async (songId) => {
    if (mode === 'new') {
      setSeenSongs(prev => [...prev, songId]);
    }
    const remainingSong = currentPair.find(s => s.id !== songId);
    if (songList.length === 0 && mode === 'new') {
      const newSongs = await generateNewSongs();
      if (newSongs.length > 0) {
        setCurrentPair([remainingSong, newSongs[0]]);
        setSongList(newSongs.slice(1));
      } else {
        setCurrentPair([remainingSong]);
      }
    } else if (songList.length === 0 && mode === 'rerank') {
      setCurrentPair([remainingSong]);
    } else {
      setCurrentPair([remainingSong, songList[0]]);
      setSongList(songList.slice(1));
    }
  };

  // Skip both songs
  const skipBothSongs = async () => {
    if (mode === 'new') {
      setSeenSongs(prev => [...prev, ...currentPair.map(s => s.id)]);
    }
    await getNextPair();
  };

  // Toggle modes
  const toggleMode = async (userId = 'temp') => {
    const newMode = mode === 'new' ? 'rerank' : 'new';
    setMode(newMode);
    setSongList([]);
    setCurrentPair([]);
    setLoading(true);
    if (newMode === 'rerank') {
      await fetchReRankingData(userId);
    } else {
      await fetchSeenSongs();
      await generateNewSongs();
      await getNextPair();
    }
    setLoading(false);
  };

  // Initial data load on mount
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      if (mode === 'new') {
        await fetchSeenSongs();
        await generateNewSongs();
        await getNextPair();
      } else {
        await fetchReRankingData('temp');
      }
      setLoading(false);
    };
    loadInitialData();
  }, []); // Empty dependency array ensures it runs only once on mount

  // Context value
  const value = {
    seenSongs,
    songList,
    currentPair,
    loading,
    mode,
    fetchSeenSongs,
    generateNewSongs,
    fetchReRankingData,
    selectSong,
    skipSong,
    skipBothSongs,
    toggleMode,
  };

  return <SongContext.Provider value={value}>{children}</SongContext.Provider>;
};
*/