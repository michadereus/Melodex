// Filepath: Melodex/melodex-front-end/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SongProvider } from './contexts/SongContext';
import { UserProvider, useUserContext } from './contexts/UserContext';
import Navbar from './components/Navbar';
import { SongRanker } from './components/SongRanker';
import Rankings from './components/Rankings';
import UserProfile from './components/UserProfile';
import Login from './components/Login';
import Register from './components/Register';

const ProtectedRoute = ({ children }) => {
  const { userID, loading } = useUserContext();
  if (loading) return <div>Loading...</div>;
  return userID ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
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
    </Router>
  );
}

export default App;