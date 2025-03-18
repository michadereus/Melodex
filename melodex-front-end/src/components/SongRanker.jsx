// Melodex/melodex-front-end/src/components/SongRanker.jsx
import React, { useState, useEffect } from 'react';
import { useSongContext } from '../contexts/SongContext';
import SongFilter from './SongFilter';

export const SongRanker = ({ mode }) => {
  const { currentPair, selectSong, skipSong, loading, setMode, refreshPair, generateNewSongs, fetchReRankingData, getNextPair } = useSongContext();
  const [applied, setApplied] = useState(false);
  const [enrichedPair, setEnrichedPair] = useState([]);

  useEffect(() => {
    console.log('SongRanker useEffect setting mode:', mode, 'resetting applied to false');
    setMode(mode);
    setApplied(false);
  }, [mode, setMode]);

  useEffect(() => {
    if (mode === 'new' && applied && currentPair.length === 0 && !loading) {
      console.log('Returning to /rank, picking new pair from existing songList');
      getNextPair();
    }
  }, [mode, applied, currentPair, loading, getNextPair]);

  // Enrich currentPair with fresh Deezer data
  useEffect(() => {
    if (currentPair.length > 0 && !loading) {
      fetch(`${API_BASE_URL}/user-songs/deezer-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: currentPair })
      })
        .then(response => response.json())
        .then(enrichedSongs => {
          setEnrichedPair(enrichedSongs);
        })
        .catch(error => {
          console.error('Failed to enrich songs:', error);
          setEnrichedPair(currentPair); // Fallback to original pair
        });
    }
  }, [currentPair, loading]);

  const handleApply = (filters) => {
    console.log('Handle apply called for mode:', mode, 'with filters:', filters);
    if (mode === 'new') {
      generateNewSongs(filters).then(() => setApplied(true));
    } else if (mode === 'rerank') {
      fetchReRankingData().then(() => setApplied(true));
    }
  };

  if (!applied) {
    return <SongFilter onApply={handleApply} isRankPage={mode === 'new'} />;
  }

  if (loading) return <p style={{ textAlign: 'center', fontSize: '1.2em', color: '#7f8c8d' }}>Loading...</p>;

  if (currentPair.length === 0 && !loading) {
    return (
      <p style={{ textAlign: 'center', fontSize: '1.2em', color: '#7f8c8d' }}>
        {mode === 'rerank' ? 'No ranked songs available to re-rank yet.' : 'No more songs to rank.'}
      </p>
    );
  }

  const handlePick = (winnerId) => {
    const loserSong = enrichedPair.find((s) => s.deezerID !== winnerId);
    if (!loserSong || !loserSong.deezerID) {
      console.error('No valid loser song found in enrichedPair:', enrichedPair);
      refreshPair();
      return;
    }
    selectSong(winnerId, loserSong.deezerID);
  };

  const uniqueCurrentPair = Array.from(new Map(enrichedPair.map(song => [song.deezerID, song])).values());

  return (
    <div>
      <h2 style={{ textAlign: 'center', color: '#2c3e50', fontSize: '2rem', marginBottom: '2rem' }}>
        {mode === 'new' ? 'Rank New Songs' : 'Re-rank Songs'}
      </h2>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
        {uniqueCurrentPair.map((song) => (
          <div key={song.deezerID} style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            width: '300px',
            textAlign: 'center',
            transition: 'transform 0.2s ease',
            position: 'relative'
          }}>
            <img src={song.albumCover} alt="Album Cover" style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem' }} />
            <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50', margin: '0.5rem 0' }}>
              {song.songName}
            </p>
            <p style={{ fontSize: '1rem', color: '#7f8c8d', margin: '0.5rem 0' }}>{song.artist}</p>
            <audio
              controls
              src={song.previewURL}
              style={{ width: '100%', margin: '1rem 0' }}
              onError={(e) => {
                console.debug('Audio preview unavailable:', song.songName);
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <span style={{
              display: 'none',
              color: '#e74c3c',
              fontSize: '0.9rem',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}>
              Preview unavailable
            </span>
            <button
              onClick={() => handlePick(song.deezerID)}
              style={{
                background: '#3498db',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'background 0.3s ease'
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
                  cursor: 'pointer',
                  marginLeft: '0.5rem',
                  transition: 'background 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.background = '#c0392b'}
                onMouseOut={(e) => e.target.style.background = '#e74c3c'}
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
            style={{
              background: '#7f8c8d',
              color: 'white',
              border: 'none',
              padding: '0.75rem 2rem',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'background 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.background = '#95a5a6'}
            onMouseOut={(e) => e.target.style.background = '#7f8c8d'}
            disabled={loading}
          >
            Skip Both
          </button>
        </div>
      )}
    </div>
  );
};

// Add this constant at the top of the file if not already present
const API_BASE_URL = 'http://localhost:3000/api';