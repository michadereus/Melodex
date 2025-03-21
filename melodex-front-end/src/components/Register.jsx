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
          'picture': 'https://i.imgur.com/uPnNK9Y.png',
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
    <div className="auth-container">
      <h2 className="auth-title">Register for My Song Ranker</h2>
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
          <button className="auth-button auth-button-primary" onClick={handleRegister}>
            Register
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
          <button className="auth-button auth-button-primary" onClick={handleVerify}>
            Verify
          </button>
          {errorMessage && <p className="auth-error">{errorMessage}</p>}
        </div>
      )}
    </div>
  );
};

export default Register;