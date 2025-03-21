// Filepath: Melodex/melodex-front-end/src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useUserContext } from '../contexts/UserContext';

function Navbar() {
  const { profilePicture } = useUserContext();
  return (
    <nav>
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <Link to="/rank">Rank</Link>
        <Link to="/rerank">Re-Rank</Link>
        <Link to="/rankings">Rankings</Link>
      </div>
      <div>
        <Link to="/profile" className="profile-link">
          <div
            className="profile-bubble"
            style={{
              backgroundImage: `url(${profilePicture})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;