// Melodex/melodex-front-end/src/components/SongRanker.jsx
import React, { useState, useEffect } from 'react';
import { useSongContext } from '../contexts/SongContext';
import SongFilter from './SongFilter';

export const SongRanker = ({ mode }) => {
  const { currentPair, selectSong, skipSong, loading, setMode, refreshPair, generateNewSongs, fetchReRankingData, getNextPair } = useSongContext();
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    console.log('SongRanker useEffect setting mode:', mode, 'resetting applied to false');
    setMode(mode);
    setApplied(false);
  }, [mode, setMode]);

  // Automatically get a new pair when returning to /rank with an existing songList
  useEffect(() => {
    if (mode === 'new' && applied && currentPair.length === 0 && !loading) {
      console.log('Returning to /rank, picking new pair from existing songList');
      getNextPair();
    }
  }, [mode, applied, currentPair, loading, getNextPair]);

  const handleApply = (filters) => {
    console.log('Handle apply called for mode:', mode, 'with filters:', filters);
    if (mode === 'new') {
      generateNewSongs(filters).then(() => setApplied(true));
    } else if (mode === 'rerank') {
      fetchReRankingData().then(() => setApplied(true));
    }
  };

  console.log('SongRanker render, mode:', mode, 'applied:', applied, 'currentPair:', currentPair);

  if (!applied) {
    console.log('Rendering SongFilter for mode:', mode);
    return <SongFilter onApply={handleApply} isRankPage={mode === 'new'} />;
  }

  if (loading) return <p style={{ textAlign: 'center', fontSize: '1.2em' }}>Loading...</p>;

  if (currentPair.length === 0 && !loading) {
    console.log('No songs available for mode:', mode);
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
      refreshPair();
      return;
    }
    console.log('Calling selectSong with winnerId:', winnerId, 'loserId:', loserSong.deezerID);
    selectSong(winnerId, loserSong.deezerID);
  };

  const uniqueCurrentPair = Array.from(
    new Map(currentPair.map(song => [song.deezerID, song])).values()
  );

  return (
    <div>
      <h2>{mode === 'new' ? 'Rank New Songs' : 'Re-rank Songs'}</h2>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
        {uniqueCurrentPair.map((song) => (
          <div key={song.deezerID} style={{ textAlign: 'center' }}>
            <img src={song.albumCover} alt="Album Cover" style={{ width: '100px', height: '100px' }} />
            <p>{song.songName} by {song.artist}</p>
            <audio
              controls
              src={song.previewURL}
              style={{ margin: '5px' }}
              onError={(e) => console.warn('Audio preview failed:', e.target.error)}
            />
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