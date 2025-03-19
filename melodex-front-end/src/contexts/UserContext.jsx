// Melodex/melodex-front-end/src/contexts/UserContext.jsx
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

  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        setUserID(user.username); // Cognito username
      } catch (error) {
        console.log('No user signed in:', error);
        setUserID(null); // No user logged in
      }
    };
    checkUser();
  }, []);

  const signOut = async () => {
    try {
      await Auth.signOut();
      setUserID(null);
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  return (
    <UserContext.Provider value={{ userID, setUserID, signOut }}>
      {children}
    </UserContext.Provider>
  );
};