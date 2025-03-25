// Melodex/melodex-front-end/src/contexts/UserContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Auth } from 'aws-amplify';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userID, setUserID] = useState(null);
  const [userAttributes, setUserAttributes] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profilePicture, setProfilePicture] = useState('https://i.imgur.com/uPnNK9Y.png');

  const checkUser = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser({ bypassCache: true }); // Force refresh to get latest attributes
      console.log('Authenticated user:', user);
      const id = user.attributes?.sub || user.username;
      console.log('Extracted userID:', id);
      console.log('User attributes:', user.attributes); // Log all attributes for debugging
      setUserID(id);
      setUserAttributes(user.attributes || {});

      // Check if user is authenticated via Google
      let identities;
      if (user.attributes?.identities) {
        identities = JSON.parse(user.attributes.identities);
        console.log('Parsed identities:', identities);
      }
      const isGoogleUser = identities && identities.some(id => id.providerName === 'Google');

      // Prioritize custom:username for regular users, Google name for federated users
      const preferredName = isGoogleUser
        ? user.attributes?.name || user.attributes?.email || (identities ? identities[0]?.userId : user.username)
        : user.attributes?.['custom:username'] || user.attributes?.preferred_username || user.attributes?.email || user.username;
      console.log('Setting displayName to:', preferredName);
      setDisplayName(preferredName);

      const pictureUrl = isGoogleUser
        ? user.attributes?.picture
        : user.attributes?.['custom:uploadedPicture'] || user.attributes?.picture;
      if (pictureUrl) {
        console.log('Setting profilePicture to:', pictureUrl);
        setProfilePicture(pictureUrl);
      } else {
        console.log('No custom picture found, using default');
      }

    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown error';
      if (errorMessage.toLowerCase() === 'the user is not authenticated') {
        console.log('User is not authenticated, setting defaults');
        setUserID(null);
        setUserAttributes(null);
        setDisplayName(null);
        setProfilePicture('https://i.imgur.com/uPnNK9Y.png');
      } else {
        console.error('Unexpected error checking user:', errorMessage, error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (!loading && !userID && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      console.log('No user authenticated, redirecting to /login');
      window.location.href = '/login';
    } else if (!loading && userID && window.location.pathname === '/login') {
      console.log('User authenticated, redirecting to /rank');
      window.location.href = '/rank';
    }
  }, [loading, userID]);

  return (
    <UserContext.Provider value={{ userID, setUserID, userAttributes, displayName, setDisplayName, loading, checkUser, profilePicture, setProfilePicture }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUserContext must be used within a UserProvider');
  return context;
};