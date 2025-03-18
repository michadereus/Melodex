// Melodex/melodex-front-end/src/components/Rankings.jsx
import React, { useEffect, useState } from 'react';
import { useSongContext } from '../contexts/SongContext';
import SongFilter from './SongFilter';
import '../index.css';

const API_BASE_URL = 'http://localhost:3000/api';

const Rankings = () => {
  const { rankedSongs, fetchRankedSongs, loading } = useSongContext();
  const [applied, setApplied] = useState(false);
  const [enrichedSongs, setEnrichedSongs] = useState([]);
  const [showFilter, setShowFilter] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (applied && rankedSongs !== undefined) {
      setIsFetching(true);
      fetch(`${API_BASE_URL}/user-songs/deezer-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: rankedSongs }),
      })
        .then(response => response.json())
        .then(freshSongs => {
          setEnrichedSongs(freshSongs);
          setIsFetching(false);
        })
        .catch(error => {
          console.error('Failed to enrich ranked songs:', error);
          setEnrichedSongs(rankedSongs);
          setIsFetching(false);
        });
    }
  }, [rankedSongs, applied]);

  const handleApply = async (filters) => {
    setApplied(false);
    setEnrichedSongs([]);
    setIsFetching(true);
    await fetchRankedSongs(filters.genre, filters.subgenre);
    setApplied(true);
  };

  const toggleFilter = () => {
    setShowFilter(prev => !prev);
  };

  return (
    <div>
      <div className="filter-container" style={{ height: showFilter ? 'auto' : '0', opacity: showFilter ? 1 : 0 }}>
        <SongFilter onApply={handleApply} isRankPage={false} onHide={toggleFilter} />
      </div>
      <div style={{ textAlign: 'center', margin: '1px 0' }}> {/* Reduced from '2px 0' */}
        <button className="toggle-button" onClick={toggleFilter}>
          {showFilter ? '▲' : '▼'}
        </button>
      </div>
      {(loading || isFetching) && applied ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div style={{ border: '4px solid #ecf0f1', borderTop: '4px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '1rem', fontSize: '1.2em', color: '#7f8c8d', fontWeight: '600' }}>Loading Rankings...</p>
        </div>
      ) : applied ? (
        <div style={{ width: '100%' }}>
          <h2 style={{ textAlign: 'center', color: '#141820', fontSize: '2rem', marginBottom: '0.5rem' }}> {/* Reduced from 1rem */}
            Your Song Rankings
          </h2>
          {enrichedSongs.length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: '1.2em', color: '#7f8c8d' }}>No ranked songs yet for this filter.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', width: '100%' }}>
              {[...enrichedSongs].sort((a, b) => b.ranking - a.ranking).map((song, index) => {
                const position = index === 0 || song.ranking !== enrichedSongs[index - 1].ranking ? index + 1 : null;
                return (
                  <li key={song.deezerID} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3498db', minWidth: '2rem', textAlign: 'center' }}>{position}</span>
                    <img src={song.albumCover} alt="Album Cover" style={{ width: '80px', height: '80px', borderRadius: '8px' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#141820', margin: '0' }}>{song.songName}</p>
                      <p style={{ fontSize: '1rem', color: '#7f8c8d', margin: '0.25rem 0' }}>{song.artist}</p>
                      <p style={{ fontSize: '0.9rem', color: '#3498db', margin: '0' }}>Ranking: {song.ranking}</p>
                      <audio
                        controls
                        src={song.previewURL}
                        className="custom-audio-player" // Added class
                        style={{
                          marginTop: '0.5rem', // Kept from original for spacing
                        }}
                        onError={(e) => {
                          console.debug('Audio preview unavailable:', song.songName);
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <span style={{ display: 'none', color: '#e74c3c', fontSize: '0.9rem', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>Preview unavailable</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default Rankings;