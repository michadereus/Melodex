import React, { useEffect, useRef } from 'react';
import { useSongContext } from '../contexts/SongContext';

function Rankings() {
  const { rankedSongs, fetchRankedSongs, loading } = useSongContext();
  const tempUserId = 'temp';
  const hasFetched = useRef(false);

  useEffect(() => {
    console.log('Rankings useEffect triggered, hasFetched:', hasFetched.current);
    if (!hasFetched.current) {
      fetchRankedSongs(tempUserId);
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
          <li key={song.id}>{song.name} - Rating: {song.rating}</li>
        ))}
      </ul>
    </div>
  );
}

export default Rankings;