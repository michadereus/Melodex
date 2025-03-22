// Filepath: Melodex/melodex-front-end/src/components/SongRanker.jsx
import React, { useState, useEffect } from 'react';
import { useSongContext } from '../contexts/SongContext';
import SongFilter from './SongFilter';
import '../index.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const SongRanker = ({ mode }) => {
  const { 
    currentPair, 
    selectSong, 
    skipSong, 
    loading, 
    setLoading, 
    setMode, 
    refreshPair, 
    generateNewSongs, 
    fetchReRankingData, 
    getNextPair, 
    songList 
  } = useSongContext();
  const [applied, setApplied] = useState(false);
  const [enrichedPair, setEnrichedPair] = useState([]);
  const [showFilter, setShowFilter] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setMode(mode);
    setApplied(false);
  }, [mode, setMode]);

  useEffect(() => {
    if (mode === 'new' && applied && currentPair.length === 0 && !loading && songList.length > 0) {
      getNextPair();
    }
  }, [mode, applied, currentPair, loading, songList, getNextPair]);

  useEffect(() => {
    if (currentPair.length > 0 && !loading) {
      console.log(`Mode: ${mode}, Current pair updated:`, currentPair.map(s => ({
        songName: s.songName,
        previewURL: s.previewURL,
      })));
      setIsProcessing(true);
      fetch(`${API_BASE_URL}/user-songs/deezer-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: currentPair }),
      })
        .then(response => response.json())
        .then(freshSongs => {
          console.log('Enriched songs for rerank:', freshSongs);
          setEnrichedPair(freshSongs);
        })
        .catch(error => {
          console.error('Failed to enrich songs for rerank:', error);
          setEnrichedPair(currentPair);
        })
        .finally(() => {
          setIsProcessing(false);
        });
    }
  }, [currentPair, loading, mode]);

  const handleApply = async (filters) => {
    setShowFilter(false);
    setApplied(false);
    setEnrichedPair([]);
    setIsProcessing(true);
    try {
      if (mode === 'new') {
        await generateNewSongs(filters);
        setApplied(true);
      } else if (mode === 'rerank') {
        await fetchReRankingData(filters.genre, filters.subgenre);
        setApplied(true);
      }
    } catch (error) {
      console.error('Error in handleApply:', error);
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const toggleFilter = () => {
    setShowFilter(prev => !prev);
  };

  const handlePick = async (winnerId) => {
    const loserSong = enrichedPair.find((s) => s.deezerID !== winnerId);
    if (!loserSong || !loserSong.deezerID) {
      refreshPair();
      return;
    }
    setIsProcessing(true);
    try {
      await selectSong(winnerId, loserSong.deezerID);
    } catch (error) {
      console.error('Failed to pick song:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = async (songId) => {
    setIsProcessing(true);
    try {
      console.log(`Skipping song ${songId} in mode: ${mode}`);
      await skipSong(songId);
      console.log('Post-skip currentPair:', currentPair.map(s => ({
        songName: s.songName,
        previewURL: s.previewURL,
      })));
      if (currentPair.length === 0 || currentPair.length < 2) {
        console.log('Fetching next pair after skip in mode:', mode);
        await getNextPair();
      }
    } catch (error) {
      console.error('Failed to skip song:', error);
      console.log('Falling back to fetch next pair after skip failure');
      await getNextPair();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="song-ranker-container">
      {/* Filter Container with Dynamic Width */}
      <div
        className={`filter-container ${mode === 'rerank' ? 'filter-rerank' : ''} ${showFilter ? 'visible' : 'hidden'}`}
        style={{ width: mode === 'rerank' ? '550px' : '700px' }} // Set width inline
      >
        <SongFilter onApply={handleApply} isRankPage={mode === 'new'} onHide={toggleFilter} />
      </div>

      {/* Filter Toggle Button with Animation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          margin: '0',
          transition: 'transform 0.3s ease', // Smooth animation
          transform: showFilter ? 'translateY(0.5rem)' : 'translateY(0)', // Moves down when filter opens
        }}
      >
        <button className="filter-toggle" onClick={toggleFilter}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect y="4" width="20" height="2" rx="1" fill="#bdc3c7" className="filter-line" />
            <rect y="9" width="20" height="2" rx="1" fill="#bdc3c7" className="filter-line" />
            <rect y="14" width="20" height="2" rx="1" fill="#bdc3c7" className="filter-line" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      {(loading || isProcessing) ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <div
            style={{
              border: '4px solid #e0e0e0',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              animation: 'spin 1s linear infinite',
            }}
          ></div>
        </div>
      ) : applied && currentPair.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '1.1rem', color: '#666' }}>
          {mode === 'rerank' ? 'No ranked songs available to re-rank yet.' : 'No more songs to rank.'}
        </p>
      ) : applied && enrichedPair.length > 0 ? (
        <div className="song-ranker-wrapper">
          <h2
            style={{
              textAlign: 'center',
              color: '#141820',
              marginBottom: '1.5rem',
              marginTop: '4rem',
            }}
          >
            {mode === 'new' ? 'Rank New Songs' : 'Re-rank Songs'}
          </h2>
          <div className="song-pair">
            {Array.from(new Map(enrichedPair.map(song => [song.deezerID, song])).values()).map((song) => (
              <div key={song.deezerID} className="song-card-container">
                <div
                  className="song-box"
                  onClick={() => handlePick(song.deezerID)}
                  style={{ cursor: 'pointer' }}
                >
                  <img src={song.albumCover} alt="Album Cover" className="album-cover" />
                  <div className="song-details">
                    <p className="song-name">{song.songName}</p>
                    <p className="song-artist">{song.artist}</p>
                    {song.previewURL ? (
                      <audio
                        controls
                        src={song.previewURL}
                        className="custom-audio-player"
                        onError={(e) => {
                          console.debug('Audio preview failed to load:', song.songName, e.target.error);
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                        onCanPlay={(e) => {
                          console.log('Audio can play for:', song.songName);
                          e.target.style.display = 'block';
                          e.target.nextSibling.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="preview-unavailable" style={{ display: 'block' }}>Preview unavailable</span>
                    )}
                    <span className="preview-unavailable">Preview unavailable</span>
                  </div>
                </div>
                <button
                  className="refresh-icon-btn"
                  onClick={() => handleSkip(song.deezerID)}
                  disabled={loading || isProcessing}
                  title={`Refresh ${song.songName}`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z"
                      fill="#bdc3c7"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default SongRanker;