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
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: '#141820', fontSize: '2rem', marginBottom: '1.5rem' }}>
        Sign in to My Song Ranker
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #bdc3c7', fontSize: '1rem', color: '#2c3e50', background: '#f4f7fa' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #bdc3c7', fontSize: '1rem', color: '#2c3e50', background: '#f4f7fa' }}
        />
        <button
          onClick={handleLogin}
          style={{
            background: '#3498db',
            color: 'white',
            border: 'none',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.3s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
          onMouseOver={(e) => (e.target.style.background = '#2980b9')}
          onMouseOut={(e) => (e.target.style.background = '#3498db')}
        >
          Sign In
        </button>
        <button
          onClick={handleRegisterRedirect}
          style={{
            background: '#7f8c8d',
            color: 'white',
            border: 'none',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.3s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
          onMouseOver={(e) => (e.target.style.background = '#6c757d')}
          onMouseOut={(e) => (e.target.style.background = '#7f8c8d')}
        >
          Register
        </button>
        <div style={{ padding: '0.2rem', maxWidth: '400px', margin: '0 auto' }}>
          <button
            onClick={handleGoogleLogin}
            style={{
              background: '#4285f4',
              color: 'white',
              border: 'none',
              padding: '0.75rem',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.3s ease',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
            onMouseOver={(e) => (e.target.style.background = '#357abd')}
            onMouseOut={(e) => (e.target.style.background = '#4285f4')}
          >
            <img
              src="https://developers.google.com/identity/images/g-logo.png"
              alt="Google Logo"
              style={{ width: '20px', height: '20px', borderRadius: '10px' }}
            />
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;