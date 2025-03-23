import React, { useState, useEffect } from 'react';
import { useSongContext } from '../contexts/SongContext';
import SongFilter from './SongFilter';
import '../index.css';

const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:8080/api' 
  : 'https://melodex-backend.us-east-1.elasticbeanstalk.com/api';

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
      const url = `${API_BASE_URL}/user-songs/deezer-info`;
      console.log('Enriching songs with URL:', url);

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: currentPair })
      })
        .then(response => {
          if (!response.ok) {
            console.error(`HTTP error enriching songs! Status: ${response.status}`);
            throw new Error('Failed to fetch Deezer info');
          }
          return response.text();
        })
        .then(text => {
          console.log('Raw Deezer response:', text);
          try {
            const freshSongs = JSON.parse(text);
            console.log('Enriched songs for rerank:', freshSongs);
            setEnrichedPair(freshSongs);
          } catch (error) {
            console.error('JSON parse error in SongRanker:', error, 'Raw response:', text);
            setEnrichedPair(currentPair);
          }
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
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Fetch timeout')), 10000)
        );
        const fetchPromise = fetchReRankingData(filters.genre, filters.subgenre);
        await Promise.race([fetchPromise, timeoutPromise]);
        setApplied(true);
      }
    } catch (error) {
      console.error('Error in handleApply:', error);
      setApplied(true);
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const handlePick = (winnerId) => {
    const loserId = enrichedPair.find(s => s.deezerID !== winnerId)?.deezerID;
    selectSong(winnerId, loserId);
  };

  const handleSkip = (songId) => {
    skipSong(songId);
  };

  return (
    <div className="song-ranker-container">
      <div
        className={`filter-container ${showFilter ? 'visible' : 'hidden'}`}
        style={{ width: '550px', margin: '0 auto' }}
      >
        <SongFilter onApply={handleApply} isRankPage={false} onHide={() => setShowFilter(false)} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '0' }}>
        <button className="filter-toggle" onClick={() => setShowFilter(prev => !prev)}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect y="4" width="20" height="2" rx="1" fill="#bdc3c7" className="filter-line" />
            <rect y="9" width="20" height="2" rx="1" fill="#bdc3c7" className="filter-line" />
            <rect y="14" width="20" height="2" rx="1" fill="#bdc3c7" className="filter-line" />
          </svg>
        </button>
      </div>
      {(loading || isProcessing) || !applied || !Array.isArray(enrichedPair) || enrichedPair.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div
            style={{
              border: '4px solid #ecf0f1',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 1s linear infinite',
            }}
          ></div>
          <p style={{ marginTop: '1rem', fontSize: '1.2em', color: '#7f8c8d', fontWeight: '600' }}></p>
        </div>
      ) : (
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
          <div className="song-pair" key="song-pair">
            {enrichedPair.map((song) => (
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
                    <span className="preview-unavailable" style={{ display: 'none' }}>Preview unavailable</span>
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
      )}
    </div>
  );
};

export default SongRanker;