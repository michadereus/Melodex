// Filepath: Melodex/melodex-front-end/src/contexts/UserContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate, useLocation } from 'react-router-dom';

const isCypressEnv = typeof window !== 'undefined' && !!(window).Cypress;

const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT token:', error);
    return {};
  }
};

const testImageUrl = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
};

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userID, setUserID] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [userPicture, setUserPicture] = useState(null);
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Test-only toggle set by Cypress: window.__E2E_REQUIRE_AUTH__ = true to disable bypass
  const requireAuth =
    typeof window !== 'undefined' && !!(window).__E2E_REQUIRE_AUTH__;

  const checkUser = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser({ bypassCache: true });
      console.log('Authenticated user:', user);

      const extractedUserID = user.username || user.attributes?.sub || user.id;
      console.log('Extracted userID:', extractedUserID);

      let attributeMap = user.attributes || {};
      if (!user.attributes && user.token) {
        console.log('No attributes available, decoding ID token');
        attributeMap = decodeJwt(user.token);
        console.log('Decoded ID token attributes:', attributeMap);
      } else if (!user.attributes) {
        console.log('No attributes or token available in user object, skipping attribute fetch');
      }

      // Fetch user attributes from Cognito if not already present
      if (
        !attributeMap['custom:uploadedPicture'] &&
        !attributeMap['custom:picture'] &&
        !attributeMap.picture
      ) {
        try {
          const attributes = await Auth.userAttributes(user);
          console.log('Fetched Cognito user attributes:', attributes);
          attributeMap = attributes.reduce((acc, attr) => {
            acc[attr.Name] = attr.Value;
            return acc;
          }, {});
          console.log('Converted Cognito attributes to map:', attributeMap);
        } catch (attrError) {
          console.error('Failed to fetch Cognito user attributes:', attrError);
        }
      }

      const name = attributeMap.name || attributeMap['given_name'] || 'User';
      setDisplayName(name);

      let picture =
        attributeMap['custom:uploadedPicture'] ||
        attributeMap['custom:picture'] ||
        attributeMap.picture ||
        'https://i.imgur.com/uPnNK9Y.png';
      const isPictureValid = await testImageUrl(picture);
      if (!isPictureValid) {
        picture = 'https://i.imgur.com/uPnNK9Y.png';
      }
      setUserPicture(picture);

      const userEmail = attributeMap.email || 'N/A';
      setEmail(userEmail);

      setUserID(extractedUserID);
      setLoading(false);

      // ✅ Only auto-redirect to /rank if we're on login/root, and only when not bypassing
      if (
        (!isCypressEnv || requireAuth) &&
        (location.pathname === '/login' || location.pathname === '/')
      ) {
        console.log('User authenticated, redirecting to /rank');
        navigate('/rank');
      }
    } catch (error) {
      console.log('No user authenticated, setting defaults:', error);
      setUserID(null);
      setDisplayName(null);
      setUserPicture('https://i.imgur.com/uPnNK9Y.png');
      setEmail(null);
      setLoading(false);

      // ✅ Redirect unauthenticated users to /login in prod OR when E2E requires auth
      if (
        (!isCypressEnv || requireAuth) &&
        location.pathname !== '/login' &&
        location.pathname !== '/register'
      ) {
        console.log('No user authenticated, redirecting to /login');
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    if (isCypressEnv && !requireAuth) {
      // Fast-path for E2E: skip Amplify, mark as "logged in"
      setUserID('e2e-user');
      setDisplayName('E2E User');
      setUserPicture('https://i.imgur.com/uPnNK9Y.png');
      setEmail('e2e@example.com');
      setLoading(false);
      return;
    }
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <UserContext.Provider
      value={{
        userID,
        setUserID,
        displayName,
        setDisplayName,
        userPicture,
        setUserPicture,
        setProfilePicture: setUserPicture, // alias for existing callers
        email,
        checkUser,
        loading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};
