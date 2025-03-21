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
  const { setUserID, setDisplayName, setProfilePicture } = useUserContext();

  const handleRegister = async () => {
    if (!email || !username || !password) {
      setErrorMessage('All fields are required');
      return;
    }

    try {
      await Auth.signUp({
        username: email,
        password,
        attributes: {
          email,
          'custom:username': username,
          'picture': 'https://i.imgur.com/uPnNK9Y.png', // Initial default
        },
      });
      console.log('Registered');
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
      setUserID(user.username);
      setDisplayName(username);
      setProfilePicture('https://i.imgur.com/uPnNK9Y.png');
      setErrorMessage('');
      navigate('/rank');
    } catch (error) {
      console.error('Verification error:', error);
      setErrorMessage(error.message || 'Verification failed');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: '#141820', fontSize: '2rem', marginBottom: '1.5rem' }}>
        Register for My Song Ranker
      </h2>
      {!showVerification ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #bdc3c7', fontSize: '1rem', color: '#2c3e50', background: '#f4f7fa' }}
          />
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
            onClick={handleRegister}
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
            Register
          </button>
          {errorMessage && (
            <p style={{ color: '#e74c3c', textAlign: 'center', fontSize: '0.9rem' }}>{errorMessage}</p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="text"
            placeholder="Verification Code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #bdc3c7', fontSize: '1rem', color: '#2c3e50', background: '#f4f7fa' }}
          />
          <button
            onClick={handleVerify}
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
            Verify
          </button>
          {errorMessage && (
            <p style={{ color: '#e74c3c', textAlign: 'center', fontSize: '0.9rem' }}>{errorMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default Register;