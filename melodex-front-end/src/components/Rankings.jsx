// melodex-front-end/src/components/Rankings.jsx
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
    setApplied(true); // Filters are optional, just proceed
  };

  if (!applied) {
    return <SongFilter onApply={handleApply} isRankPage={false} />;
  }

  if (loading) return <p style={{ textAlign: 'center', fontSize: '1.2em' }}>Loading rankings...</p>;

  const sortedRankedSongs = [...rankedSongs].sort((a, b) => b.ranking - a.ranking);

  return (
    <div>
      <h2>Your Song Rankings</h2>
      {sortedRankedSongs.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '1.2em' }}>No ranked songs yet.</p>
      ) : (
        <ul>
          {sortedRankedSongs.map((song) => (
            <li key={song.deezerID}>
              {song.songName} by {song.artist} - Ranking: {song.ranking}
              <br />
              <img src={song.albumCover} alt="Album Cover" style={{ width: '50px', height: '50px' }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Rankings;