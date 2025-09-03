// Filepath: Melodex/melodex-front-end/src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { Amplify } from '@aws-amplify/core'; // Explicit import for clarity
import awsconfig from './aws-exports'; // Adjust extension if needed


// Override for local dev
if (import.meta.env.DEV) {
  console.log('Detected local development environment. Overriding Amplify config for local redirects.');
  awsmobile.oauth.redirectSignIn = 'http://localhost:3001/login/';
  awsmobile.oauth.redirectSignOut = 'http://localhost:3001/login/';
  // Optional: If you see region/pool errors, ensure these match your Cognito setup
  // awsmobile.aws_cognito_region = 'us-east-1';
  // awsmobile.aws_user_pools_id = 'us-east-1_NDrWmC0M9';
  // awsmobile.aws_user_pools_web_client_id = '706qcim5329kgn132129rdb6hi';
}


// Log config to verify it’s loaded correctly
console.log('AWS Config:', awsconfig);

// Configure Amplify
Amplify.configure(awsconfig);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);