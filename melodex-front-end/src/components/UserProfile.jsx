// Filepath: Melodex/melodex-front-end/src/components/UserProfile.jsx
import React, { useEffect, useState } from 'react';
import { useSongContext } from '../contexts/SongContext';
import { useUserContext } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@aws-amplify/auth';

function UserProfile() {
  const { rankedSongs, fetchRankedSongs } = useSongContext();
  const { displayName, signOut } = useUserContext();
  const [email, setEmail] = useState('N/A');
  const [stats, setStats] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        if (userInfo && userInfo.attributes && userInfo.attributes.email) {
          setEmail(userInfo.attributes.email);
        } else {
          console.log('No email attribute found, using N/A');
          setEmail('N/A');
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
        setEmail('N/A');
      }
    };

    const fetchStats = async () => {
      try {
        const ranked = await fetchRankedSongs('any', 'any');
        const genreStats = ranked.reduce((acc, song) => {
          const genre = song.genre || 'Unknown';
          const subgenre = song.subgenre || 'None';
          if (subgenre === 'None' || subgenre === 'any') {
            acc[genre] = (acc[genre] || 0) + 1;
          } else {
            const key = `${genre} - ${subgenre}`;
            acc[key] = (acc[key] || 0) + 1;
          }
          return acc;
        }, {});
        setStats(genreStats);
      } catch (error) {
        console.error('Failed to fetch profile stats:', error);
      }
    };

    fetchUserInfo();
    fetchStats();
  }, [fetchRankedSongs]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: '#141820', fontSize: '2rem', marginBottom: '1.5rem' }}>
        {displayName || 'User Profile'} {/* Use displayName as header */}
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
        Email: {email}
      </p>
      <p style={{ textAlign: 'center', fontSize: '1.2em', color: '#7f8c8d' }}>
        Total Ranked Songs: {rankedSongs.length}
      </p>
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <h3 style={{ color: '#141820', fontSize: '1.5rem', marginBottom: '1rem' }}>
          Ranking Statistics
        </h3>
        {Object.keys(stats).length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {Object.entries(stats).map(([key, value]) => (
              <li
                key={key}
                style={{
                  marginBottom: '0.5rem',
                  color: '#2c3e50',
                  fontSize: '1rem',
                  background: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  width: '300px',
                }}
              >
                {key}: {value} songs ranked
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: '#7f8c8d', fontSize: '1rem' }}>
            No ranking statistics available yet.
          </p>
        )}
      </div>
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button
          onClick={handleSignOut}
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