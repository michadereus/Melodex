// Melodex/melodex-front-end/src/components/UserProfile.jsx
import React, { useEffect, useState } from 'react';
import { useSongContext } from '../contexts/SongContext';
import { useUserContext } from '../contexts/UserContext';

function UserProfile() {
  const { rankedSongs, fetchRankedSongs } = useSongContext();
  const { userID } = useUserContext();
  const [stats, setStats] = useState({});

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch all ranked songs for the user
        const ranked = await fetchRankedSongs('any', 'any');
        const genreStats = ranked.reduce((acc, song) => {
          const genre = song.genre || 'Unknown';
          const subgenre = song.subgenre || 'None';
          acc[genre] = (acc[genre] || 0) + 1;
          acc[`${genre} - ${subgenre}`] = (acc[`${genre} - ${subgenre}`] || 0) + 1;
          return acc;
        }, {});
        setStats(genreStats);
      } catch (error) {
        console.error('Failed to fetch profile stats:', error);
      }
    };
    fetchStats();
  }, [fetchRankedSongs]);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: '#141820', fontSize: '2rem', marginBottom: '1.5rem' }}>
        User Profile
      </h2>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: '#434957 url("https://i.imgur.com/uPnNK9Y.png") no-repeat center center',
            backgroundSize: '60%',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span style={{ color: '#bdc3c7', fontSize: '0.9rem', display: 'none' }}>Upload</span>
        </div>
      </div>
      <p style={{ textAlign: 'center', fontSize: '1.2em', color: '#7f8c8d' }}>
        Username: {userID}
      </p>
      <p style={{ textAlign: 'center', fontSize: '1.2em', color: '#7f8c8d' }}>
        Email: {userID}@example.com
      </p>
      <p style={{ textAlign: 'center', fontSize: '1.2em', color: '#7f8c8d' }}>
        Total Ranked Songs: {rankedSongs.length}
      </p>
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ color: '#141820', fontSize: '1.5rem' }}>Ranking Statistics</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {Object.entries(stats).map(([key, value]) => (
            <li
              key={key}
              style={{
                marginBottom: '0.5rem',
                color: '#2c3e50',
                fontSize: '1rem',
                background: 'white',
                padding: '0.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              }}
            >
              {key}: {value} songs ranked
            </li>
          ))}
        </ul>
      </div>
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button
          style={{
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.3s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
          onMouseOver={(e) => (e.target.style.background = '#c0392b')}
          onMouseOut={(e) => (e.target.style.background = '#e74c3c')}
        >
          Log Out
        </button>
      </div>
    </div>
  );
}

export default UserProfile;