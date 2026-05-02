import React from 'react';
import { Flame, Heart, MessageCircle } from 'lucide-react';
import { Button } from './Shared.jsx';
import { useApi } from '../lib/api.js';

export const Onboarding = ({ onSignIn, onOpenLetter }) => {
  const { data: top5, loading, error } = useApi('/api/letters?feed=trending&limit=5');
  const list = top5 || [];

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      <div style={{ padding: '32px 24px 20px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
            <path d="M 14 8 L 14 52 L 44 52" stroke="#111827" strokeWidth="8" fill="none" strokeLinecap="square" />
            <path d="M 38 10 C 52 16, 56 30, 48 48 C 44 42, 38 38, 32 36 C 36 28, 38 20, 38 10 Z" fill="#E07856" />
          </svg>
          <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, fontWeight: 500 }}>Letrava</span>
        </div>
        <h1
          style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: 30,
            fontWeight: 500,
            lineHeight: 1.1,
            letterSpacing: '-0.015em',
            color: '#111827',
            margin: '0 0 12px',
          }}
        >
          Letters from real people, written for the future.
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: '#6B7280', margin: '0 0 20px' }}>
          Follow writers. Read thoughts. Capture the present.
        </p>
        <Button
          variant="primary"
          onClick={() => onSignIn('signup')}
          style={{ width: '100%', justifyContent: 'center', padding: '12px 18px' }}
        >
          Create account
        </Button>
        <Button
          variant="secondary"
          onClick={() => onSignIn('signin')}
          style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', marginTop: 10 }}
        >
          Sign in
        </Button>
      </div>

      {/* Top 5 trending preview */}
      <div style={{ padding: '12px 16px 20px', borderTop: '1px solid #F3F4F6', background: '#FAFAF7' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#B85E3E',
            marginBottom: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Flame size={12} strokeWidth={1.75} />
          Trending today · top 5
        </div>

        {loading && <div style={{ padding: '12px 0', color: '#9CA3AF', fontSize: 13 }}>Loading…</div>}
        {error && (
          <div style={{ padding: '12px 0', color: '#9CA3AF', fontSize: 13 }}>
            Could not load trending letters.
          </div>
        )}
        {!loading && !error && list.length === 0 && (
          <div style={{ padding: '12px 0', color: '#9CA3AF', fontSize: 13 }}>
            No latest feed yet
          </div>
        )}

        {list.map((l, i) => (
          <div
            key={l.id}
            onClick={() => onOpenLetter(l)}
            style={{
              display: 'flex',
              gap: 12,
              padding: '12px 0',
              borderBottom: i < list.length - 1 ? '1px solid #EDEAE2' : 'none',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: 24,
                fontWeight: 500,
                color: '#A5B4FC',
                lineHeight: 1,
                width: 24,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'Fraunces, Georgia, serif',
                  fontSize: 15,
                  fontWeight: 500,
                  color: '#111827',
                  lineHeight: 1.3,
                  marginBottom: 4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {l.title}
              </div>
              <div style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{l.author.name}</span>·
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Heart size={10} strokeWidth={1.75} />
                  {l.reactions}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <MessageCircle size={10} strokeWidth={1.75} />
                  {l.comments}
                </span>
              </div>
            </div>
          </div>
        ))}

        <div
          style={{
            marginTop: 14,
            padding: '14px 16px',
            borderRadius: 12,
            background: '#fff',
            border: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>More letters waiting.</div>
          <Button variant="primary" size="sm" onClick={() => onSignIn('signup')}>
            Get started
          </Button>
        </div>
      </div>
    </div>
  );
};
