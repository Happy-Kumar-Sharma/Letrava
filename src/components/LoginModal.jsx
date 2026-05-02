import React, { useState } from 'react';
import { Button } from './Shared.jsx';
import { authSignin, authSignup } from '../lib/api.js';

const PALETTES = ['indigo', 'coral', 'teal', 'violet', 'amber'];

const lbl = { display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 };
const inp = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid #D1D5DB', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
};
const lk = { color: '#4338CA', cursor: 'pointer', fontWeight: 500 };

export const LoginModal = ({ onClose, onAuth }) => {
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [palette, setPalette] = useState('indigo');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await authSignin({ email, password });
      } else {
        if (!username.trim()) { setError('Pick a username.'); setSubmitting(false); return; }
        await authSignup({
          email,
          password,
          username: username.trim().replace(/^@/, ''),
          palette,
          bio: bio.trim(),
        });
      }
      onAuth();
    } catch (e) {
      const detail = e?.body?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (e?.status === 409) {
        setError('That email or username is already taken.');
      } else if (e?.status === 401) {
        setError('Incorrect email or password.');
      } else if (e?.status === 422) {
        const msgs = e?.body?.detail;
        setError(Array.isArray(msgs) ? (msgs[0]?.msg || 'Invalid input.') : 'Invalid input.');
      } else {
        setError(e?.message || 'Something went wrong.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (next) => { setMode(next); setError(''); };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)',
        zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: 420, maxWidth: '100%', background: '#fff',
          borderRadius: '24px 24px 0 0', padding: '20px 22px 28px',
          paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0))',
          boxShadow: '0 -8px 32px rgba(17,24,39,0.18)',
          overflowY: 'auto', maxHeight: '90vh',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: '#E5E7EB' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true">
              <path d="M 14 8 L 14 52 L 44 52" stroke="#111827" strokeWidth="8" fill="none" strokeLinecap="square" />
              <path d="M 38 10 C 52 16, 56 30, 48 48 C 44 42, 38 38, 32 36 C 36 28, 38 20, 38 10 Z" fill="#E07856" />
            </svg>
            <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 500 }}>Letrava</span>
          </span>
        </div>

        <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, fontWeight: 500, color: '#111827', marginBottom: 4, textAlign: 'center' }}>
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, textAlign: 'center' }}>
          {mode === 'signin' ? 'Sign in with your email and password.' : 'Letters from real people, written for the future.'}
        </div>

        {mode === 'signup' && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="@yourpenname" style={inp} autoFocus />
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                3–40 chars, letters/digits/underscores only.
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Avatar palette</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PALETTES.map((p) => (
                  <button key={p} type="button" onClick={() => setPalette(p)} style={{
                    padding: '6px 12px', borderRadius: 999,
                    border: '1px solid ' + (palette === p ? '#4338CA' : '#E5E7EB'),
                    background: palette === p ? '#EEF2FF' : '#fff',
                    color: palette === p ? '#4338CA' : '#374151',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize',
                  }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Bio (optional)</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                placeholder="A short line about your letters." rows={2}
                style={{ ...inp, resize: 'vertical' }} />
            </div>
          </>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)}
            type="email" placeholder="you@email.com" style={inp} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)}
            type="password" placeholder="••••••••"
            onKeyDown={(e) => e.key === 'Enter' && submit()} style={inp} />
          {mode === 'signup' && (
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Minimum 8 characters.</div>
          )}
        </div>

        <Button variant="primary" onClick={submit}
          disabled={!email || !password || submitting}
          style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}>
          {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </Button>

        {error && (
          <div style={{ fontSize: 12, color: '#B91C1C', textAlign: 'center', marginBottom: 8 }}>
            {error}
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: 13, color: '#6B7280' }}>
          {mode === 'signin' ? (
            <>New to Letrava?{' '}<a onClick={() => switchMode('signup')} style={lk}>Create an account</a></>
          ) : (
            <>Have an account?{' '}<a onClick={() => switchMode('signin')} style={lk}>Sign in</a></>
          )}
        </div>
      </div>
    </div>
  );
};
