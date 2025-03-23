// Melodex/melodex-front-end/src/contexts/UserContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Auth } from 'aws-amplify';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userID, setUserID] = useState(null);
  const [userAttributes, setUserAttributes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profilePicture, setProfilePicture] = useState('https://i.imgur.com/uPnNK9Y.png'); // Default picture

  const checkUser = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      console.log('Authenticated user:', user);
      const id = user.attributes?.sub || user.username;
      console.log('Extracted userID:', id);
      setUserID(id);
      setUserAttributes(user.attributes || {});
      const pictureUrl = user.attributes?.['custom:uploadedPicture'];
      if (pictureUrl) setProfilePicture(pictureUrl);
    } catch (error) {
      console.error('No user signed in:', error.message);
      setUserID(null);
      setUserAttributes(null);
      setProfilePicture('https://i.imgur.com/uPnNK9Y.png'); // Reset on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  return (
    <UserContext.Provider value={{ userID, userAttributes, loading, checkUser, profilePicture, setProfilePicture }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUserContext must be used within a UserProvider');
  return context;
};