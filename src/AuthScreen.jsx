import React, { useState } from 'react';
import { supabase } from './supabase';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Check your email for a confirmation link, then log in.');
        setMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // AuthScreen disappears once onAuthStateChange fires in App.jsx
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1a1612',
      fontFamily: 'Georgia, serif',
    }}>
      <div style={{
        background: '#231f1a',
        border: '1px solid #3a3028',
        borderRadius: 12,
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: 380,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>𓂀</div>
          <h1 style={{ color: '#c9a961', margin: 0, fontSize: '1.4rem', fontWeight: 600 }}>
            Study Tracker
          </h1>
          <p style={{ color: '#7a6e60', margin: '4px 0 0', fontSize: '0.85rem' }}>
            {mode === 'login' ? 'Sign in to sync your progress' : 'Create an account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />

          {error && (
            <p style={{ color: '#e07070', fontSize: '0.82rem', margin: 0 }}>{error}</p>
          )}
          {message && (
            <p style={{ color: '#7ac47a', fontSize: '0.82rem', margin: 0 }}>{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: '0.65rem',
              background: loading ? '#5a4a2a' : '#c9a961',
              color: '#1a1612',
              border: 'none',
              borderRadius: 7,
              fontFamily: 'Georgia, serif',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? '…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.83rem', color: '#7a6e60' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}
            style={{ background: 'none', border: 'none', color: '#c9a961', cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '0.83rem', padding: 0 }}
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '0.6rem 0.75rem',
  background: '#1a1612',
  border: '1px solid #3a3028',
  borderRadius: 7,
  color: '#e8dcc8',
  fontFamily: 'Georgia, serif',
  fontSize: '0.9rem',
  outline: 'none',
};
