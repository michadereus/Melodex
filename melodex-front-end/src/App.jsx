import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SongProvider } from './contexts/SongContext';
import { UserProvider } from './contexts/UserContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Navbar from './components/Navbar';
import { SongRanker } from './components/SongRanker';
import Rankings from './components/Rankings';
import UserProfile from './components/UserProfile';
import Login from './components/Login';
import Register from './components/Register';

function App() {
  return (
    <GoogleOAuthProvider clientId="178829211245-19gec6v6qatnj74rbpb2st97c3hr1p8i.apps.googleusercontent.com">
      <UserProvider>
        <SongProvider>
          <Router>
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              <Navbar />
              <main style={{ flex: '1 0 auto', padding: '2rem', width: '100%', maxWidth: 'none', margin: '0 auto' }}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/rank" element={<SongRanker mode="new" key="new" />} />
                  <Route path="/rerank" element={<SongRanker mode="rerank" key="rerank" />} />
                  <Route path="/rankings" element={<Rankings />} />
                  <Route path="/profile" element={<UserProfile />} />
                  <Route path="/" element={<Navigate to="/login" />} />
                </Routes>
              </main>
              <footer style={{ background: '#141820', color: '#bdc3c7', padding: '1rem', textAlign: 'center', flexShrink: 0, fontSize: '0.9rem', boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.1)' }}>
                <p>michael.dereus@outlook.com</p>
              </footer>
            </div>
          </Router>
        </SongProvider>
      </UserProvider>
    </GoogleOAuthProvider>
  );
}

export default App;