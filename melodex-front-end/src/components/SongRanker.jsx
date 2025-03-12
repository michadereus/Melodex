import React, { useEffect } from 'react';
import { useSongContext } from '../contexts/SongContext';

function SongRanker({ mode }) {
  const { setMode, currentPair, loading, selectSong, skipSong, skipBothSongs } = useSongContext();

  useEffect(() => {
    setMode(mode);
  }, [mode, setMode]);

  if (loading) return <p>Loading...</p>;
  if (currentPair.length === 0) return <p>All songs ranked!</p>;

  return (
    <div>
      <h2>{mode === 'new' ? 'Rank New Songs' : 'Re-rank Songs'}</h2>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
        {currentPair.map(song => (
          <div key={song.deezerID} style={{ textAlign: 'center' }}>
            <p>{song.title}</p>
            <button onClick={() => selectSong(song.deezerID, currentPair.find(s => s.deezerID !== song.deezerID)?.deezerID)}>
              Pick
            </button>
            <button onClick={() => skipSong(song.deezerID)}>
              Skip
            </button>
          </div>
              ))}
            </div>
      {currentPair.length === 2 && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={skipBothSongs}>Skip Both</button>
        </div>
      )}
    </div>
  );
}

export default SongRanker;