// Melodex/melodex-front-end/src/components/UserProfile.jsx
import React from 'react';
import { useSongContext } from '../contexts/SongContext';

function UserProfile() {
  const { rankedSongs } = useSongContext();
  return (
    <div>
      <h2>User Profile</h2>
      <p>Placeholder for user profile. Authentication and avatar upload coming soon.</p>
      <p>Ranked Songs: {rankedSongs.length}</p>
    </div>
  );
}

export default UserProfile;