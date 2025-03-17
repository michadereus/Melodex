// Melodex/melodex-front-end/src/components/SongRanker.js
import React, { useEffect } from 'react';
import { useSongContext } from '../contexts/SongContext';

const SongRanker = ({ mode }) => {
  const { currentPair, selectSong, skipSong, loading, setMode, refreshPair } = useSongContext();

  useEffect(() => {
    setMode(mode);
  }, [mode, setMode]);

  console.log('SongRanker render, currentPair:', currentPair);

  if (loading) return <p>Loading...</p>;
  if (currentPair.length === 0) return <p>No more songs to rank</p>;

  return (
    <div>
      <h2>{mode === 'new' ? 'Rank New Songs' : 'Re-rank Songs'}</h2>
      {loading ? (
        <p>Loading...</p>
      ) : currentPair.length === 0 ? (
        <p>No more songs to rank</p>
      ) : (
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
                disabled={loading} // Disable button during loading
              >
                Pick
              </button>
              {mode === 'new' && (
                <button onClick={() => skipSong(song.deezerID)} style={{ margin: '5px' }} disabled={loading}>
                  Skip
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {mode === 'new' && !loading && currentPair.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={refreshPair} style={{ padding: '10px 20px' }} disabled={loading}>
            Skip Both
          </button>
        </div>
      )}
    </div>
  );
};

export default SongRanker;