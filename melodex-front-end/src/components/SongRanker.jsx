import React, { useEffect } from 'react';
import { useSongContext } from '../contexts/SongContext';

const SongRanker = ({ mode }) => {
  const { currentPair, selectSong, skipSong, loading, setMode } = useSongContext();

  useEffect(() => {
    setMode(mode);
  }, [mode, setMode]);

  console.log('SongRanker render, currentPair:', currentPair);

  if (loading) return <p>Loading...</p>;
  if (currentPair.length === 0) return <p>No more songs to rank</p>;

  return (
    <div>
      <h2>{mode === 'new' ? 'Rank New Songs' : 'Re-rank Songs'}</h2>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
        {currentPair.map((song) => (
          <div key={song.deezerID} style={{ textAlign: 'center' }}>
            <img src={song.albumCover} alt="Album Cover" style={{ width: '100px', height: '100px' }} />
            <p>{song.songName} by {song.artist}</p>
            <audio controls src={song.previewURL} style={{ margin: '5px' }} />
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
    </div>
  );
};

export default SongRanker;