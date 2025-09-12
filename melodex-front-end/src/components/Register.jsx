// Filepath: Melodex/melodex-front-end/src/components/Register.jsx
import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '../contexts/UserContext';

const Register = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const ctx = useUserContext();
  console.log('UserContext value:', ctx);
  const { setUserID, setDisplayName, setProfilePicture, checkUser } = ctx;

  const handleRegister = async () => {
    if (!email || !username || !password) {
      setErrorMessage('All fields are required');
      return;
    }

    try {
      const signUpResponse = await Auth.signUp({
        username: email,
        password,
        attributes: {
          email,
          'custom:username': username,
          'picture': 'https://i.imgur.com/uPnNK9Y.png',
        },
      });
      console.log('Sign-up response:', signUpResponse);
      setShowVerification(true);
      setErrorMessage('');
    } catch (error) {
      console.error('Registration error:', error);
      setErrorMessage(error.message || 'Registration failed');
    }
  };

  const handleVerify = async () => {
    try {
      await Auth.confirmSignUp(email, verificationCode);
      console.log('Verified');
      const user = await Auth.signIn(email, password);
      console.log('Signed in after verification:', user);


      try { console.log('before setUserID'); setUserID(user.username); console.log('after setUserID'); } catch (e) { console.error('setUserID failed', e); throw e; }
      try { console.log('before setDisplayName'); setDisplayName(username); console.log('after setDisplayName'); } catch (e) { console.error('setDisplayName failed', e); throw e; }
      try { console.log('before setProfilePicture'); setProfilePicture('https://i.imgur.com/uPnNK9Y.png'); console.log('after setProfilePicture'); } catch (e) { console.error('setProfilePicture failed', e); throw e; }

      try { console.log('before checkUser'); await checkUser(); console.log('after checkUser'); } catch (e) { console.error('checkUser failed', e); throw e; }


      console.log('Navigating to /rank');
      navigate('/rank');
    } catch (error) {
      console.error('Verification error:', error);
      setErrorMessage(error.message || 'Verification failed');
    }
  };

  const handleBackToLogin = () => {
    console.log('Navigating back to /login');
    navigate('/login');
  };

  return (
    <div className="auth-container">
      <h2
        style={{
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
          fontSize: '2rem', // Larger than navbar
          fontWeight: 600, // Matches navbar
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
        Register
      </p>
      {!showVerification ? (
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
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
            onClick={handleRegister}
            style={{ borderRadius: '0.5rem' }}
          >
            Register
          </button>
          <button
            className="auth-button auth-button-secondary"
            onClick={handleBackToLogin}
            style={{
              borderRadius: '0.5rem',
              marginTop: '1rem', // Space above the button
              background: '#7f8c8d', // Matches gray from Login
            }}
          >
            Back to Login
          </button>
          {errorMessage && <p className="auth-error">{errorMessage}</p>}
        </div>
      ) : (
        <div className="auth-form">
          <input
            className="auth-input"
            type="text"
            placeholder="Verification Code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
          />
          <button
            className="auth-button auth-button-primary"
            onClick={handleVerify}
            style={{ borderRadius: '0.5rem' }}
          >
            Verify
          </button>
          <button
            className="auth-button auth-button-secondary"
            onClick={handleBackToLogin}
            style={{
              borderRadius: '0.5rem',
              marginTop: '1rem',
              background: '#7f8c8d', // Matches gray from Login
            }}
          >
            Back to Login
          </button>
          {errorMessage && <p className="auth-error">{errorMessage}</p>}
        </div>
      )}
    </div>
  );
};

export default Register;