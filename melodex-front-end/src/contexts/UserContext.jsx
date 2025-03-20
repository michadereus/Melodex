// Filepath: Melodex/melodex-front-end/src/contexts/UserContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { Auth } from '@aws-amplify/auth';

const UserContext = createContext();

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUserContext must be used within a UserProvider');
  return context;
};

export const UserProvider = ({ children }) => {
  const [userID, setUserID] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      console.log('Authenticated user:', user);
      console.log('User attributes:', user.attributes);
      setUserID(user.username);
      // Prioritize custom:username for email/password, preferred_username for Google
      const preferredName = user.attributes?.['custom:username'] || user.attributes?.preferred_username || user.attributes?.email || user.username;
      setDisplayName(preferredName);
    } catch (error) {
      console.log('No user signed in:', error);
      setUserID(null);
      setDisplayName(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  const signOut = async () => {
    try {
      await Auth.signOut();
      setUserID(null);
      setDisplayName(null);
      console.log('Signed out');
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  return (
    <UserContext.Provider value={{ userID, setUserID, displayName, setDisplayName, signOut, loading }}>
      {children}
    </UserContext.Provider>
  );
};