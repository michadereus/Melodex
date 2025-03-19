// Melodex/melodex-front-end/src/components/SongRanker.jsx
import React, { useState, useEffect } from 'react';
import { useSongContext } from '../contexts/SongContext';
import SongFilter from './SongFilter';
import '../index.css';

const API_BASE_URL = 'http://localhost:3000/api';

export const SongRanker = ({ mode }) => {
  const { currentPair, selectSong, skipSong, loading, setLoading, setMode, refreshPair, generateNewSongs, fetchReRankingData, getNextPair, songList } = useSongContext();
  const [applied, setApplied] = useState(false);
  const [enrichedPair, setEnrichedPair] = useState([]);
  const [showFilter, setShowFilter] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('any'); 
  const [selectedSubgenre, setSelectedSubgenre] = useState('any'); 

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
    if (currentPair.length > 0 && !loading) {
      fetch(`${API_BASE_URL}/user-songs/deezer-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: currentPair }),
      })
        .then(response => response.json())
        .then(enrichedSongs => setEnrichedPair(enrichedSongs))
        .catch(error => {
          console.error('Failed to enrich songs:', error);
          setEnrichedPair(currentPair);
        });
    }
  }, [currentPair, loading]);

  const handleApply = async (filters) => {
    console.log('Handle apply called for mode:', mode, 'with filters:', filters);
    setApplied(false);
    setEnrichedPair([]);
    setSelectedGenre(filters.genre);
    setSelectedSubgenre(filters.subgenre);
    if (mode === 'new') {
      setLoading(true);
      try {
        await generateNewSongs(filters);
        setApplied(true);
      } catch (error) {
        console.error('Error in handleApply:', error);
      } finally {
        setLoading(false);
      }
    } else if (mode === 'rerank') {
      await fetchReRankingData(filters.genre, filters.subgenre);
      setApplied(true);
    }
  };

  const toggleFilter = () => {
    setShowFilter(prev => !prev);
  };

  const handlePick = (winnerId) => {
    const loserSong = enrichedPair.find((s) => s.deezerID !== winnerId);
    if (!loserSong || !loserSong.deezerID) {
      console.error('No valid loser song found in enrichedPair:', enrichedPair);
      refreshPair();
      return;
    }
    selectSong(winnerId, loserSong.deezerID);
  };

  console.log('Rendering SongRanker, loading:', loading, 'mode:', mode);

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
      {loading && mode === 'new' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div style={{ border: '4px solid #ecf0f1', borderTop: '4px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '1rem', fontSize: '1.2em', color: '#7f8c8d', fontWeight: '600' }}>Generating New Songs...</p>
        </div>
      ) : applied && currentPair.length === 0 && !loading ? (
        <p style={{ textAlign: 'center', fontSize: '1.2em', color: '#7f8c8d' }}>
          {mode === 'rerank' ? 'No ranked songs available to re-rank yet.' : 'No more songs to rank.'}
        </p>
      ) : applied ? (
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
                className="song-box" // Added className for hover effect
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
                  disabled={loading}
                >
                  Pick
                </button>
                {mode === 'new' && (
                  <button
                    onClick={() => skipSong(song.deezerID)}
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
                    disabled={loading}
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
                disabled={loading}
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