// Filepath: Melodex/melodex-front-end/src/components/Rankings.jsx
import React, { useEffect, useState } from 'react';
import { useSongContext } from '../contexts/SongContext';
import SongFilter from './SongFilter';
import '../index.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://melodex-backend.us-east-1.elasticbeanstalk.com/api';

const Rankings = () => {
  const { rankedSongs, fetchRankedSongs, loading } = useSongContext();
  const [applied, setApplied] = useState(false);
  const [enrichedSongs, setEnrichedSongs] = useState([]);
  const [showFilter, setShowFilter] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('any');
  const [selectedSubgenre, setSelectedSubgenre] = useState('any');

  useEffect(() => {
    if (applied && rankedSongs !== undefined) {
      setIsFetching(true);
      const url = 'http://melodex-backend.us-east-1.elasticbeanstalk.com/api/user-songs/deezer-info'; // Absolute URL
      console.log('Enriching ranked songs with URL:', url);

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: rankedSongs })
      })
        .then(response => {
          if (!response.ok) {
            console.error(`HTTP error enriching ranked songs! Status: ${response.status}`);
            throw new Error('Failed to fetch Deezer info');
          }
          return response.text();
        })
        .then(text => {
          console.log('Raw Deezer response for rankings:', text);
          try {
            const freshSongs = JSON.parse(text);
            console.log('Enriched songs for rankings:', freshSongs);
            setEnrichedSongs(freshSongs);
          } catch (error) {
            console.error('JSON parse error in Rankings:', error, 'Raw response:', text);
            setEnrichedSongs(rankedSongs);
          }
        })
        .catch(error => {
          console.error('Failed to enrich ranked songs:', error);
          setEnrichedSongs(rankedSongs);
        })
        .finally(() => {
          setIsFetching(false);
        });
    }
  }, [rankedSongs, applied]);

  const handleApply = async (filters) => {
    setShowFilter(false);
    setApplied(false);
    setEnrichedSongs([]);
    setIsFetching(true);
    setSelectedGenre(filters.genre);
    setSelectedSubgenre(filters.subgenre);
    await fetchRankedSongs(filters.genre, filters.subgenre);
    setApplied(true);
  };

  const toggleFilter = () => {
    setShowFilter((prev) => !prev);
  };

  const getRankPositions = (songs) => {
    const sortedSongs = [...songs].sort((a, b) => b.ranking - a.ranking);
    const positions = [];
    let currentRank = 1;
    let previousRanking = null;

    sortedSongs.forEach((song) => {
      if (previousRanking === null || song.ranking !== previousRanking) {
        positions.push(currentRank);
        currentRank += 1;
      } else {
        positions.push(positions[positions.length - 1]);
      }
      previousRanking = song.ranking;
    });

    return positions;
  };

  const isPreviewValid = (url) => {
    if (!url) return false;
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const exp = parseInt(urlParams.get('hdnea')?.split('exp=')[1]?.split('~')[0], 10);
    const now = Math.floor(Date.now() / 1000);
    return exp && exp > now;
  };

  return (
    <div className="rankings-container" style={{ maxWidth: '1200px', width: '100%' }}>
      {/* Filter Container with Inline Width */}
      <div
        className={`filter-container ${showFilter ? 'visible' : 'hidden'}`}
        style={{ width: '550px', margin: '0 auto' }} // Centered, doesn't affect grid width
      >
        <SongFilter onApply={handleApply} isRankPage={false} onHide={toggleFilter} />
      </div>

      {/* Filter Toggle Button with Animation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          margin: '0',
          transition: 'transform 0.3s ease',
          transform: showFilter ? 'translateY(0.5rem)' : 'translateY(0)',
        }}
      >
        <button className="filter-toggle" onClick={toggleFilter}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect y="4" width="20" height="2" rx="1" fill="#bdc3c7" className="filter-line" />
            <rect y="9" width="20" height="2" rx="1" fill="#bdc3c7" className="filter-line" />
            <rect y="14" width="20" height="2" rx="1" fill="#bdc3c7" className="filter-line" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      {(loading || isFetching) && applied ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div
            style={{
              border: '4px solid #ecf0f1',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 1s linear infinite',
            }}
          ></div>
          <p style={{ marginTop: '1rem', fontSize: '1.2em', color: '#7f8c8d', fontWeight: '600' }}>
            
          </p>
        </div>
      ) : applied ? (
        <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
          <h2
            style={{
              textAlign: 'center',
              color: '#141820',
              marginBottom: '1.5rem',
              marginTop: '4rem',
            }}
          >
            Your{' '}
            {selectedSubgenre !== 'any'
              ? selectedSubgenre
              : selectedGenre !== 'any'
              ? selectedGenre
              : ''}{' '}
            Rankings
          </h2>
          {enrichedSongs.length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: '1.2em', color: '#7f8c8d' }}>
              No ranked songs yet for this filter.
            </p>
          ) : (
            (() => {
              const sortedSongs = [...enrichedSongs].sort((a, b) => b.ranking - a.ranking);
              const rankPositions = getRankPositions(sortedSongs);
              return (
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    display: 'grid',
                    gap: '1.5rem',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    width: '100%',
                  }}
                >
                  {sortedSongs.map((song, index) => (
                    <li
                      key={song.deezerID}
                      className="song-box"
                      style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.5rem',
                        position: 'relative',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: '700',
                          color: '#3498db',
                          minWidth: '2rem',
                          textAlign: 'center',
                        }}
                      >
                        {rankPositions[index]}
                      </span>
                      <img
                        src={song.albumCover}
                        alt="Album Cover"
                        style={{ width: '80px', height: '80px', borderRadius: '8px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#141820', margin: '0' }}>
                          {song.songName}
                        </p>
                        <p style={{ fontSize: '1rem', color: '#7f8c8d', margin: '0.25rem 0' }}>{song.artist}</p>
                        <p style={{ fontSize: '0.9rem', color: '#3498db', margin: '0' }}>
                          Ranking: {song.ranking}
                        </p>
                        {song.previewURL && isPreviewValid(song.previewURL) ? (
                          <audio
                            controls
                            src={song.previewURL}
                            className="custom-audio-player"
                            style={{ marginTop: '0.5rem' }}
                            onError={(e) => {
                              console.debug('Audio preview failed to load:', song.songName, e.target.error);
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                            onCanPlay={(e) => {
                              e.target.style.display = 'block';
                              e.target.nextSibling.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span
                            style={{ display: 'block', color: '#e74c3c', fontSize: '0.9rem', marginTop: '0.5rem' }}
                          >
                            Preview unavailable
                          </span>
                        )}
                        <span
                          style={{
                            display: 'none',
                            color: '#e74c3c',
                            fontSize: '0.9rem',
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          Preview unavailable
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              );
            })()
          )}
        </div>
      ) : null}
    </div>
  );

}

export default Rankings;