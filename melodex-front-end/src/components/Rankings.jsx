// Filepath: Melodex/melodex-front-end/src/components/Rankings.jsx
import { useSongContext } from '../contexts/SongContext';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useVolumeContext } from '../contexts/VolumeContext';
import SongFilter from './SongFilter';
import '../index.css';

const Rankings = () => {
  const { rankedSongs, fetchRankedSongs, loading, userID } = useSongContext();
  const { volume, setVolume, playingAudioRef, setPlayingAudioRef } = useVolumeContext();
  const [applied, setApplied] = useState(false);
  const [enrichedSongs, setEnrichedSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [showFilter, setShowFilter] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('any');
  const [selectedSubgenre, setSelectedSubgenre] = useState('any');
  const [lastAppliedFilters, setLastAppliedFilters] = useState({ genre: 'any', subgenre: 'any' });
  const audioRefs = useRef([]);

  // Trigger initial fetch when userID becomes available
  useEffect(() => {
    if (userID && !applied) {
      console.log('Initial fetch triggered for /rankings');
      handleApply({ genre: 'any', subgenre: 'any', decade: 'all decades' });
    }
  }, [userID, applied]);

  // Enrich songs after rankedSongs updates
  const enrichAndFilterSongs = useCallback(async () => {
    if (!applied || !rankedSongs) return;

    console.log('Enriching rankedSongs:', rankedSongs);
    setIsFetching(true);
    const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/user-songs/deezer-info`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: rankedSongs }),
      });

      if (!response.ok) throw new Error(`Failed to fetch Deezer info: ${response.status}`);
      const freshSongs = await response.json();
      console.log('Enriched songs received:', freshSongs);

      const refreshPromises = freshSongs.map(async (song) => {
        if (song.previewURL && !isPreviewValid(song.previewURL)) {
          console.log(`Preview URL expired for ${song.songName}, refreshing...`);
          const refreshUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/user-songs/deezer-info`;
          const refreshResponse = await fetch(refreshUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ songs: [song] }),
          });
          if (refreshResponse.ok) {
            const [refreshedSong] = await refreshResponse.json();
            return { ...song, previewURL: refreshedSong.previewURL };
          }
        }
        return song;
      });

      const updatedSongs = await Promise.all(refreshPromises);
      setEnrichedSongs(updatedSongs);
      setFilteredSongs(updatedSongs); // Use the enriched songs directly
    } catch (error) {
      console.error('Failed to enrich ranked songs:', error);
      setEnrichedSongs([]);
      setFilteredSongs([]); // Clear filtered songs on error
    } finally {
      setIsFetching(false);
      console.log('isFetching set to false');
    }
  }, [applied, rankedSongs]);

  useEffect(() => {
    enrichAndFilterSongs();
  }, [enrichAndFilterSongs]);

  useEffect(() => {
    audioRefs.current.forEach(audio => {
      if (audio) {
        audio.volume = volume;
      }
    });
  }, [volume, filteredSongs]);

  const handleApply = async (filters) => {
    if (!userID) {
      console.log('No userID available, skipping fetch');
      return;
    }

    setShowFilter(false);
    setEnrichedSongs([]);
    setFilteredSongs([]);
    setIsFetching(true);
    setSelectedGenre(filters.genre);
    setSelectedSubgenre(filters.subgenre);
    setLastAppliedFilters({ genre: filters.genre, subgenre: filters.subgenre });

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Fetch timeout')), 60000)
      );
      const fetchedSongs = await Promise.race([
        fetchRankedSongs({ userID, genre: filters.genre, subgenre: filters.subgenre }),
        timeoutPromise
      ]);
      setApplied(true); // Set applied to true only after fetch completes
    } catch (error) {
      console.error('handleApply error:', error);
      setApplied(true);
      setFilteredSongs([]);
    }
  };

  const toggleFilter = () => {
    setShowFilter((prev) => !prev);
  };

  const getRankPositions = (songs) => {
    if (!Array.isArray(songs)) {
      console.error('getRankPositions: songs is not an array', songs);
      return [];
    }
    const sortedSongs = [...songs].sort((a, b) => {
      if (typeof a.ranking !== 'number' || typeof b.ranking !== 'number') {
        console.error('Invalid ranking value', a, b);
        return 0;
      }
      return b.ranking - a.ranking;
    });
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
      <div
        className={`filter-container ${showFilter ? 'visible' : 'hidden'}`}
        style={{ width: '550px', margin: '0 auto' }}
      >
        <SongFilter onApply={handleApply} isRankPage={false} onHide={toggleFilter} />
      </div>
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
      {(loading || isFetching) ? (
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
          <p style={{ marginTop: '1rem', fontSize: '1.2em', color: '#7f8c8d', fontWeight: '600' }}></p>
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
          {filteredSongs.length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: '1.2em', color: '#7f8c8d' }}>
              No ranked songs yet for this filter.
            </p>
          ) : (
            (() => {
              const sortedSongs = [...filteredSongs].sort((a, b) => b.ranking - a.ranking);
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
                            ref={(el) => (audioRefs.current[index] = el)}
                            controls
                            src={song.previewURL}
                            className="custom-audio-player"
                            style={{ marginTop: '0.5rem' }}
                            onVolumeChange={(e) => setVolume(e.target.volume)}
                            onPlay={(e) => {
                              if (playingAudioRef && playingAudioRef !== e.target) {
                                playingAudioRef.pause();
                              }
                              setPlayingAudioRef(e.target);
                            }}
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
      ) : (
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
            Loading user data...
          </p>
        </div>
      )}
    </div>
  );
};

export default Rankings;