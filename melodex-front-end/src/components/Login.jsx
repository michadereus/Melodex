// Melodex/melodex-front-end/src/components/Login.jsx
import React from 'react';

const Login = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: '#141820', fontSize: '2rem', marginBottom: '1.5rem' }}>
        Log In
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="email"
          placeholder="Email"
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid #bdc3c7',
            fontSize: '1rem',
            color: '#2c3e50',
            background: '#f4f7fa',
          }}
        />
        <input
          type="password"
          placeholder="Password"
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid #bdc3c7',
            fontSize: '1rem',
            color: '#2c3e50',
            background: '#f4f7fa',
          }}
        />
        <button
          style={{
            background: '#3498db',
            color: 'white',
            border: 'none',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.3s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
          onMouseOver={(e) => (e.target.style.background = '#2980b9')}
          onMouseOut={(e) => (e.target.style.background = '#3498db')}
        >
          Log In
        </button>
        <button
          style={{
            background: '#db4437',
            color: 'white',
            border: 'none',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.3s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
          onMouseOver={(e) => (e.target.style.background = '#c0392b')}
          onMouseOut={(e) => (e.target.style.background = '#db4437')}
        >
          Log In with Google
        </button>
      </div>
    </div>
  );
};

export default Login;