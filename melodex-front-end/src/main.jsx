// File: src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { Amplify } from 'aws-amplify';            // use 'aws-amplify'
import awsconfig from './aws-exports.js';         // ensure .js exists

// Local dev override: tweak the imported config object
if (import.meta.env.DEV) {
  console.log('Local dev: overriding Amplify redirect URLs');
  if (awsconfig.oauth) {
    awsconfig.oauth.redirectSignIn = 'http://localhost:3001/login/';
    awsconfig.oauth.redirectSignOut = 'http://localhost:3001/login/';
  }
}

console.log('AWS Config:', awsconfig);
Amplify.configure(awsconfig);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
