// Filepath: Melodex/melodex-front-end/src/components/UserProfile.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useSongContext } from '../contexts/SongContext';
import { useUserContext } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { Auth, Storage } from 'aws-amplify';

function UserProfile() {
  const { rankedSongs, fetchRankedSongs } = useSongContext();
  const { userID, userAttributes, displayName, checkUser, setProfilePicture } = useUserContext();
  const [email, setEmail] = useState('N/A');
  const [profilePicture, setLocalProfilePicture] = useState('https://i.imgur.com/uPnNK9Y.png');
  const [stats, setStats] = useState({});
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        console.log('Authenticated user:', user);
        setEmail(user.attributes?.email || 'N/A');
        const pictureUrl = user.attributes['custom:uploadedPicture'] || user.attributes.picture;
        if (pictureUrl) setLocalProfilePicture(pictureUrl);
      } catch (error) {
        console.error('Error fetching user info:', error);
        setEmail('N/A');
        setLocalProfilePicture('https://i.imgur.com/uPnNK9Y.png');
      }
    };

    const fetchStats = async () => {
      if (!userID) {
        console.log('No userID yet, skipping fetchStats');
        setStats({});
        return;
      }
      try {
        const ranked = await fetchRankedSongs({ userID, genre: 'any', subgenre: 'any' });
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
        setStats({});
      }
    };

    fetchUserInfo();
    fetchStats();
  }, [userID, fetchRankedSongs]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      console.log('No file selected for upload');
      return;
    }

    try {
      console.log('Starting upload for user:', userID, 'File:', file.name);
      const result = await Storage.put(`profile-pictures/${userID}-${Date.now()}.${file.name.split('.').pop()}`, file, {
        contentType: file.type,
        level: 'public',
      });
      console.log('S3 upload result:', result);

      const url = `https://songranker168d4c9071004e018de33684bf3c094ede93a-dev.s3.us-east-1.amazonaws.com/public/${result.key}`;
      console.log('Generated public URL:', url);

      const user = await Auth.currentAuthenticatedUser();
      await Auth.updateUserAttributes(user, {
        'custom:uploadedPicture': url,
      });
      console.log('Cognito attribute updated with URL:', url);

      const refreshedUser = await Auth.currentAuthenticatedUser({ bypassCache: true });
      if (refreshedUser.attributes['custom:uploadedPicture'] !== url) {
        throw new Error('custom:uploadedPicture not persisted in Cognito');
      }

      setLocalProfilePicture(url);
      setProfilePicture(url);
      console.log('Profile picture set to:', url);
    } catch (error) {
      console.error('Failed to upload profile picture:', error.message, error.stack);
      setLocalProfilePicture('https://i.imgur.com/uPnNK9Y.png');
      setProfilePicture('https://i.imgur.com/uPnNK9Y.png');
      alert('Upload failed: ' + error.message);
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
      await Auth.signOut();
      console.log('Sign out successful');
      setProfilePicture('https://i.imgur.com/uPnNK9Y.png');
      await checkUser();
      navigate('/login');
    } catch (error) {
      console.error('Sign out failed:', error);
      navigate('/login');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', fontSize: '1.75rem', fontWeight: 400, marginBottom: '1.5rem', color: '#141820' }}>
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
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
            position: 'relative',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, opacity 0.2s ease',
            opacity: isHovered ? 0.7 : 1,
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
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
                fontWeight: 500,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
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
      <div
        style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
          maxWidth: '400px',
          margin: '0 auto',
        }}
      >
        <p style={{ textAlign: 'center', fontSize: '1.1rem', color: '#666' }}>
          {email}
        </p>
        <p style={{ textAlign: 'center', fontSize: '1.1rem', color: '#666' }}>
          {rankedSongs.length} ranked songs
        </p>
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 400, marginBottom: '1rem', color: '#141820' }}>
            Stats
          </h3>
          {Object.keys(stats).length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'left' }}>
              {Object.entries(stats).map(([key, value]) => (
                <li
                  key={key}
                  style={{
                    marginBottom: '0.5rem',
                    color: '#141820',
                    fontSize: '1rem',
                    background: '#fff',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', // Increased shadow for visibility
                    border: '1px solid #e0e0e0', // Added subtle border
                    width: '300px',
                  }}
                >
                  {key}: {value} ranked songs
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#666', fontSize: '1rem' }}>
              No ranking statistics available yet.
            </p>
          )}
        </div>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            onClick={handleSignOut}
            style={{
              background: '#e74c3c',
              padding: '0.5rem 1rem',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;