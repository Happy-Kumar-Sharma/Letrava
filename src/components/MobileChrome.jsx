import React, { useState } from 'react';
import { Bell, Home, Search, Feather, Bookmark, User, ArrowLeft, LogOut } from 'lucide-react';
import { Avatar, Tag, Button, iconBtn } from './Shared.jsx';
import { useApi } from '../lib/api.js';

const TITLES = { home: 'Letrava', search: 'Search', saved: 'Saved', profile: 'Profile' };

export const TopBar = ({ tab, onBell, onSignOut }) => (
  <header
    style={{
      flexShrink: 0,
      height: 56,
      borderBottom: '1px solid #F3F4F6',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      position: 'relative',
      zIndex: 5,
    }}
  >
    {tab === 'home' ? (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true">
          <path d="M 14 8 L 14 52 L 44 52" stroke="#111827" strokeWidth="8" fill="none" strokeLinecap="square" />
          <path d="M 38 10 C 52 16, 56 30, 48 48 C 44 42, 38 38, 32 36 C 36 28, 38 20, 38 10 Z" fill="#E07856" />
        </svg>
        <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, fontWeight: 500, color: '#111827' }}>
          Letrava
        </span>
      </span>
    ) : (
      <span style={{ fontSize: 17, fontWeight: 600, color: '#111827' }}>{TITLES[tab]}</span>
    )}
    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
      <button style={iconBtn} onClick={onBell} aria-label="Notifications">
        <Bell size={20} strokeWidth={1.75} />
      </button>
      {onSignOut && (
        <button style={iconBtn} onClick={onSignOut} aria-label="Sign out" title="Sign out">
          <LogOut size={20} strokeWidth={1.75} />
        </button>
      )}
    </div>
  </header>
);

export const BottomNav = ({ tab, onTab, onWrite }) => {
  const items = [
    { key: 'home',    Icon: Home,     label: 'Home' },
    { key: 'search',  Icon: Search,   label: 'Search' },
    { key: 'write',   Icon: Feather,  label: 'Write', primary: true },
    { key: 'saved',   Icon: Bookmark, label: 'Saved' },
    { key: 'profile', Icon: User,     label: 'You' },
  ];
  return (
    <nav
      style={{
        flexShrink: 0,
        height: 64,
        borderTop: '1px solid #F3F4F6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        background: '#fff',
        padding: '0 8px',
        position: 'relative',
        zIndex: 5,
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      {items.map(({ key, Icon, label, primary }) => {
        if (primary) {
          return (
            <button
              key={key}
              onClick={onWrite}
              aria-label="Write a letter"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#111827',
                color: '#fff',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(17,24,39,0.18)',
                transition: 'transform 200ms cubic-bezier(0.2,0.7,0.2,1)',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Icon size={20} strokeWidth={1.75} />
            </button>
          );
        }
        const active = tab === key;
        return (
          <button
            key={key}
            onClick={() => onTab(key)}
            aria-current={active ? 'page' : undefined}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '6px 10px',
              color: active ? '#111827' : '#9CA3AF',
            }}
          >
            <Icon size={22} strokeWidth={1.75} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.02em' }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export const ScreenHeader = ({ title, onBack, right }) => (
  <header
    style={{
      height: 56,
      borderBottom: '1px solid #F3F4F6',
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px 0 4px',
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      position: 'sticky',
      top: 0,
      zIndex: 5,
      flexShrink: 0,
    }}
  >
    {onBack && (
      <button onClick={onBack} style={iconBtn} aria-label="Back">
        <ArrowLeft size={20} strokeWidth={1.75} />
      </button>
    )}
    <span style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginLeft: onBack ? 0 : 12 }}>{title}</span>
    <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>{right}</div>
  </header>
);

export const SearchScreen = ({ onOpenLetter, onOpenProfile }) => {
  const [q, setQ] = useState('');
  const writers = [
    { name: '@nightowl_p', bio: 'Letters about waiting and weather.', palette: 'violet' },
    { name: '@calmlines', bio: 'Slow notes from a small town.', palette: 'amber' },
    { name: '@rv_letters', bio: 'A quiet record of the ordinary.', palette: 'teal' },
  ];
  return (
    <div>
      <div style={{ padding: 16, borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9CA3AF',
              display: 'inline-flex',
            }}
          >
            <Search size={18} strokeWidth={1.75} />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search letters and writers"
            style={{
              width: '100%',
              padding: '12px 14px 12px 40px',
              borderRadius: 12,
              border: 'none',
              background: '#F3F4F6',
              fontSize: 15,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>
      <div
        style={{
          padding: '20px 16px 8px',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#6B7280',
        }}
      >
        Trending tags
      </div>
      <div style={{ padding: '0 16px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {['solitude', 'evenings', 'cities', 'change', 'memory', 'ordinary', 'hope', 'family', 'rain'].map((t) => (
          <Tag key={t}>#{t}</Tag>
        ))}
      </div>
      <div
        style={{
          padding: '12px 16px 8px',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#6B7280',
        }}
      >
        Writers to follow
      </div>
      {writers.map((w) => (
        <div
          key={w.name}
          onClick={() => onOpenProfile(w)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            cursor: 'pointer',
            borderBottom: '1px solid #F9FAFB',
          }}
        >
          <Avatar name={w.name} size={40} palette={w.palette} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{w.name}</div>
            <div
              style={{
                fontSize: 12,
                color: '#6B7280',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {w.bio}
            </div>
          </div>
          <Button variant="pillSec" size="sm" onClick={(e) => e.stopPropagation()}>
            Follow
          </Button>
        </div>
      ))}
    </div>
  );
};

export const SavedScreen = ({ onOpenLetter }) => {
  const { data, loading, error, refetch } = useApi('/api/saves');
  const saved = data || [];

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
        Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
        <div style={{ marginBottom: 12 }}>Could not load saved letters.</div>
        <Button variant="secondary" size="sm" onClick={refetch}>
          Try again
        </Button>
      </div>
    );
  }
  if (saved.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
        No latest feed yet
      </div>
    );
  }

  return (
    <div>
      {saved.map((l) => (
        <div
          key={l.id}
          onClick={() => onOpenLetter(l)}
          style={{ padding: 16, borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Avatar name={l.author.name} size={20} palette={l.author.palette} />
            <span style={{ fontSize: 12, color: '#6B7280' }}>
              {l.author.name} · {l.age} ago
            </span>
          </div>
          <div
            style={{
              fontFamily: 'Fraunces, Georgia, serif',
              fontSize: 18,
              fontWeight: 500,
              color: '#111827',
              lineHeight: 1.25,
              marginBottom: 4,
            }}
          >
            {l.title}
          </div>
          <div
            style={{
              fontFamily: 'Fraunces, Georgia, serif',
              fontSize: 14,
              lineHeight: 1.5,
              color: '#6B7280',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {l.excerpt}
          </div>
        </div>
      ))}
      <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>
        Saved letters are private.
      </div>
    </div>
  );
};
