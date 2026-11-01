
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          router.push('/');
        } else {
          setMessage('Account created! Please sign in.');
          setIsSignup(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push('/');
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: '#f5f5f5',
      padding: '20px'
    }}>
      <form onSubmit={handleAuth} style={{
        width: '100%',
        maxWidth: '400px',
        background: 'white',
        padding: '32px',
        borderRadius: '16px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.08)'
      }}>
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>
          {isSignup ? 'Create Account' : 'Welcome Back'}
        </h1>

        <p style={{ color: '#666', marginBottom: '24px' }}>
          {isSignup
            ? 'Sign up to start splitting expenses.'
            : 'Log in to your SplitSmart account.'}
        </p>

        <label>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={inputStyle}
        />

        <label>Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          style={inputStyle}
        />

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading
            ? 'Please wait...'
            : isSignup ? 'Create Account' : 'Log In'}
        </button>

        {message && (
          <p style={{ marginTop: '16px', color: '#d33' }}>
            {message}
          </p>
        )}

        <p style={{ marginTop: '20px', textAlign: 'center' }}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}
          {' '}
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setMessage('');
            }}
            style={{
              border: 'none',
              background: 'none',
              color: '#2563eb',
              cursor: 'pointer'
            }}
          >
            {isSignup ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </form>
    </main>
  );
}

const inputStyle = {
  display: 'block',
  width: '100%',
  padding: '12px',
  margin: '8px 0 18px',
  border: '1px solid #ddd',
  borderRadius: '8px',
  boxSizing: 'border-box'
};

const buttonStyle = {
  width: '100%',
  padding: '13px',
  background: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 'bold'
};
