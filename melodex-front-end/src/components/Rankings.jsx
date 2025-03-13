import React, { useEffect } from 'react';
import { useSongContext } from '../contexts/SongContext';

const Rankings = () => {
  const { rankedSongs, fetchRankedSongs, loading } = useSongContext();

  useEffect(() => {
    fetchRankedSongs();
  }, [fetchRankedSongs]);

  if (loading) return <p>Loading rankings...</p>;
  if (rankedSongs.length === 0) return <p>No ranked songs yet.</p>;

  return (
    <div>
      <h2>Your Song Rankings</h2>
      <ul>
        {rankedSongs.map((song) => (
          <li key={song.deezerID}>
            {song.songName} by {song.artist} - Ranking: {song.ranking}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Rankings;