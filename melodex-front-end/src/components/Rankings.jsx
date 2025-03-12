// frontend/src/components/Rankings.js
import React, { useEffect, useRef } from 'react';
import { useSongContext } from '../contexts/SongContext';

function Rankings() {
  const { rankedSongs, fetchRankedSongs, loading } = useSongContext();
  const userId = 'testUser'; // Match SongProvider
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current) {
      fetchRankedSongs(); // No userId param needed—handled in SongProvider
      hasFetched.current = true;
    }
  }, [fetchRankedSongs]);

  if (loading) return <p>Loading rankings...</p>;
  if (rankedSongs.length === 0) return <p>No ranked songs yet.</p>;

  return (
    <div>
      <h2>Rankings</h2>
      <ul>
        {rankedSongs.map(song => (
          <li key={song.deezerID}>
            {song.title} by {song.artist} - Rating: {song.rating}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Rankings;