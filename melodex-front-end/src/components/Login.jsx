// Filepath: Melodex/melodex-front-end/src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '../contexts/UserContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { setUserID, setDisplayName } = useUserContext();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        console.log('User already authenticated on /login:', user);
        setUserID(user.username);
        const preferredName = user.attributes?.['custom:username'] || user.attributes?.preferred_username || user.attributes?.email || user.username;
        setDisplayName(preferredName);
        navigate('/rank');
      } catch (error) {
        console.log('No user authenticated on /login:', error);
      }
    };
    checkAuth();
  }, [navigate, setUserID, setDisplayName]);

  const handleLogin = async () => {
    try {
      const user = await Auth.signIn(email, password);
      console.log('Logged in with email:', user);
      setUserID(user.username);
      const preferredName = user.attributes?.['custom:username'] || user.attributes?.preferred_username || user.attributes?.email || user.username;
      setDisplayName(preferredName);
      console.log('Navigating to /rank, navigate type:', typeof navigate);
      if (typeof navigate !== 'function') {
        throw new Error('navigate is not a function');
      }
      navigate('/rank');
    } catch (error) {
      console.error('Email login error:', error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      console.log('Initiating Google login via Cognito Hosted UI');
      await Auth.federatedSignIn({ provider: 'Google' });
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  const handleRegisterRedirect = () => {
    navigate('/register');
  };

  console.log('Rendering Login component');
  return (
    <div className="auth-container">
      <h2 className="auth-title">Sign in to My Song Ranker</h2>
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
        <button className="auth-button auth-button-primary" onClick={handleLogin}>
          Sign In
        </button>
        <button className="auth-button auth-button-secondary" onClick={handleRegisterRedirect}>
          Register
        </button>
        <button className="auth-button auth-button-google" onClick={handleGoogleLogin}>
          <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google Logo" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default Login;