// Filepath: Melodex/melodex-front-end/src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useUserContext } from '../contexts/UserContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faSync, faList, faUser } from '@fortawesome/free-solid-svg-icons';

function Navbar() {
  const { userPicture, userID, loading } = useUserContext();

  // Debug: Log userPicture to confirm its value
  console.log('Navbar rendering with userPicture:', userPicture, 'loading:', loading);

  // Default image if userPicture is not set
  const defaultImage = 'https://i.imgur.com/uPnNK9Y.png';
  const profileImage = userID && userPicture ? userPicture : defaultImage;

  // Show a placeholder or nothing while loading
  if (loading) {
    return (
      <nav>
        <div className="nav-left">
          <Link to="/" className="logo">Melodx</Link>
          <div className="nav-links">
            <Link to="/rank">
              <FontAwesomeIcon icon={faStar} className="nav-icon" /> <span>Rank</span>
            </Link>
            <Link to="/rerank">
              <FontAwesomeIcon icon={faSync} className="nav-icon" /> <span>Re-Rank</span>
            </Link>
            <Link to="/rankings">
              <FontAwesomeIcon icon={faList} className="nav-icon" /> <span>Rankings</span>
            </Link>
          </div>
        </div>
        <div className="nav-right">
          <Link to="/profile" className="profile-link">
            <div
              className="profile-bubble"
              style={{
                backgroundImage: `url(${defaultImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav>
      <div className="nav-left">
        <Link to="/" className="logo">Melodx</Link>
        <div className="nav-links">
          <Link to="/rank">
            <FontAwesomeIcon icon={faStar} className="nav-icon" /> <span>Rank</span>
          </Link>
          <Link to="/rerank">
            <FontAwesomeIcon icon={faSync} className="nav-icon" /> <span>Re-Rank</span>
          </Link>
          <Link to="/rankings">
            <FontAwesomeIcon icon={faList} className="nav-icon" /> <span>Rankings</span>
          </Link>
        </div>
      </div>
      <div className="nav-right">
        <Link to="/profile" className="profile-link">
          <div
            className="profile-bubble"
            style={{
              backgroundImage: `url(${profileImage})`,
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