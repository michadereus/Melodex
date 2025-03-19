// Melodex/melodex-front-end/src/contexts/UserContext.jsx
import React, { createContext, useState, useContext } from 'react';

const UserContext = createContext();

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUserContext must be used within a UserProvider');
  return context;
};

export const UserProvider = ({ children }) => {
  const [userID, setUserID] = useState('testUser'); // Default until auth is added

  return (
    <UserContext.Provider value={{ userID, setUserID }}>
      {children}
    </UserContext.Provider>
  );
};