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
      if (!response.ok) throw new Error('Failed to fetch seen songs');
      const data = await response.json();
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
    const uniqueSongs = Array.from(
      new Map(newSongs.map(song => [song.deezerID, song])).values()
    );
    console.log('Generated songs:', uniqueSongs); // Debug
    setSongList(prev => [...prev, ...uniqueSongs]);
    return uniqueSongs;
  } catch (error) {
    console.error('Failed to generate new songs:', error);
    return [];
  } finally {
    setLoading(false);
  }
};

  const fetchReRankingData = async () => {
    if (mode === 'new') return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/seen-songs`, { // Use seen_songs instead
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uID: userId }),
      });
      if (!response.ok) throw new Error('Failed to fetch re-ranking data');
      const data = await response.json();
      const seenSongsList = await Promise.all(
        data.titles.map(async (deezerID) => {
          const songResponse = await fetch(`${API_BASE_URL}/songs-by-deezer-ids`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deezerIDs: [deezerID] }),
          });
          const [song] = await songResponse.json();
          return song;
        })
      );
      setSongList(seenSongsList);
      await getNextPair(seenSongsList);
    } catch (error) {
      console.error('Failed to fetch re-ranking data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const getNextPair = async (list = songList) => {
  if (mode === 'new') {
    let availableSongs = list.length > 0 ? list : await generateNewSongs();
    availableSongs = Array.from(
      new Map(availableSongs.map(song => [song.deezerID, song])).values()
    ); // Ensure unique
    if (availableSongs.length >= 2) {
      setCurrentPair(availableSongs.slice(0, 2));
      setSongList(availableSongs.slice(2));
    } else {
      setCurrentPair([]); // No pairs available
      setSongList([]);
    }
  } else if (mode === 'rerank') {
    const seenSongsList = list.length > 0 ? list : await (async () => {
      const response = await fetch(`${API_BASE_URL}/seen-songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uID: userId }),
      });
      const data = await response.json();
      return await Promise.all(
        data.titles.map(async (deezerID) => {
          const songResponse = await fetch(`${API_BASE_URL}/songs-by-deezer-ids`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deezerIDs: [deezerID] }),
          });
          const [song] = await songResponse.json();
          return song;
        })
      );
    })();
    if (seenSongsList.length >= 2) {
      const shuffled = [...seenSongsList].sort(() => 0.5 - Math.random());
      setCurrentPair(shuffled.slice(0, 2));
      setSongList(shuffled.slice(2));
    } else {
      setCurrentPair([]);
    }
  }
};


  const selectSong = async (winnerId, loserId) => {
  setLoading(true);
  try {
    if (!loserId) return; // No update if only one song
    await fetch(`${API_BASE_URL}/rankings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uID: userId, deezerID: winnerId, rating: 1550 }),
    });
    await fetch(`${API_BASE_URL}/rankings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uID: userId, deezerID: loserId, rating: 1450 }),
    });
    if (mode === 'new') {
      const newSeen = [winnerId, loserId];
      await fetch(`${API_BASE_URL}/seen-songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uID: userId, titles: newSeen, genreField: 'rock90' }),
      });
      setSeenSongs(prev => [...prev, ...newSeen]);
    }
    await getNextPair();
  } catch (error) {
    console.error('Failed to select song:', error);
  } finally {
    setLoading(false);
  }
};

  const skipSong = async (songId) => {
    setLoading(true);
    try {
      const remainingSong = currentPair.find(s => s.deezerID !== songId);
      if (mode === 'new') {
        await fetch(`${API_BASE_URL}/seen-songs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uID: userId, titles: [songId], genreField: 'rock90' }),
        });
        setSeenSongs(prev => [...prev, songId]);
        if (!remainingSong || songList.length === 0 && (await generateNewSongs()).length === 0) {
          setCurrentPair([]);
        } else if (songList.length > 0) {
          setCurrentPair([remainingSong, songList[0]]);
          setSongList(songList.slice(1));
        } else {
          const newSongs = await generateNewSongs();
          if (newSongs.length > 0) {
            setCurrentPair([remainingSong, newSongs[0]]);
            setSongList(newSongs.slice(1));
          } else {
            setCurrentPair([]);
          }
        }
      } else if (mode === 'rerank') {
        // Replace with random seen song
        const seenResponse = await fetch(`${API_BASE_URL}/seen-songs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uID: userId }),
        });
        const data = await seenResponse.json();
        const availableSongs = data.titles.filter(id => id !== songId && id !== remainingSong?.deezerID);
        if (availableSongs.length > 0) {
          const randomId = availableSongs[Math.floor(Math.random() * availableSongs.length)];
          const songResponse = await fetch(`${API_BASE_URL}/songs-by-deezer-ids`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deezerIDs: [randomId] }),
          });
          const [randomSong] = await songResponse.json();
          setCurrentPair([remainingSong, randomSong]);
        } else {
          setCurrentPair([remainingSong]);
        }
      }
    } catch (error) {
      console.error('Failed to skip song:', error);
    } finally {
      setLoading(false);
    }
  };

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