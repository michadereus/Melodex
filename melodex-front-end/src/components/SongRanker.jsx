import React from 'react';
import { useSongContext } from '../contexts/SongContext';

const SongRanker = ({ mode }) => {
  const { currentPair, selectSong, skipSong, skipBothSongs, loading } = useSongContext();

  if (loading) return <p>Loading...</p>;
  if (currentPair.length === 0) return <p>No songs to rank</p>;

  return (
    <div>
      <h2>{mode === 'new' ? 'Rank New Songs' : 'Re-rank Songs'}</h2>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
        {currentPair.map((song) => (
          <div key={song.deezerID} style={{ textAlign: 'center' }}>
            <p>
              {song.songName} by {song.artist}
            </p>
            <button
              onClick={() =>
                selectSong(song.deezerID, currentPair.find((s) => s.deezerID !== song.deezerID)?.deezerID)
              }
              style={{ margin: '5px' }}
            >
              Pick
            </button>
            {mode === 'new' && (
              <button onClick={() => skipSong(song.deezerID)} style={{ margin: '5px' }}>
                Skip
              </button>
            )}
          </div>
        ))}
      </div>
      {mode === 'new' && currentPair.length === 2 && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={skipBothSongs}>Skip Both</button>
        </div>
      )}
    </div>
  );
};

export default SongRanker;