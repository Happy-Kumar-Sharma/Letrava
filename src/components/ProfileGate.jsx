import React, { useEffect, useState } from 'react';
import { Button } from './Shared.jsx';
import { getJSON } from '../lib/api.js';

/**
 * Gates the authed UI. With custom auth, signup creates the user row in one
 * step, so there is no "needs_init" phase — a valid session always means a
 * complete user record exists in the DB.
 */
export const ProfileGate = ({ children }) => {
  const [state, setState] = useState({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ phase: 'loading' });
    getJSON('/api/me')
      .then((me) => { if (!cancelled) setState({ phase: 'ready', me }); })
      .catch((err) => {
        if (cancelled) return;
        setState({ phase: 'error', err });
      });
    return () => { cancelled = true; };
  }, []);

  if (state.phase === 'loading') return <CenteredMessage text="Loading…" />;
  if (state.phase === 'error') {
    return (
      <CenteredMessage
        text={`Could not load your profile. ${state.err?.message || ''}`}
        onRetry={() => setState({ phase: 'loading' })}
      />
    );
  }
  return children(state.me);
};

const CenteredMessage = ({ text, onRetry }) => (
  <div style={{
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'column', gap: 12, padding: 24,
    color: '#6B7280', fontSize: 14, textAlign: 'center',
  }}>
    <div>{text}</div>
    {onRetry && (
      <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>
    )}
  </div>
);
