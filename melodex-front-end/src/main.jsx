// Filepath: Melodex/melodex-front-end/src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { Amplify } from '@aws-amplify/core'; // Explicit import for clarity
import awsconfig from './aws-exports'; // Adjust extension if needed

// Log config to verify it’s loaded correctly
console.log('AWS Config:', awsconfig);

// Configure Amplify
Amplify.configure(awsconfig);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);