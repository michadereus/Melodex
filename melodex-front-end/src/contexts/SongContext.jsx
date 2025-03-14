import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';

const SongContext = createContext();
const API_BASE_URL = 'http://localhost:3000/api';
const userID = 'testUser';

export const SongProvider = ({ children }) => {
  const [songList, setSongList] = useState([]);
  const [currentPair, setCurrentPair] = useState([]);
  const [rankedSongs, setRankedSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('new');

  const hardcodedSongs = [
    { deezerID: "123", songName: "Song A", artist: "Artist A", genre: "unknown", albumCover: "", previewURL: "", ranking: null, skipped: false },
    { deezerID: "456", songName: "Song B", artist: "Artist B", genre: "unknown", albumCover: "", previewURL: "", ranking: null, skipped: false },
    { deezerID: "789", songName: "Song C", artist: "Artist C", genre: "unknown", albumCover: "", previewURL: "", ranking: null, skipped: false },
  ];

  const fetchDeezerInfo = async (songs) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user-songs/deezer-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs }),
      });
      if (!response.ok) throw new Error('Failed to fetch Deezer info');
      return await response.json();
    } catch (error) {
      console.error('Error fetching Deezer info:', error);
      return songs; // Fallback to original songs if fetch fails
    }
  };

  const getNextPair = async (songs = songList) => {
    setLoading(true);
    try {
      let availableSongs = songs;
      if (songs.length === 0) {
        availableSongs = mode === 'new' ? await generateNewSongs() : await fetchReRankingData();
      }
      if (availableSongs.length >= 2) {
        const pair = [availableSongs[0], availableSongs[1]];
        // Fetch Deezer info before setting currentPair
        const enrichedPair = await fetchDeezerInfo(pair);
        setCurrentPair(enrichedPair);
        setSongList(availableSongs.slice(2));
      } else if (availableSongs.length === 1) {
        const singleSong = await fetchDeezerInfo([availableSongs[0]]);
        setCurrentPair(singleSong);
        setSongList([]);
      } else {
        setCurrentPair([]);
      }
    } catch (error) {
      console.error('Failed to get next pair:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewSongs = async () => {
    setLoading(true);
    try {
      const newSongs = hardcodedSongs.filter(song => !song.skipped && song.ranking === null);
      setSongList(newSongs);
      return newSongs;
    } catch (error) {
      console.error('Failed to generate new songs:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchReRankingData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user-songs/rerank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID }),
      });
      if (!response.ok) throw new Error('Failed to fetch re-ranking data');
      const reRankSongs = await response.json();
      setSongList(reRankSongs);
      return reRankSongs;
    } catch (error) {
      console.error('Failed to fetch re-ranking data:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const selectSong = async (winnerId, loserId) => {
    setLoading(true);
    try {
      if (!loserId) return;
      await fetch(`${API_BASE_URL}/user-songs/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, deezerID: winnerId, ranking: 1200, skipped: false, songName: hardcodedSongs.find(s => s.deezerID === winnerId).songName, artist: hardcodedSongs.find(s => s.deezerID === winnerId).artist }),
      });
      await fetch(`${API_BASE_URL}/user-songs/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, deezerID: loserId, ranking: 1199, skipped: false, songName: hardcodedSongs.find(s => s.deezerID === loserId).songName, artist: hardcodedSongs.find(s => s.deezerID === loserId).artist }),
      });
      const updatedList = songList.filter(song => song.deezerID !== winnerId && song.deezerID !== loserId);
      setSongList(updatedList);
      await getNextPair(updatedList);
    } catch (error) {
      console.error('Failed to select song:', error);
    } finally {
      setLoading(false);
    }
  };

  const skipSong = async (songId) => {
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/user-songs/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, deezerID: songId, ranking: null, skipped: true, songName: hardcodedSongs.find(s => s.deezerID === songId).songName, artist: hardcodedSongs.find(s => s.deezerID === songId).artist }),
      });
      const remainingSong = currentPair.find((s) => s.deezerID !== songId);
      const updatedList = songList.filter(song => song.deezerID !== songId);
      setSongList(updatedList);
      if (remainingSong) {
        const newSongs = hardcodedSongs.filter(s => !s.skipped && s.ranking === null && s.deezerID !== remainingSong.deezerID);
        if (newSongs.length > 0) {
          const enrichedPair = await fetchDeezerInfo([remainingSong, newSongs[0]]);
          setCurrentPair(enrichedPair);
          setSongList(newSongs.slice(1));
        } else {
          const enrichedSingle = await fetchDeezerInfo([remainingSong]);
          setCurrentPair(enrichedSingle);
        }
      } else {
        await getNextPair(updatedList);
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
      for (const song of currentPair) {
        await fetch(`${API_BASE_URL}/user-songs/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userID, deezerID: song.deezerID, ranking: null, skipped: true, songName: song.songName, artist: song.artist }),
        });
      }
      const updatedList = songList.filter(song => !currentPair.some(s => s.deezerID === song.deezerID));
      setSongList(updatedList);
      await getNextPair(updatedList);
    } catch (error) {
      console.error('Failed to skip both songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRankedSongs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user-songs/ranked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID }),
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

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        if (mode === 'new') {
          const newSongs = await generateNewSongs();
          await getNextPair(newSongs);
        } else if (mode === 'rerank') {
          const reRankSongs = await fetchReRankingData();
          await getNextPair(reRankSongs);
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [mode]);

  return (
    <SongContext.Provider
      value={{
        songList,
        setSongList,
        currentPair,
        setCurrentPair,
        rankedSongs,
        setRankedSongs,
        loading,
        mode,
        setMode,
        getNextPair,
        generateNewSongs,
        fetchReRankingData,
        selectSong,
        skipSong,
        skipBothSongs,
        fetchRankedSongs,
      }}
    >
      {children}
    </SongContext.Provider>
  );
};

export const useSongContext = () => useContext(SongContext);