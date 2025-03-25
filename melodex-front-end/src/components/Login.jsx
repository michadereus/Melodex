// Filepath: Melodex/melodex-front-end/src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserContext } from '../contexts/UserContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { checkUser, loading } = useUserContext();

  // Handle redirect after federated login
  useEffect(() => {
    if (location.pathname === '/oauth2/idpresponse') {
      console.log('Detected redirect from federated login');
      checkUser().then(() => {
        console.log('Navigating to /rank after Google login');
        navigate('/rank');
      });
    }
  }, [location, checkUser, navigate]);

  const handleLogin = async () => {
    try {
      const user = await Auth.signIn(email, password);
      console.log('Logged in with email:', user);
      await checkUser();
      console.log('Navigating to /rank');
      navigate('/rank');
    } catch (error) {
      console.error('Email login error:', error.message || error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      console.log('Initiating Google login via Cognito Hosted UI');
      await Auth.federatedSignIn({ provider: 'Google' });
    } catch (error) {
      console.error('Google login error:', error.message || error);
    }
  };

  const handleRegisterRedirect = () => {
    console.log('Navigating to /register');
    navigate('/register');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  console.log('Rendering Login component');
  return (
    <div className="auth-container">
      <h2
        style={{
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
          fontSize: '2rem',
          fontWeight: 600,
          color: '#141820',
          marginBottom: '0.5rem',
        }}
      >
        Melodx.io
      </h2>
      <p
        style={{
          textAlign: 'center',
          fontSize: '1rem',
          color: '#666',
          marginBottom: '1.5rem',
        }}
      >
        Log In
      </p>
      <div className="auth-form">
        <input
          className="auth-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="auth-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="auth-button auth-button-primary"
          onClick={handleLogin}
          style={{ borderRadius: '0.5rem' }}
        >
          Sign In
        </button>
        <button
          className="auth-button auth-button-secondary"
          onClick={handleRegisterRedirect}
          style={{ borderRadius: '0.5rem' }}
        >
          Register
        </button>
        <button
          className="auth-button auth-button-google"
          onClick={handleGoogleLogin}
          style={{ borderRadius: '0.5rem' }}
        >
          <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google Logo" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default Login;