// Melodex/melodex-front-end/src/components/Rankings.js
import React, { useEffect } from 'react';
import { useSongContext } from '../contexts/SongContext';

const Rankings = () => {
  const { rankedSongs, fetchRankedSongs, loading } = useSongContext();

  useEffect(() => {
    fetchRankedSongs();
  }, [fetchRankedSongs]);

  if (loading) return <p>Loading rankings...</p>;

  // Sort rankedSongs by ranking in descending order
  const sortedRankedSongs = [...rankedSongs].sort((a, b) => b.ranking - a.ranking);

  return (
    <div>
      <h2>Your Song Rankings</h2>
      {sortedRankedSongs.length === 0 ? (
        <p>No ranked songs yet.</p>
      ) : (
        <ul>
          {sortedRankedSongs.map((song) => (
            <li key={song.deezerID}>
              {song.songName} by {song.artist} - Ranking: {song.ranking}
              <br />
              <img src={song.albumCover} alt="Album Cover" style={{ width: '50px', height: '50px' }} />
              <audio controls src={song.previewURL} style={{ margin: '5px' }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Rankings;