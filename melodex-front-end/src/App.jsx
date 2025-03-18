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
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
          <Navbar />
          <main style={{ padding: '20px', flex: '1 0 auto', boxSizing: 'border-box' }}>
            <Routes>
              <Route path="/rank" element={<SongRanker mode="new" key="new" />} />
              <Route path="/rerank" element={<SongRanker mode="rerank" key="rerank" />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/" element={<SongRanker mode="new" key="new-default" />} />
            </Routes>
          </main>
          <footer style={{ background: '#333', color: 'white', padding: '1rem', textAlign: 'center', flexShrink: 0 }}>
            <p>michael.dereus@outlook.com</p>
          </footer>
        </div>
      </Router>
    </SongProvider>
  );
}

export default App;