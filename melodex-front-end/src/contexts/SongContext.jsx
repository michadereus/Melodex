// Melodex/melodex-front-end/src/contexts/SongContext.js
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
    } else {
      setCurrentPair([]);
      setSongList([]);
      console.log('currentPair set to empty: fewer than 2 songs available');
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
      console.log('fetchReRankingData: reRankSongs:', reRankSongs);
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
      if (!loserId) {
        console.log('No loserId provided, aborting');
        return;
      }
      const winnerSong = currentPair.find(s => s.deezerID === winnerId);
      const loserSong = currentPair.find(s => s.deezerID === loserId);
      console.log('Winner song:', winnerSong);
      console.log('Loser song:', loserSong);

      if (!winnerSong || !loserSong) {
        console.error('Winner or loser song not found in currentPair');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/user-songs/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
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
      setCurrentPair([]);
      const updatedList = songList.filter(song => song.deezerID !== songId);
      setSongList(updatedList);
      getNextPair(updatedList);
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
      const uniqueRanked = ranked.reduce((acc, song) => {
        acc[song.deezerID] = song;
        return acc;
      }, {});
      setRankedSongs(Object.values(uniqueRanked));
      console.log('fetchRankedSongs: rankedSongs:', Object.values(uniqueRanked));
    } catch (error) {
      console.error('Failed to fetch ranked songs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPair = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'new' && currentPair.length === 2) {
        // Skip both songs in currentPair
        await Promise.all([
          skipSong(currentPair[0].deezerID),
          skipSong(currentPair[1].deezerID),
        ]);
        // currentPair is already cleared by skipSong, so just fetch next pair
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
        refreshPair,
      }}
    >
      {children}
    </SongContext.Provider>
  );
};

export const useSongContext = () => useContext(SongContext);