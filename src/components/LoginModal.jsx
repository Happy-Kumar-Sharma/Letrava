import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from './Shared.jsx';
import { supabase } from '../lib/supabase.js';

const lbl = { display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 };
const inp = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #D1D5DB',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};
const lk = { color: '#4338CA', cursor: 'pointer', fontWeight: 500 };

export const LoginModal = ({ onClose, onAuth }) => {
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sendMagicLink = async () => {
    setError('');
    setSubmitting(true);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (err) throw err;
      setSent(true);
    } catch (e) {
      setError(e?.message || 'Could not send sign-in link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17,24,39,0.45)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: 420,
          maxWidth: '100%',
          background: '#fff',
          borderRadius: '24px 24px 0 0',
          padding: '20px 22px 28px',
          paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0))',
          boxShadow: '0 -8px 32px rgba(17,24,39,0.18)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: '#E5E7EB' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true">
              <path
                d="M 14 8 L 14 52 L 44 52"
                stroke="#111827"
                strokeWidth="8"
                fill="none"
                strokeLinecap="square"
              />
              <path
                d="M 38 10 C 52 16, 56 30, 48 48 C 44 42, 38 38, 32 36 C 36 28, 38 20, 38 10 Z"
                fill="#E07856"
              />
            </svg>
            <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 500 }}>Letrava</span>
          </span>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#EEF2FF',
                color: '#4338CA',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <Mail size={22} strokeWidth={1.75} />
            </div>
            <div
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: 22,
                fontWeight: 500,
                color: '#111827',
                marginBottom: 6,
              }}
            >
              Check your inbox
            </div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 18 }}>
              Sign-in link sent to <strong style={{ color: '#111827' }}>{email}</strong>.
            </div>
            <Button variant="primary" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <div
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: 22,
                fontWeight: 500,
                color: '#111827',
                marginBottom: 4,
                textAlign: 'center',
              }}
            >
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, textAlign: 'center' }}>
              {mode === 'signin' ? "We'll email you a sign-in link." : 'Letters from real people, written for the future.'}
            </div>
            {mode === 'signup' && (
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@yourpenname"
                  style={inp}
                />
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Pseudonyms only.</div>
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@email.com"
                style={inp}
              />
            </div>
            <Button
              variant="primary"
              onClick={sendMagicLink}
              disabled={!email || submitting}
              style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
            >
              {submitting
                ? 'Sending…'
                : mode === 'signin'
                  ? 'Email me a sign-in link'
                  : 'Create account'}
            </Button>
            {error && (
              <div style={{ fontSize: 12, color: '#B91C1C', textAlign: 'center', marginBottom: 8 }}>
                {error}
              </div>
            )}
            <div style={{ textAlign: 'center', fontSize: 13, color: '#6B7280' }}>
              {mode === 'signin' ? (
                <>
                  New to Letrava?{' '}
                  <a onClick={() => setMode('signup')} style={lk}>
                    Create an account
                  </a>
                </>
              ) : (
                <>
                  Have an account?{' '}
                  <a onClick={() => setMode('signin')} style={lk}>
                    Sign in
                  </a>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
