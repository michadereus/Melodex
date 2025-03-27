// Filepath: Melodex/melodex-front-end/src/contexts/VolumeContext.jsx
import React, { createContext, useContext, useState } from 'react';

const VolumeContext = createContext();

export const VolumeProvider = ({ children }) => {
  const [volume, setVolume] = useState(0.5); // Default volume (0 to 1)

  return (
    <VolumeContext.Provider value={{ volume, setVolume }}>
      {children}
    </VolumeContext.Provider>
  );
};

export const useVolumeContext = () => useContext(VolumeContext);