// Filepath: Melodex/melodex-front-end/src/components/Rankings.jsx
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
  const [selectedGenre, setSelectedGenre] = useState('any');
  const [selectedSubgenre, setSelectedSubgenre] = useState('any');

  useEffect(() => {
    if (applied && rankedSongs !== undefined) {
      setIsFetching(true);
      fetch(`${API_BASE_URL}/user-songs/deezer-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: rankedSongs }),
      })
        .then((response) => response.json())
        .then((freshSongs) => {
          console.log('Enriched songs for rankings:', freshSongs);
          setEnrichedSongs(freshSongs);
          setIsFetching(false);
        })
        .catch((error) => {
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
    <div className="rankings-container">
      <div className={`filter-container ${showFilter ? 'visible' : 'hidden'}`}>
        <SongFilter
          onApply={handleApply}
          isRankPage={false}
          onHide={toggleFilter}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          margin: '0.05rem 0', // Reduced from 0.5rem to 0.05rem
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', margin: '0' }}>
        <button className="filter-toggle" onClick={toggleFilter}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect y="4" width="20" height="2" rx="1" fill="#bdc3c7" className="filter-line"/>
          <rect y="9" width="20" height="2" rx="1" fill="#bdc3c7" className="filter-line"/>
          <rect y="14" width="20" height="2" rx="1" fill="#bdc3c7" className="filter-line"/>
        </svg>
        </button>
      </div>
      </div>
      {(loading || isFetching) && applied ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
          }}
        >
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
          <p
            style={{
              marginTop: '1rem',
              fontSize: '1.2em',
              color: '#7f8c8d',
              fontWeight: '600',
            }}
          >
            Loading Rankings...
          </p>
        </div>
      ) : applied ? (
        <div className="rankings-wrapper">
          <h2
            style={{
              textAlign: 'center',
              color: '#141820',
              marginBottom: '1.5rem',
              marginTop: '1rem',
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
            <p
              style={{
                textAlign: 'center',
                fontSize: '1.2em',
                color: '#7f8c8d',
              }}
            >
              No ranked songs yet for this filter.
            </p>
          ) : (
            (() => {
              const sortedSongs = [...enrichedSongs].sort(
                (a, b) => b.ranking - a.ranking
              );
              const rankPositions = getRankPositions(sortedSongs);
              return (
                <ul className="rankings-list">
                  {sortedSongs.map((song, index) => (
                    <li key={song.deezerID} className="song-box">
                      <span className="rank-position">{rankPositions[index]}</span>
                      <img
                        src={song.albumCover}
                        alt="Album Cover"
                        className="album-cover"
                      />
                      <div className="song-details">
                        <p className="song-name">{song.songName}</p>
                        <p className="song-artist">{song.artist}</p>
                        <p className="song-ranking">Ranking: {song.ranking}</p>
                        {song.previewURL && isPreviewValid(song.previewURL) ? (
                          <audio
                            controls
                            src={song.previewURL}
                            className="custom-audio-player"
                            onError={(e) => {
                              console.debug(
                                'Audio preview failed to load:',
                                song.songName,
                                e.target.error
                              );
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
                            className="preview-unavailable"
                            style={{ display: 'block' }}
                          >
                            Preview unavailable
                          </span>
                        )}
                        <span className="preview-unavailable">
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
};

export default Rankings;