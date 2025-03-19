// Melodex/melodex-front-end/src/components/Register.jsx
import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      await Auth.signUp({
        username: email, // Use email as username
        password,
        attributes: { email } // Additional email attribute
      });
      console.log('Registered');
      setShowVerification(true);
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const handleVerify = async () => {
    try {
      await Auth.confirmSignUp(email, verificationCode);
      console.log('Verified');
      navigate('/login');
    } catch (error) {
      console.error('Verification error:', error);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: '#141820', fontSize: '2rem', marginBottom: '1.5rem' }}>
        Register
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {!showVerification ? (
          <>
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
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};

export default Register;