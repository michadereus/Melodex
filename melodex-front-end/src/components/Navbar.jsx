// Melodex/melodex-front-end/src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav style={{ background: '#333', color: 'white', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <Link to="/rank" style={{ color: 'white', textDecoration: 'none', marginRight: '1rem' }}>Rank</Link>
        <Link to="/rerank" style={{ color: 'white', textDecoration: 'none', marginRight: '1rem' }}>Re-Rank</Link>
        <Link to="/rankings" style={{ color: 'white', textDecoration: 'none' }}>Rankings</Link>
      </div>
      <div>
        <Link to="/profile" style={{ color: 'white', textDecoration: 'none' }}>
          <div className="profile-bubble">
            <span>👤</span>
          </div>
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;