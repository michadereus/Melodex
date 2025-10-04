// Filepath: Melodex/melodex-front-end/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SongProvider } from './contexts/SongContext';
import { UserProvider, useUserContext } from './contexts/UserContext';
import { VolumeProvider } from './contexts/VolumeContext'; // Add this import
import Navbar from './components/Navbar';
import { SongRanker } from './components/SongRanker';
import Rankings from './components/Rankings';
import UserProfile from './components/UserProfile';
import Login from './components/Login';
import Register from './components/Register';

const isCypressEnv = typeof window !== 'undefined' && !!(window).Cypress;

const ProtectedRoute = ({ children }) => {
  const { userID, loading } = useUserContext();
  const requireAuth = typeof window !== 'undefined' && !!(window).__E2E_REQUIRE_AUTH__;
  // In real app, still show loading; in Cypress, don't block rendering
  if (loading && !isCypressEnv) return <div>Loading...</div>;

  // Allow route when:
  //  - real userID exists (normal behavior), OR
  //  - Cypress is running (E2E bypass)
  // Bypass only if Cypress AND not explicitly requiring real auth
  const allowBypass = isCypressEnv && !requireAuth;
  return (userID || allowBypass) ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <VolumeProvider> {/* Add VolumeProvider here */}
        <UserProvider>
          <SongProvider>
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              <Navbar />
              <main style={{ flex: '1 0 auto', padding: '0.75rem', width: '100%', maxWidth: 'none', margin: '0 auto' }}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/rank" element={<ProtectedRoute><SongRanker mode="new" key="new" /></ProtectedRoute>} />
                  <Route path="/rerank" element={<ProtectedRoute><SongRanker mode="rerank" key="rerank" /></ProtectedRoute>} />
                  <Route path="/rankings" element={<ProtectedRoute><Rankings /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </main>
              <footer style={{ 
                  background: '#141820', 
                  color: '#bdc3c7', 
                  height: '3.5rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0 1rem', 
                  textAlign: 'left', 
                  flexShrink: 0, 
                  fontSize: '0.8rem', 
                  boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.1)' 
                }}>
                <p style={{ margin: 0 }}>https://linktr.ee/michaeldereus</p>
              </footer>
            </div>
          </SongProvider>
        </UserProvider>
      </VolumeProvider>
    </Router>
  );
}

export default App;