// Melodex/melodex-front-end/src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav>
      <div>
        <Link to="/rank">Rank</Link>
        <Link to="/rerank">Re-Rank</Link>
        <Link to="/rankings">Rankings</Link>
      </div>
      <div>
        <Link to="/profile">
          <div className="profile-bubble">
            <span>👤</span>
          </div>
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;