// Melodex/melodex-front-end/src/components/SongRanker.jsx
import React, { useEffect } from 'react';
import { useSongContext } from '../contexts/SongContext';

export const SongRanker = ({ mode }) => {
  const { currentPair, selectSong, skipSong, loading, setMode, refreshPair } = useSongContext();

  useEffect(() => {
    console.log('SongRanker useEffect setting mode:', mode);
    setMode(mode);
  }, [mode, setMode]);

  console.log('SongRanker render, currentPair:', currentPair);

  if (loading) return <p style={{ textAlign: 'center', fontSize: '1.2em' }}>Loading...</p>;
  if (currentPair.length === 0) {
    return (
      <p style={{ textAlign: 'center', fontSize: '1.2em' }}>
        {mode === 'rerank' ? 'No ranked songs available to re-rank yet.' : 'No more songs to rank.'}
      </p>
    );
  }

  const handlePick = (winnerId) => {
    console.log('handlePick called with winnerId:', winnerId, 'currentPair:', currentPair);
    const loserSong = currentPair.find((s) => s.deezerID !== winnerId);
    if (!loserSong || !loserSong.deezerID) {
      console.error('No valid loser song found in currentPair:', currentPair);
      return;
    }
    console.log('Calling selectSong with winnerId:', winnerId, 'loserId:', loserSong.deezerID);
    selectSong(winnerId, loserSong.deezerID);
  };

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
              onClick={() => handlePick(song.deezerID)}
              style={{ margin: '5px' }}
              disabled={loading}
            >
              Pick
            </button>
            {mode === 'new' && (
              <button
                onClick={() => skipSong(song.deezerID)}
                style={{ margin: '5px' }}
                disabled={loading}
              >
                Skip
              </button>
            )}
          </div>
        ))}
      </div>
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