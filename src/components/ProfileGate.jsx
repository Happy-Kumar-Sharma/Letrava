import React, { useEffect, useState } from 'react';
import { Button } from './Shared.jsx';
import { getJSON, postJSON, ApiError } from '../lib/api.js';

const PALETTES = ['indigo', 'coral', 'teal', 'violet', 'amber'];

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

/**
 * Gates the authed UI. After sign-in we may have a Supabase user but no row in
 * our `users` table yet — in that case we ask for a username, palette and bio,
 * then call POST /api/me/init.
 */
export const ProfileGate = ({ children }) => {
  const [state, setState] = useState({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ phase: 'loading' });
    getJSON('/api/me')
      .then((me) => {
        if (!cancelled) setState({ phase: 'ready', me });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setState({ phase: 'needs_init' });
        } else {
          setState({ phase: 'error', err });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.phase === 'loading') {
    return <CenteredMessage text="Loading…" />;
  }
  if (state.phase === 'error') {
    return (
      <CenteredMessage
        text={`Could not load your profile. ${state.err?.message || ''}`}
        onRetry={() => setState({ phase: 'loading' })}
      />
    );
  }
  if (state.phase === 'needs_init') {
    return (
      <InitProfileForm
        onCreated={(me) => setState({ phase: 'ready', me })}
      />
    );
  }
  return children(state.me);
};

const CenteredMessage = ({ text, onRetry }) => (
  <div
    style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 12,
      padding: 24,
      color: '#6B7280',
      fontSize: 14,
      textAlign: 'center',
    }}
  >
    <div>{text}</div>
    {onRetry && (
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

const InitProfileForm = ({ onCreated }) => {
  const [username, setUsername] = useState('');
  const [palette, setPalette] = useState('indigo');
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) {
      setError('Pick a username.');
      return;
    }
    setSubmitting(true);
    try {
      const me = await postJSON('/api/me/init', {
        username: username.trim().replace(/^@/, ''),
        palette,
        bio: bio.trim(),
      });
      onCreated(me);
    } catch (err) {
      const msg = err?.body?.detail || err?.message || 'Could not create profile.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: '100%',
          maxWidth: 380,
          background: '#fff',
          padding: 24,
          borderRadius: 14,
          border: '1px solid #F3F4F6',
        }}
      >
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
          One more step
        </div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 18, textAlign: 'center' }}>
          Pick a pseudonym to write under.
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@yourpenname"
            style={inp}
            autoFocus
          />
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Pseudonyms only.</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Avatar palette</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PALETTES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPalette(p)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: '1px solid ' + (palette === p ? '#4338CA' : '#E5E7EB'),
                  background: palette === p ? '#EEF2FF' : '#fff',
                  color: palette === p ? '#4338CA' : '#374151',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Bio (optional)</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short line about your letters."
            rows={2}
            style={{ ...inp, resize: 'vertical' }}
          />
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#B91C1C', marginBottom: 8, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <Button
          variant="primary"
          type="submit"
          disabled={!username.trim() || submitting}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {submitting ? 'Creating…' : 'Continue'}
        </Button>
      </form>
    </div>
  );
};
