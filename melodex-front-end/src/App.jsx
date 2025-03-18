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
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh'
        }}>
          <Navbar />
          <main style={{
            flex: '1 0 auto',
            padding: '2rem',
            width: '100%', // Full width to allow grid to expand
            maxWidth: 'none', // Remove max-width constraint
            margin: '0 auto'
          }}>
            <Routes>
              <Route path="/rank" element={<SongRanker mode="new" key="new" />} />
              <Route path="/rerank" element={<SongRanker mode="rerank" key="rerank" />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/" element={<SongRanker mode="new" key="new-default" />} />
            </Routes>
          </main>
          <footer style={{
            background: '#2c3e50',
            color: '#bdc3c7',
            padding: '1rem',
            textAlign: 'center',
            flexShrink: 0,
            fontSize: '0.9rem',
            boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.1)'
          }}>
            <p>michael.dereus@outlook.com</p>
          </footer>
        </div>
      </Router>
    </SongProvider>
  );
}

export default App;