// Filepath: melodex-front-end/src/components/Rankings.jsx
import { useSongContext } from '../contexts/SongContext';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useVolumeContext } from '../contexts/VolumeContext';
import SongFilter from './SongFilter';
import '../index.css';

// ===== Exportable helper so UI tests can import it =====
export async function ensureSpotifyConnected(authRoot = '') {
  const base = String(authRoot || '').replace(/\/+$/, '');
  try {
    const r = await fetch(`${base}/auth/session`, { credentials: 'include' });
    if (!r.ok) return { shouldRedirect: true, to: `${base}/auth/start` };
    const { connected } = await r.json();
    if (!connected) return { shouldRedirect: true, to: `${base}/auth/start` };
    return { shouldRedirect: false };
  } catch {
    return { shouldRedirect: true, to: `${base}/auth/start` };
  }
}

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

  // Map<stableKey, HTMLAudioElement>
  const audioRefs = useRef(new Map());
  const rehydratingRef = useRef(new Set());
  const didRunFixRef = useRef(false);
  const recentlyDoneRef = useRef(new Map()); // key -> timestamp (ms)
  const autoInitRef = useRef(false);         // avoid StrictMode/HMR double-run
  const rehydrateAvailableRef = useRef(null); // null=unknown, true/false after first attempt

  const RECENTLY_DONE_WINDOW_MS = 5 * 60 * 1000;

  // ---- API base (handles with/without trailing /api) ----
  const RAW_BASE =
    import.meta.env.VITE_API_BASE_URL ??
    import.meta.env.VITE_API_BASE ??
    window.__API_BASE__ ??
    'http://localhost:8080';

  const normalizeNoTrail = (s) => String(s).replace(/\/+$/, '');
  const baseNoTrail = normalizeNoTrail(RAW_BASE);
  const API_ROOT = /\/api$/.test(baseNoTrail) ? baseNoTrail : `${baseNoTrail}/api`;
  const AUTH_ROOT = baseNoTrail;

  const joinUrl = (...parts) =>
    parts
      .map((p, i) => (i === 0 ? String(p).replace(/\/+$/, '') : String(p).replace(/^\/+|\/+$/g, '')))
      .filter(Boolean)
      .join('/');

  function recentlyDone(key) {
    const ts = recentlyDoneRef.current.get(key) || 0;
    return Date.now() - ts < RECENTLY_DONE_WINDOW_MS;
  }

  // ===== Helpers =====
  const stableKey = (s) => {
    if (!s) return 'na__';
    if (s._id) return `id_${String(s._id)}`;
    if (s.deezerID != null) return `dz_${String(s.deezerID)}`;
    const norm = (x) => String(x || '').toLowerCase().trim().replace(/\s+/g, ' ');
    return `na_${norm(s.songName)}__${norm(s.artist)}`;
  };

  // Parse Deezer preview expiry for logging + validation
  function parsePreviewExpiry(url) {
    if (!url || typeof url !== 'string')
      return { exp: null, now: Math.floor(Date.now() / 1000), ttl: null };
    try {
      const qs = url.split('?')[1] || '';
      const params = new URLSearchParams(qs);
      const hdnea = params.get('hdnea') || '';
      const m = /exp=(\d+)/.exec(hdnea);
      const now = Math.floor(Date.now() / 1000);
      if (!m) return { exp: null, now, ttl: null };
      const exp = parseInt(m[1], 10);
      return { exp, now, ttl: exp - now };
    } catch {
      return { exp: null, now: Math.floor(Date.now() / 1000), ttl: null };
    }
  }

  function isPreviewValid(url) {
    const { ttl } = parsePreviewExpiry(url);
    // If no exp found, treat as valid (we can’t prove it’s expired)
    if (ttl === null) return true;
    return ttl > 60; // valid if more than 60s remain
  }

  function msSince(d) {
    if (!d) return Number.POSITIVE_INFINITY; // treat as very old
    const t = typeof d === 'string' ? Date.parse(d) : d;
    if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
    return Date.now() - t;
  }

  const REFRESH_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

  // ===== Network ops =====
  const rehydrateSong = async (song) => {
    const key = stableKey(song);
    try {
      if (!userID || !song) return;

      // if we already discovered the endpoint is missing, don't spam
      if (rehydrateAvailableRef.current === false) return;

      // throttle: skip if we just tried this key
      if (recentlyDone(key)) {
        console.log('[Rankings] rehydrateSong skipped (recently done)', { key });
        return;
      }

      if (rehydratingRef.current.has(key)) {
        console.log('[Rankings] rehydrateSong skipped (already in-flight)', {
          key,
          song: { n: song.songName, a: song.artist },
        });
        return;
      }
      rehydratingRef.current.add(key);

      const endpoint = joinUrl(API_ROOT, 'user-songs', 'rehydrate');

      // just for logging insight
      const ttlInfo = parsePreviewExpiry(song.previewURL);
      console.log('[Rankings] rehydrateSong POST', {
        endpoint,
        song: { id: song._id, deezerID: song.deezerID, name: song.songName, artist: song.artist },
        previewTTL: ttlInfo,
      });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userID,
          songId: song._id,
          fallbackDeezerID: song.deezerID,
          songName: song.songName,
          artist: song.artist,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.warn('[Rankings] rehydrateSong FAILED', { status: res.status, body: txt });

        // prevent tight loops
        recentlyDoneRef.current.set(key, Date.now());

        // mark endpoint unavailable on 404
        if (res.status === 404) {
          rehydrateAvailableRef.current = false;
        }

        throw new Error(`rehydrate failed ${res.status} ${txt}`);
      }

      rehydrateAvailableRef.current = true;

      const updated = await res.json();

      // merge into lists
      const matches = (s) =>
        (s._id && updated._id && String(s._id) === String(updated._id)) ||
        (!!s.deezerID && !!updated.deezerID && String(s.deezerID) === String(s.deezerID)) ||
        (s.songName === song.songName && s.artist === song.artist);

      setEnrichedSongs((prev) => prev.map((s) => (matches(s) ? { ...s, ...updated } : s)));
      setFilteredSongs((prev) => prev.map((s) => (matches(s) ? { ...s, ...updated } : s)));

      // refresh the <audio> element if we have a new preview
      const audioEl = audioRefs.current.get(key);
      if (audioEl && updated.previewURL) {
        audioEl.src = updated.previewURL;
        audioEl.load();
      }

      recentlyDoneRef.current.set(key, Date.now());

      console.log('[Rankings] rehydrateSong OK', {
        song: { id: song._id, name: song.songName, artist: song.artist },
        updatedPreviewTTL: parsePreviewExpiry(updated.previewURL),
        updatedDeezerID: updated.deezerID,
        lastDeezerRefresh: updated.lastDeezerRefresh,
      });
    } catch (e) {
      console.warn('[Rankings] Rehydrate error:', e);
    } finally {
      rehydratingRef.current.delete(key);
    }
  };

  // ===== Initial fetch =====
  useEffect(() => {
    if (userID && !applied) {
      console.log('Initial fetch triggered for /rankings');
      handleApply({ genre: 'any', subgenre: 'any', decade: 'all decades' });
    }
  }, [userID, applied]);

  // ===== “Show immediately, fix in background once” =====
  const enrichAndFilterSongs = useCallback(() => {
    if (!applied || !Array.isArray(rankedSongs)) return;

    setEnrichedSongs(rankedSongs);
    setFilteredSongs(rankedSongs);
    setIsFetching(false);

    // Log snapshot on arrival
    try {
      let valid = 0,
        expired = 0,
        missing = 0;
      const samples = [];
      rankedSongs.forEach((s, i) => {
        if (!s.previewURL) {
          missing++;
          if (samples.length < 5)
            samples.push({ i, name: s.songName, artist: s.artist, reason: 'no previewURL' });
        } else if (isPreviewValid(s.previewURL)) {
          valid++;
        } else {
          expired++;
          if (samples.length < 5) {
            const { ttl, exp, now } = parsePreviewExpiry(s.previewURL);
            samples.push({ i, name: s.songName, artist: s.artist, ttl, exp, now, reason: 'expired' });
          }
        }
      });
      console.log('[Rankings] Snapshot after fetch:', { valid, expired, missing, sample: samples });
    } catch (e) {
      console.log('[Rankings] Snapshot logging error:', e);
    }

    if (didRunFixRef.current) return;
    didRunFixRef.current = true;

    // Background “fix-only” (missing core fields), no spinner
    const url = joinUrl(API_ROOT, 'user-songs', 'deezer-info');

    const candidates = rankedSongs.filter((s) => !s.deezerID || !s.albumCover || !s.previewURL);
    console.log('[Rankings] Background fix pass: candidates', {
      total: rankedSongs.length,
      candidates: candidates.length,
      sample: candidates.slice(0, 5).map((s) => ({
        name: s.songName,
        artist: s.artist,
        deezerID: s.deezerID,
        hasCover: !!s.albumCover,
        hasPreview: !!s.previewURL,
      })),
    });

    const BATCH_SIZE = 10;
    const CONCURRENCY = 2;

    let cursor = 0;
    let active = 0;
    let cancelled = false;

    const runNext = () => {
      if (cancelled) return;
      if (cursor >= candidates.length && active === 0) return;

      while (active < CONCURRENCY && cursor < candidates.length) {
        const slice = candidates.slice(cursor, cursor + BATCH_SIZE);
        cursor += BATCH_SIZE;
        active += 1;

        console.log('[Rankings] deezer-info POST', { url, sliceCount: slice.length });

        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songs: slice }),
        })
          .then(async (r) => {
            if (!r.ok) throw new Error(`deezer-info ${r.status}`);
            const batch = await r.json();

            console.log('[Rankings] deezer-info OK', { returned: batch.length });

            setEnrichedSongs((prev) =>
              prev.map((s) => {
                const repl = batch.find(
                  (b) =>
                    (b._id && s._id && String(b._id) === String(s._id)) ||
                    (!!b.deezerID && String(b.deezerID) === String(s.deezerID)) ||
                    (b.songName === s.songName && b.artist === s.artist)
                );
                return repl ? { ...s, ...repl } : s;
              })
            );
            setFilteredSongs((prev) =>
              prev.map((s) => {
                const repl = batch.find(
                  (b) =>
                    (b._id && s._id && String(b._id) === String(s._id)) ||
                    (!!b.deezerID && String(b.deezerID) === String(s.deezerID)) ||
                    (b.songName === s.songName && b.artist === s.artist)
                );
                return repl ? { ...s, ...repl } : s;
              })
            );
          })
          .catch((err) => {
            console.log(
              '[Rankings] deezer-info error (ignored, UI will self-heal on play)',
              err?.message || err
            );
          })
          .finally(() => {
            active -= 1;
            runNext();
          });
      }
    };

    runNext();

    // return cleanup so React can cancel on deps change/unmount
    return () => {
      cancelled = true;
    };
  }, [applied, rankedSongs]);

  useEffect(() => {
    // ensure cleanup function above is actually used
    return enrichAndFilterSongs();
  }, [enrichAndFilterSongs]);

  // ===== Auto rehydrate only when expired + cooldown =====
  useEffect(() => {
    if (!Array.isArray(filteredSongs) || filteredSongs.length === 0) return;

    // avoid React 18 StrictMode/HMR double-run
    if (autoInitRef.current) return;
    autoInitRef.current = true;

    // if endpoint proven missing, skip auto attempts
    if (rehydrateAvailableRef.current === false) return;

    filteredSongs.forEach((s) => {
      if (!s.previewURL) return;

      const key = stableKey(s);

      // skip if in-flight or just done
      if (rehydratingRef.current.has(key) || recentlyDone(key)) return;

      const { ttl } = parsePreviewExpiry(s.previewURL);

      if (!isPreviewValid(s.previewURL) && msSince(s.lastDeezerRefresh) > REFRESH_COOLDOWN_MS) {
        console.log('[Rankings] AUTO rehydrate (expired + cooldown)', {
          name: s.songName,
          artist: s.artist,
          deezerID: s.deezerID,
          ttl,
          lastDeezerRefresh: s.lastDeezerRefresh,
        });
        rehydrateSong(s);
      }
    });
  }, [filteredSongs]);

  // Keep volume in sync
  useEffect(() => {
    audioRefs.current.forEach((audio) => {
      if (audio) audio.volume = volume;
    });
  }, [volume, filteredSongs]);

  // ===== UI actions =====
  const handleApply = async (filters) => {
    if (!userID) {
      console.log('No userID available, skipping fetch');
      return;
    }

    didRunFixRef.current = false;

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
      await Promise.race([
        fetchRankedSongs({ userID, genre: filters.genre, subgenre: filters.subgenre }),
        timeoutPromise,
      ]);
      setApplied(true);
    } catch (error) {
      console.error('handleApply error:', error);
      setApplied(true);
      setFilteredSongs([]);
    }
  };

  async function onExportClick() {
    const decision = await ensureSpotifyConnected(AUTH_ROOT);
    if (decision.shouldRedirect) {
      window.location.href = decision.to;
      return;
    }
    // connected → open your export UI (drawer/modal)
    console.log('Spotify connected — ready to open export UI');
  }

  const toggleFilter = () => setShowFilter((prev) => !prev);

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

  // ===== Render =====
  const sortedSongs = [...filteredSongs].sort((a, b) => b.ranking - a.ranking);
  const rankPositions = getRankPositions(sortedSongs);

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
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect y="4" width="20" height="2" rx="1" fill="#bdc3c7" className="filter-line" />
            <rect y="9" width="20" height="2" rx="1" fill="#bdc3c7" className="filter-line" />
            <rect y="14" width="20" height="2" rx="1" fill="#bdc3c7" className="filter-line" />
          </svg>
        </button>
      </div>

      {loading || isFetching ? (
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
          <p style={{ marginTop: '1rem', fontSize: '1.2em', color: '#7f8c8d', fontWeight: '600' }}></p>
        </div>
      ) : applied ? (
        <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#141820', marginBottom: '1.5rem', marginTop: '4rem' }}>
            {' '}
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
              {sortedSongs.map((song, index) => {
                const k = stableKey(song);
                return (
                  <li
                    key={k}
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
                      src={song.albumCover || '/placeholder-cover.png'}
                      alt="Album Cover"
                      style={{ width: '80px', height: '80px', borderRadius: '8px' }}
                    />

                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: '600',
                          color: '#141820',
                          margin: '0',
                        }}
                      >
                        {song.songName}
                      </p>
                      <p style={{ fontSize: '1rem', color: '#7f8c8d', margin: '0.25rem 0' }}>
                        {song.artist}
                      </p>
                      <p style={{ fontSize: '0.9rem', color: '#3498db', margin: '0' }}>
                        Score: {song.ranking}
                      </p>

                      {song.previewURL && isPreviewValid(song.previewURL) ? (
                        <>
                          <audio
                            ref={(el) => {
                              if (el) audioRefs.current.set(k, el);
                              else audioRefs.current.delete(k);
                            }}
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
                              const { ttl, exp, now } = parsePreviewExpiry(song.previewURL);
                              console.log(
                                '[Rankings] <audio> onError → rehydrate (likely expired / fetch fail)',
                                {
                                  name: song.songName,
                                  artist: song.artist,
                                  deezerID: song.deezerID,
                                  ttl,
                                  exp,
                                  now,
                                }
                              );
                              // Hide the control while we rehydrate
                              e.currentTarget.style.display = 'none';
                              const overlay = e.currentTarget.nextElementSibling;
                              if (overlay) overlay.style.display = 'block';
                              rehydrateSong(song);
                            }}
                            onCanPlay={(e) => {
                              console.log('[Rankings] <audio> onCanPlay', {
                                name: song.songName,
                                artist: song.artist,
                                ttl: parsePreviewExpiry(song.previewURL),
                              });
                              e.currentTarget.style.display = 'block';
                              const overlay = e.currentTarget.nextElementSibling;
                              if (overlay) overlay.style.display = 'none';
                            }}
                          />
                          {/* overlay during rehydrate */}
                          <span
                            style={{
                              display: 'none',
                              color: '#e74c3c',
                              background: 'rgba(255,255,255,0.9)',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                            }}
                          >
                            Refreshing preview…
                          </span>
                        </>
                      ) : (
                        <span
                          style={{
                            display: 'block',
                            color: '#e74c3c',
                            fontSize: '0.9rem',
                            marginTop: '0.5rem',
                          }}
                        >
                          {/* No preview available */}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
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
          <p style={{ marginTop: '1rem', fontSize: '1.2em', color: '#7f8c8d', fontWeight: '600' }}>
            Loading user data...
          </p>
        </div>
      )}
    </div>
  );
};

export default Rankings;
