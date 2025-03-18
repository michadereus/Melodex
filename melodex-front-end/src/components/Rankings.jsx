// Melodex/melodex-front-end/src/components/Rankings.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useSongContext } from '../contexts/SongContext';
import SongFilter from './SongFilter';

const API_BASE_URL = 'http://localhost:3000/api';

const Rankings = () => {
  const { rankedSongs, fetchRankedSongs, loading, selectedGenre } = useSongContext();
  const [applied, setApplied] = useState(false);
  const [enrichedSongs, setEnrichedSongs] = useState([]);
  const hasFetched = useRef(false);

  useEffect(() => {
    console.log('Rankings useEffect: Fetching ranked songs');
    if (applied && !hasFetched.current) {
      hasFetched.current = true;
      fetchRankedSongs(selectedGenre);
    }
  }, [fetchRankedSongs, applied, selectedGenre]);

  useEffect(() => {
    if (applied && rankedSongs.length > 0) {
      fetch(`${API_BASE_URL}/user-songs/deezer-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: rankedSongs })
      })
        .then(response => response.json())
        .then(freshSongs => setEnrichedSongs(freshSongs))
        .catch(error => {
          console.error('Failed to enrich ranked songs:', error);
          setEnrichedSongs(rankedSongs);
        });
    }
  }, [rankedSongs, applied]);

  const handleApply = async (filters) => {
    hasFetched.current = false; // Reset to refetch with new genre
    setApplied(true);
  };

  if (!applied) {
    return <SongFilter onApply={handleApply} isRankPage={false} />;
  }

  // Show loading indicator when loading or when enrichedSongs is empty but fetch is in progress
  if (loading || (applied && enrichedSongs.length === 0)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
      }}>
        <div style={{
          border: '4px solid #ecf0f1',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite',
        }}></div>
        <p style={{ 
          marginTop: '1rem', 
          fontSize: '1.2em', 
          color: '#7f8c8d', 
          fontWeight: '600' 
        }}>
          Loading Rankings...
        </p>
      </div>
    );
  }

  const sortedRankedSongs = [...enrichedSongs].sort((a, b) => b.ranking - a.ranking);
  let currentPosition = 0;
  const rankedWithPositions = sortedRankedSongs.map((song, index) => {
    if (index === 0 || song.ranking !== sortedRankedSongs[index - 1].ranking) {
      currentPosition += 1;
    }
    return { ...song, position: currentPosition };
  });

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ textAlign: 'center', color: '#2c3e50', fontSize: '2rem', marginBottom: '2rem' }}>
        Your Song Rankings
      </h2>
      {rankedWithPositions.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '1.2em', color: '#7f8c8d' }}>
          No ranked songs yet for this genre.
        </p>
      ) : (
        <ul style={{
          listStyle: 'none',
          padding: 0,
          display: 'grid',
          gap: '1.5rem',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          width: '100%'
        }}>
          {rankedWithPositions.map((song) => (
            <li key={song.deezerID} style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              position: 'relative'
            }}>
              <span style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#3498db',
                minWidth: '2rem',
                textAlign: 'center'
              }}>
                {song.position}
              </span>
              <img src={song.albumCover} alt="Album Cover" style={{ width: '80px', height: '80px', borderRadius: '8px' }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50', margin: '0' }}>
                  {song.songName}
                </p>
                <p style={{ fontSize: '1rem', color: '#7f8c8d', margin: '0.25rem 0' }}>{song.artist}</p>
                <p style={{ fontSize: '0.9rem', color: '#3498db', margin: '0' }}>Ranking: {song.ranking}</p>
                <audio
                  controls
                  src={song.previewURL}
                  style={{ width: '100%', marginTop: '0.5rem' }}
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Rankings;