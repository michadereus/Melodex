// Melodex/melodex-front-end/src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav style={{ 
      background: '#333', 
      color: 'white', 
      padding: '1rem', 
      display: 'flex', 
      justifyContent: 'center', // Center the entire nav content
      alignItems: 'center',
      fontSize: '1.5rem' // Increase text size (adjustable)
    }}>
      <div style={{ display: 'flex', gap: '2rem' }}> {/* Space out the links */}
        <Link to="/rank" style={{ color: 'white', textDecoration: 'none' }}>Rank</Link>
        <Link to="/rerank" style={{ color: 'white', textDecoration: 'none' }}>Re-Rank</Link>
        <Link to="/rankings" style={{ color: 'white', textDecoration: 'none' }}>Rankings</Link>
      </div>
      <div style={{ position: 'absolute', right: '1rem' }}> {/* Keep profile bubble on the right */}
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