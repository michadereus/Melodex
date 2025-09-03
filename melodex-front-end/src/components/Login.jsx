// Filepath: Melodex/melodex-front-end/src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '../contexts/UserContext';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false); // New state for sign-in loading
  const navigate = useNavigate();
  const { checkUser, loading } = useUserContext();

  // Your Google Client ID
  const GOOGLE_CLIENT_ID = '178829211245-19gec6v6qatnj74rbpb2st97c3hr1p8i.apps.googleusercontent.com';

  // Check if user is already authenticated on mount
  useEffect(() => {
    const verifyUser = async () => {
      try {
        await Auth.currentAuthenticatedUser();
        console.log('User already authenticated, redirecting to /rank');
        await checkUser();
        navigate('/rank');
      } catch (error) {
        console.log('No user authenticated, proceeding with login');
      }
    };
    verifyUser();
  }, [checkUser, navigate]);

  // Handle email/password login
  const handleLogin = async () => {
    setIsSigningIn(true); // Set loading state
    try {
      console.log('Attempting email/password sign-in with email:', email);
      const user = await Auth.signIn(email, password);
      console.log('Logged in with email:', user);
      await checkUser();
      navigate('/rank');
    } catch (error) {
      console.error('Email login error:', error.message || error);
      alert(`Login failed: ${error.message || 'Unknown error. Check console for details.'}`);
    } finally {
      setIsSigningIn(false); // Reset loading state
    }
  };

  // Handle Google login success
  const handleGoogleLogin = async (credentialResponse) => {
    const idToken = credentialResponse.credential; // Google ID token
    console.log('Google ID token:', idToken);

    try {
      // Check if user is already signed in
      const currentUser = await Auth.currentAuthenticatedUser();
      console.log('User already signed in:', currentUser);
      await checkUser();
      navigate('/rank');
    } catch (error) {
      // No user signed in, proceed with federated sign-in
      try {
        const user = await Auth.federatedSignIn(
          'accounts.google.com',
          { token: idToken },
          {}
        );
        console.log('Signed in with Google via Cognito User Pool:', user);
        await checkUser();
        console.log('User context updated after Google login');
        navigate('/rank');
      } catch (federatedError) {
        console.error('Error signing in with Google token:', federatedError.message || federatedError);
      }
    }
  };

  // Handle Google login failure
  const handleGoogleFailure = (error) => {
    console.error('Google login failed:', error);
  };

  const handleRegisterRedirect = () => {
    navigate('/register');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

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
        Sign in to rank your favorite music
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
          disabled={isSigningIn} // Disable button while signing in
        >
          {isSigningIn ? 'Signing In...' : 'Sign In'}
        </button>
        <button
          className="auth-button auth-button-secondary"
          onClick={handleRegisterRedirect}
          style={{ borderRadius: '0.5rem' }}
        >
          Register
        </button>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={handleGoogleFailure}
            render={(renderProps) => (
              <button
                className="auth-button auth-button-google"
                onClick={renderProps.onClick}
                disabled={renderProps.disabled}
                style={{ borderRadius: '0.5rem' }}
              >
                <img
                  src="https://developers.google.com/identity/images/g-logo.png"
                  alt="Google Logo"
                  style={{ width: '20px', marginRight: '8px' }}
                />
                Sign in with Google
              </button>
            )}
          />
        </GoogleOAuthProvider>
      </div>
    </div>
  );
};

export default Login;