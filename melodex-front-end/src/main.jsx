// File: src/main.jsx
//import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { Amplify } from 'aws-amplify';  
import awsconfig from "./aws-exports";

if (import.meta.env.DEV) {
  console.log("Local dev: overriding Amplify redirect URLs");
  const devRedirect = "http://127.0.0.1:3001/login/";

  if (awsconfig.oauth) {
    awsconfig.oauth.redirectSignIn = devRedirect;
    awsconfig.oauth.redirectSignOut = devRedirect;
  }

  if (awsconfig.Auth && awsconfig.Auth.oauth) {
    awsconfig.Auth.oauth.redirectSignIn = devRedirect;
    awsconfig.Auth.oauth.redirectSignOut = devRedirect;
  }
}

console.log("AWS Config:", awsconfig);

Amplify.configure(awsconfig);

createRoot(document.getElementById('root')).render(
  //<StrictMode>
    <App />
  //</StrictMode>
);
