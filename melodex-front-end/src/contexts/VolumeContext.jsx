  // Filepath: Melodex/melodex-front-end/src/contexts/VolumeContext.jsx
  import React, { createContext, useContext, useState } from 'react';

  const VolumeContext = createContext();

  export const VolumeProvider = ({ children }) => {
    const [volume, setVolume] = useState(0.5); // Default volume
    const [playingAudioRef, setPlayingAudioRef] = useState(null); // Track currently playing audio

    return (
      <VolumeContext.Provider value={{ volume, setVolume, playingAudioRef, setPlayingAudioRef }}>
        {children}
      </VolumeContext.Provider>
    );
  };

  export const useVolumeContext = () => useContext(VolumeContext);