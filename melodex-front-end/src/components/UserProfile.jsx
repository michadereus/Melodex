// Filepath: Melodex/melodex-front-end/src/components/UserProfile.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useSongContext } from '../contexts/SongContext';
import { useUserContext } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { Auth, Storage } from 'aws-amplify';

function UserProfile() {
  const { rankedSongs, fetchRankedSongs } = useSongContext();
  const { userID, displayName, profilePicture, setProfilePicture, signOut } = useUserContext();
  const [email, setEmail] = useState('N/A');
  const [stats, setStats] = useState({});
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        const attributes = user.attributes;
        setEmail(attributes.email || 'N/A');
        console.log('User info fetched:', {
          userID: user.username,
          profilePicture: attributes['custom:uploadedPicture'] || attributes.picture || 'default',
          isGoogleUser: attributes.identities ? JSON.parse(attributes.identities).some(id => id.providerName === 'Google') : false,
        });
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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      console.log('No file selected for upload');
      return;
    }

    try {
      console.log('Starting upload for file:', file.name);
      const result = await Storage.put(`profile-pictures/${userID}-${Date.now()}.${file.name.split('.').pop()}`, file, {
        contentType: file.type,
        level: 'public',
      });
      console.log('S3 upload result:', result);
      const url = await Storage.get(result.key, { level: 'public' });
      console.log('Retrieved public URL:', url);
      const user = await Auth.currentAuthenticatedUser();
      await Auth.updateUserAttributes(user, {
        'custom:uploadedPicture': url, // Store in custom attribute
      });
      console.log('Cognito attribute updated with URL:', url);
      setProfilePicture(url); // Instant update
    } catch (error) {
      console.error('Failed to upload profile picture:', error.message, error.stack);
    }
  };

  const triggerFileInput = () => {
    console.log('Profile picture clicked, triggering file input');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      console.error('File input ref is not set');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: '#141820', fontSize: '2rem', marginBottom: '1.5rem' }}>
        {displayName || 'User Profile'}
      </h2>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundImage: `url(${profilePicture})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            position: 'relative',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, opacity 0.2s ease',
            opacity: isHovered ? 0.7 : 1,
          }}
          onClick={triggerFileInput}
        >
          {isHovered && (
            <span
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: '600',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
              }}
            >
              Upload
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
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