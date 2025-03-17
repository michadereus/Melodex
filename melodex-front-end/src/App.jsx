// Melodex/melodex-front-end/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SongProvider } from './contexts/SongContext';
import Navbar from './components/Navbar';
import { SongRanker } from './components/SongRanker';
import Rankings from './components/Rankings'; // Add this import

function App() {
  return (
    <SongProvider>
      <Router>
        <Navbar />
        <main style={{ minHeight: 'calc(100vh - 120px)', padding: '20px' }}>
          <Routes>
            <Route path="/rank" element={<SongRanker mode="new" />} />
            <Route path="/rerank" element={<SongRanker mode="rerank" />} />
            <Route path="/rankings" element={<Rankings />} /> {/* Add this route */}
            <Route path="/" element={<SongRanker mode="new" />} />
          </Routes>
        </main>
        <footer style={{ background: '#333', color: 'white', padding: '1rem', textAlign: 'center', position: 'fixed', bottom: 0, width: '100%' }}>
          <p>© 2025 Melodex. All rights reserved.</p>
        </footer>
      </Router>
    </SongProvider>
  );
}

export default App;