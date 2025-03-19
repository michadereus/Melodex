import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await Auth.signIn(email, password);
      console.log('Logged in with email');
      navigate('/rank');
    } catch (error) {
      console.error('Email login error:', error);
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    try {
        const { credential } = credentialResponse;
        console.log('Google ID Token:', credential);
        // Comment out Amplify for now
        // await Auth.federatedSignIn({ provider: 'Google', token: credential });
        navigate('/rank');
    } catch (error) {
        console.error('Google login error:', error);
    }
    };

  const handleGoogleError = () => {
    console.error('Google Login Failed');
  };

  const handleRegisterRedirect = () => {
    navigate('/register');
  };

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
          <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={handleGoogleError}
            flow="implicit"
            text="signin_with"
            shape="circle"
            theme="outline"
            size="large"
            width="48px"
            style={{ border: 'none', background: 'transparent', padding: '0', width: '48px', height: '48px' }}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;