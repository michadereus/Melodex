// Filepath: Melodex/melodex-front-end/src/components/SongRanker.jsx
import React, { useState, useEffect } from 'react';
import { useSongContext } from '../contexts/SongContext';
import SongFilter from './SongFilter';
import '../index.css';

const API_BASE_URL = 'http://localhost:3000/api';

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
  const [selectedGenre, setSelectedGenre] = useState('any');
  const [selectedSubgenre, setSelectedSubgenre] = useState('any');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    console.log('SongRanker useEffect setting mode:', mode, 'resetting applied to false');
    setMode(mode);
    setApplied(false);
  }, [mode, setMode]);

  useEffect(() => {
    if (mode === 'new' && applied && currentPair.length === 0 && !loading && songList.length > 0) {
      console.log('Returning to /rank, picking new pair from existing songList');
      getNextPair();
    }
  }, [mode, applied, currentPair, loading, songList, getNextPair]);

  useEffect(() => {
    if (currentPair.length > 0 && !loading) { // Removed isProcessing condition
      console.log('Current pair before processing:', currentPair);
      const isEnriched = currentPair.every(song => song.albumCover && song.previewURL);
      console.log('Is enriched:', isEnriched);
      setEnrichedPair(currentPair);
      setIsProcessing(false); // Reset immediately after setting enrichedPair
    }
  }, [currentPair, loading]); // Removed isProcessing from dependencies

  const handleApply = async (filters) => {
    console.log('Handle apply called for mode:', mode, 'with filters:', filters);
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
      setIsProcessing(false);
    } finally {
      setLoading(false);
    }
  };

  const toggleFilter = () => {
    setShowFilter(prev => !prev);
  };

  const handlePick = async (winnerId) => {
    const loserSong = enrichedPair.find((s) => s.deezerID !== winnerId);
    if (!loserSong || !loserSong.deezerID) {
      console.error('No valid loser song found in enrichedPair:', enrichedPair);
      refreshPair();
      return;
    }
    setIsProcessing(true);
    try {
      await selectSong(winnerId, loserSong.deezerID);
    } catch (error) {
      console.error('Failed to pick song:', error);
      setIsProcessing(false);
    }
  };

  const handleSkip = async (songId) => {
    setIsProcessing(true);
    try {
      await skipSong(songId);
    } catch (error) {
      console.error('Failed to skip song:', error);
      setIsProcessing(false);
    }
  };

  console.log('Rendering SongRanker, loading:', loading, 'isProcessing:', isProcessing, 'mode:', mode);
  return (
    <div>
      <div className="filter-container" style={{ height: showFilter ? 'auto' : '0', opacity: showFilter ? 1 : 0 }}>
        <SongFilter onApply={handleApply} isRankPage={mode === 'new'} onHide={toggleFilter} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '1px 0' }}>
        <button className="toggle-button" onClick={toggleFilter}>
          {showFilter ? '▲' : '▼'}
        </button>
      </div>
      {(loading || isProcessing) ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <div style={{ 
            border: '4px solid #ecf0f1', 
            borderTop: '4px solid #3498db', 
            borderRadius: '50%', 
            width: '40px', 
            height: '40px', 
            animation: 'spin 1s linear infinite' 
          }}></div>
        </div>
      ) : applied && currentPair.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '1.2em', color: '#7f8c8d' }}>
          {mode === 'rerank' ? 'No ranked songs available to re-rank yet.' : 'No more songs to rank.'}
        </p>
      ) : applied && enrichedPair.length > 0 ? (
        <div>
          <h2 style={{ textAlign: 'center', color: '#141820', fontSize: '2rem', marginBottom: '1.5rem', marginTop: '1rem' }}>
            {mode === 'new'
              ? `Rank New ${selectedGenre !== 'any' ? selectedGenre : ''} Songs`
              : `Re-rank ${selectedSubgenre !== 'any' ? selectedSubgenre : selectedGenre !== 'any' ? selectedGenre : ''} Songs`}
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            {Array.from(new Map(enrichedPair.map(song => [song.deezerID, song])).values()).map((song) => (
              <div 
                key={song.deezerID} 
                className="song-box"
                style={{ 
                  background: 'white', 
                  borderRadius: '12px', 
                  padding: '1.5rem', 
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', 
                  width: '300px', 
                  textAlign: 'center', 
                  transition: 'transform 0.2s ease', 
                  position: 'relative' 
                }}
              >
                <img src={song.albumCover} alt="Album Cover" style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem' }} />
                <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50', margin: '0.5rem 0' }}>{song.songName}</p>
                <p style={{ fontSize: '1rem', color: '#7f8c8d', margin: '0.5rem 0' }}>{song.artist}</p>
                <audio
                  controls
                  src={song.previewURL}
                  className="custom-audio-player"
                  style={{ margin: '1rem 0' }}
                  onError={(e) => {
                    console.debug('Audio preview unavailable:', song.songName);
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <span style={{ display: 'none', color: '#e74c3c', fontSize: '0.9rem', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>Preview unavailable</span>
                <button
                  onClick={() => handlePick(song.deezerID)}
                  style={{
                    background: '#3498db',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background 0.3s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseOver={(e) => e.target.style.background = '#2980b9'}
                  onMouseOut={(e) => e.target.style.background = '#3498db'}
                  disabled={loading || isProcessing}
                >
                  Pick
                </button>
                {mode === 'new' && (
                  <button
                    onClick={() => handleSkip(song.deezerID)}
                    style={{
                      background: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      marginLeft: '0.5rem',
                      transition: 'background 0.3s ease',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    }}
                    onMouseOver={(e) => e.target.style.background = '#BF4C4C'}
                    onMouseOut={(e) => e.target.style.background = '#EB5D5D'}
                    disabled={loading || isProcessing}
                  >
                    Skip
                  </button>
                )}
              </div>
            ))}
          </div>
          {mode === 'new' && !loading && currentPair.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button
                onClick={refreshPair}
                style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', transition: 'background 0.3s ease' }}
                onMouseOver={(e) => e.target.style.background = '#BF4C4C'}
                onMouseOut={(e) => e.target.style.background = '#EB5D5D'}
                disabled={loading || isProcessing}
              >
                Skip Both
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};