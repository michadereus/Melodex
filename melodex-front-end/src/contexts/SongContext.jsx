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

  const getNextPair = useCallback((songsToUse = songList) => {
    console.log('getNextPair called, songsToUse:', songsToUse);
    if (songsToUse.length >= 2) {
      const newPair = [songsToUse[0], songsToUse[1]];
      setCurrentPair(newPair);
      setSongList(songsToUse.slice(2));
      console.log('currentPair set to:', newPair);
    } else if (songsToUse.length === 1) {
      setCurrentPair([songsToUse[0]]);
      setSongList([]);
      console.log('currentPair set to single song:', [songsToUse[0]]);
    } else {
      setCurrentPair([]);
      console.log('currentPair set to empty: no songs available');
    }
  }, [songList]);

  const generateNewSongs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user-songs/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID }),
      });
      if (!response.ok) throw new Error('Failed to fetch new songs');
      const newSongs = await response.json();
      setSongList(newSongs);
      console.log('generateNewSongs: newSongs:', newSongs);
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
      console.log('fetchReRankingData: reRankSongs (should be 2):', reRankSongs);
      return reRankSongs; // Expecting exactly 2 songs
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
      const winnerSong = currentPair.find(s => s.deezerID === winnerId);
      const loserSong = currentPair.find(s => s.deezerID === loserId);
      console.log('Picking winner:', winnerSong, 'loser:', loserSong);
      await fetch(`${API_BASE_URL}/user-songs/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userID, 
          deezerID: winnerId, 
          ranking: 1200, 
          skipped: false, 
          songName: winnerSong.songName, 
          artist: winnerSong.artist,
          albumCover: winnerSong.albumCover,
          previewURL: winnerSong.previewURL,
        }),
      });
      await fetch(`${API_BASE_URL}/user-songs/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userID, 
          deezerID: loserId, 
          ranking: 1199, 
          skipped: false, 
          songName: loserSong.songName, 
          artist: loserSong.artist,
          albumCover: loserSong.albumCover,
          previewURL: loserSong.previewURL,
        }),
      });
      if (mode === 'new') {
        const updatedList = songList.filter(song => song.deezerID !== winnerId && song.deezerID !== loserId);
        setSongList(updatedList);
        getNextPair(updatedList);
      } else if (mode === 'rerank') {
        const newPair = await fetchReRankingData();
        console.log('New pair after pick:', newPair);
        setCurrentPair(newPair.length >= 2 ? newPair : []);
        setSongList([]); // Ensure songList stays empty in rerank mode
      }
    } catch (error) {
      console.error('Failed to select song:', error);
    } finally {
      setLoading(false);
    }
  };

  const skipSong = async (songId) => {
    setLoading(true);
    try {
      const skippedSong = currentPair.find(s => s.deezerID === songId);
      await fetch(`${API_BASE_URL}/user-songs/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userID, 
          deezerID: songId, 
          ranking: null, 
          skipped: true, 
          songName: skippedSong.songName, 
          artist: skippedSong.artist,
          albumCover: skippedSong.albumCover,
          previewURL: skippedSong.previewURL,
        }),
      });
      const updatedList = songList.filter(song => song.deezerID !== songId);
      setSongList(updatedList);
      const remainingSong = currentPair.find(song => song.deezerID !== songId);
      if (remainingSong && updatedList.length > 0) {
        setCurrentPair([remainingSong, updatedList[0]]);
        setSongList(updatedList.slice(1));
      } else if (remainingSong) {
        setCurrentPair([remainingSong]);
      } else {
        getNextPair(updatedList);
      }
    } catch (error) {
      console.error('Failed to skip song:', error);
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
    console.log('useEffect triggered');
    const loadInitialData = async () => {
      console.log('loadInitialData started');
      let newSongs;
      if (mode === 'new') {
        newSongs = await generateNewSongs();
      } else if (mode === 'rerank') {
        newSongs = await fetchReRankingData();
      }
      console.log('loadInitialData: newSongs:', newSongs);
      getNextPair(newSongs);
      console.log('loadInitialData completed');
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
        loading,
        mode,
        setMode,
        getNextPair,
        generateNewSongs,
        fetchReRankingData,
        selectSong,
        skipSong,
        fetchRankedSongs,
      }}
    >
      {children}
    </SongContext.Provider>
  );
};

export const useSongContext = () => useContext(SongContext);