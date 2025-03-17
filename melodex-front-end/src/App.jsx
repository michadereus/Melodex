// Melodex/melodex-front-end/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SongProvider } from './contexts/SongContext';
import Navbar from './components/Navbar';
import { SongRanker } from './components/SongRanker';
import Rankings from './components/Rankings';

function App() {
  return (
    <SongProvider>
      <Router>
        <Navbar />
        <main style={{ padding: '20px' }}>
          <Routes>
            <Route path="/rank" element={<SongRanker mode="new" key="new" />} />
            <Route path="/rerank" element={<SongRanker mode="rerank" key="rerank" />} />
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/" element={<SongRanker mode="new" key="new-default" />} />
          </Routes>
        </main>
        <footer style={{ background: '#333', color: 'white', padding: '1rem', textAlign: 'center', width: '100%' }}>
          <p>© 2025 Melodex. All rights reserved.</p>
        </footer>
      </Router>
    </SongProvider>
  );
}

export default App;