import React, { createContext, useState, useCallback, useContext } from 'react';

const SongContext = createContext();
const API_BASE_URL = 'http://localhost:3000/api';
const userID = 'testUser'; // Adjust based on your auth system

export const SongProvider = ({ children }) => {
  const [songList, setSongList] = useState([]);
  const [currentPair, setCurrentPair] = useState([]);
  const [rankedSongs, setRankedSongs] = useState([]);
  const [loading, setLoading] = useState(false);

  const getNextPair = async (songs = songList) => {
    setLoading(true);
    try {
      if (songs.length >= 2) {
        setCurrentPair([songs[0], songs[1]]);
        setSongList(songs.slice(2));
      } else if (songs.length === 1) {
        setCurrentPair([songs[0]]);
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
      const response = await fetch(`${API_BASE_URL}/user-songs/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID }),
      });
      if (!response.ok) throw new Error('Failed to generate new songs');
      const newSongs = await response.json();
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
      await getNextPair(reRankSongs);
    } catch (error) {
      console.error('Failed to fetch re-ranking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectSong = async (winnerId, loserId) => {
    setLoading(true);
    try {
      if (!loserId) return;
      // Temporary ranking: winner 1200, loser 1199 (ELO to be added later)
      await fetch(`${API_BASE_URL}/user-songs/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, deezerID: winnerId, ranking: 1200, skipped: false }),
      });
      await fetch(`${API_BASE_URL}/user-songs/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, deezerID: loserId, ranking: 1199, skipped: false }),
      });
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
      await fetch(`${API_BASE_URL}/user-songs/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, deezerID: songId, ranking: null, skipped: true }),
      });
      const remainingSong = currentPair.find((s) => s.deezerID !== songId);
      const newSongs = await generateNewSongs();
      if (newSongs.length > 0) {
        setCurrentPair([remainingSong, newSongs[0]]);
        setSongList(newSongs.slice(1));
      } else {
        setCurrentPair([remainingSong]);
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
          body: JSON.stringify({ userID, deezerID: song.deezerID, ranking: null, skipped: true }),
        });
      }
      await getNextPair();
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