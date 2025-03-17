// Melodex/melodex-front-end/src/contexts/SongContext.jsx
import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';

const SongContext = createContext();
const API_BASE_URL = 'http://localhost:3000/api';
const userID = 'testUser';

export const useSongContext = () => {
  const context = useContext(SongContext);
  if (!context) {
    throw new Error('useSongContext must be used within a SongProvider');
  }
  return context;
};

export const SongProvider = ({ children }) => {
  const [songList, setSongList] = useState([]);
  const [currentPair, setCurrentPair] = useState([]);
  const [rankedSongs, setRankedSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('new');

  const getNextPair = useCallback((songsToUse = songList) => {
    console.log('getNextPair called, songsToUse:', songsToUse);
    const validSongs = songsToUse.filter(song => song && song.deezerID);
    
    if (validSongs.length < 2) {
      setCurrentPair([]);
      setSongList([]);
      console.log('currentPair set to empty: fewer than 2 valid songs available', validSongs);
      return;
    }

    // Select the first song
    const song1 = validSongs[0];
    // Find a second song with a different deezerID
    const song2 = validSongs.find(song => song.deezerID !== song1.deezerID);

    if (!song2) {
      console.log('No distinct second song found, removing all duplicates of', song1.deezerID);
      // Remove all songs with the same deezerID as song1
      const updatedList = validSongs.filter(song => song.deezerID !== song1.deezerID);
      setSongList(updatedList);
      // Recursively try again with the updated list
      getNextPair(updatedList);
      return;
    }

    // Set the pair with distinct songs
    const newPair = [song1, song2];
    setCurrentPair(newPair);
    // Update songList by removing the used songs
    const updatedList = validSongs.filter(
      song => song.deezerID !== song1.deezerID && song.deezerID !== song2.deezerID
    );
    setSongList(updatedList);
    console.log('currentPair set to:', newPair);
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
      console.log('generateNewSongs: newSongs:', newSongs);
      setSongList(newSongs);
      getNextPair(newSongs);
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
      console.log('fetchReRankingData started for userID:', userID);
      const response = await fetch(`${API_BASE_URL}/user-songs/rerank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID }),
      });
      if (!response.ok) throw new Error('Failed to fetch re-ranking data');
      const reRankSongs = await response.json();
      console.log('fetchReRankingData: reRankSongs:', reRankSongs);
      setSongList(reRankSongs); // Set songList for rerank mode
      getNextPair(reRankSongs); // Ensure currentPair updates
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

      const response = await Promise.race([
        fetch(`${API_BASE_URL}/user-songs/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000)
        ),
      ]);

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
      console.error('Failed to select song:', error.message, { winnerId, loserId, currentPair });
    } finally {
      setLoading(false);
    }
  };

  // In SongContext.jsx
  const skipSong = async (songId) => {
    setLoading(true);
    try {
      console.log('skipSong called with songId:', songId, 'currentPair:', currentPair);
      // Find the song to skip and the song to keep
      const skippedSong = currentPair.find(s => s.deezerID === songId);
      const keptSong = currentPair.find(s => s.deezerID !== songId);
      
      // Ensure both songs are found
      if (!skippedSong || !keptSong) {
        console.error('Skipped song or kept song not found in currentPair:', { songId, currentPair });
        return;
      }

      // Prepare payload to mark the song as skipped
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

      // Send skip request to the backend
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

      // Replace the skipped song with a new one from songList
      if (songList.length > 0) {
        const nextSong = songList[0];
        // Set new currentPair with the next song and the kept song
        setCurrentPair([nextSong, keptSong]);
        // Remove the used song from songList
        setSongList(songList.slice(1));
      } else {
        // If no songs are left, clear currentPair
        setCurrentPair([]);
      }
    } catch (error) {
      console.error('Failed to skip song:', error.message, { songId, currentPair });
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
    console.log('useEffect triggered with mode:', mode);
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
  }, [mode]); // mode is a dependency, so useEffect runs on mode change

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