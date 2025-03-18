// Melodex/melodex-front-end/src/components/Rankings.jsx
import React, { useEffect, useState } from 'react';
import { useSongContext } from '../contexts/SongContext';
import SongFilter from './SongFilter';

const Rankings = () => {
  const { rankedSongs, fetchRankedSongs, loading } = useSongContext();
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    console.log('Rankings useEffect: Fetching ranked songs');
    if (applied) {
      fetchRankedSongs();
    }
  }, [fetchRankedSongs, applied]);

  const handleApply = () => {
    setApplied(true);
  };

  if (!applied) {
    return <SongFilter onApply={handleApply} isRankPage={false} />;
  }

  if (loading) return <p style={{ textAlign: 'center', fontSize: '1.2em', color: '#7f8c8d' }}>Loading rankings...</p>;

  const sortedRankedSongs = [...rankedSongs].sort((a, b) => b.ranking - a.ranking);

  // Assign listing numbers with ties
  let currentPosition = 0;
  const rankedWithPositions = sortedRankedSongs.map((song, index) => {
    if (index === 0 || song.ranking !== sortedRankedSongs[index - 1].ranking) {
      currentPosition += 1;
    }
    return { ...song, position: currentPosition };
  });

  return (
    <div style={{ width: '100%' }}> {/* Ensure container takes full width */}
      <h2 style={{ textAlign: 'center', color: '#2c3e50', fontSize: '2rem', marginBottom: '2rem' }}>
        Your Song Rankings
      </h2>
      {rankedWithPositions.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '1.2em', color: '#7f8c8d' }}>No ranked songs yet.</p>
      ) : (
        <ul style={{
          listStyle: 'none',
          padding: 0,
          display: 'grid',
          gap: '1.5rem',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', // Multi-column grid
          width: '100%' // Full width to match main
        }}>
          {rankedWithPositions.map((song) => (
            <li key={song.deezerID} style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
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
              <div>
                <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50', margin: '0' }}>
                  {song.songName}
                </p>
                <p style={{ fontSize: '1rem', color: '#7f8c8d', margin: '0.25rem 0' }}>{song.artist}</p>
                <p style={{ fontSize: '0.9rem', color: '#3498db', margin: '0' }}>Ranking: {song.ranking}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Rankings;