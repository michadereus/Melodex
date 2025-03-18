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
        <Link to="/profile" className="profile-link">
          <div className="profile-bubble" />
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;