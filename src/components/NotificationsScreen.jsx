import React, { useState } from 'react';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  UserPlus,
  AtSign,
} from 'lucide-react';
import { Avatar, Button } from './Shared.jsx';
import { useApi, postJSON, delJSON } from '../lib/api.js';

const KIND_ICON = {
  reaction: Heart,
  comment:  MessageCircle,
  follow:   UserPlus,
  mention:  AtSign,
};
const KIND_TINT = {
  reaction: { bg: '#FBE5DA', fg: '#B85E3E' },
  comment:  { bg: '#E0F2EF', fg: '#0F766E' },
  follow:   { bg: '#EEF2FF', fg: '#4338CA' },
  mention:  { bg: '#F1ECFF', fg: '#6B21A8' },
};

const TABS = [
  { key: 'all',      label: 'All' },
  { key: 'mentions', label: 'Mentions' },
  { key: 'follows',  label: 'Follows' },
];

export const NotificationsScreen = ({ onBack }) => {
  const { data, loading } = useApi('/api/notifications');
  const notifs = data || [];
  const [tab, setTab] = useState('all');

  const filtered = notifs.filter((n) => {
    if (tab === 'mentions') return n.kind === 'mention';
    if (tab === 'follows')  return n.kind === 'follow';
    return true;
  });

  const today   = filtered.filter((n) => n.unread);
  const earlier = filtered.filter((n) => !n.unread);

  return (
    <div>
      {/* Sticky header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 6,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid #F3F4F6',
        }}
      >
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
          }}
        >
          <button
            onClick={onBack}
            aria-label="Back"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              color: '#374151',
              display: 'inline-flex',
              borderRadius: '50%',
            }}
          >
            <ArrowLeft size={20} strokeWidth={1.75} />
          </button>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginLeft: 4 }}>
            Notifications
          </span>
          <button
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              color: '#6B7280',
              padding: '0 12px',
            }}
          >
            Mark all read
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0 8px' }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '12px 4px',
                fontSize: 13,
                fontWeight: 600,
                color: tab === t.key ? '#111827' : '#9CA3AF',
                borderBottom: '2px solid ' + (tab === t.key ? '#111827' : 'transparent'),
                marginBottom: -1,
                fontFamily: 'inherit',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
          Loading…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
          Nothing here yet.
        </div>
      )}

      {today.length > 0 && (
        <>
          <SectionLabel>Today</SectionLabel>
          {today.map((n) => <NotifRow key={n.id} n={n} unread />)}
        </>
      )}

      {earlier.length > 0 && (
        <>
          <SectionLabel>Earlier</SectionLabel>
          {earlier.map((n) => <NotifRow key={n.id} n={n} />)}
        </>
      )}
    </div>
  );
};

const NotifRow = ({ n, unread }) => {
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const tint = KIND_TINT[n.kind] || KIND_TINT.mention;
  const Icon = KIND_ICON[n.kind] || AtSign;
  const name = n.actor?.username?.startsWith('@') ? n.actor.username : `@${n.actor?.username}`;

  const toggleFollow = async (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      if (following) {
        await delJSON(`/api/users/${n.actor?.id}/follow`);
      } else {
        await postJSON(`/api/users/${n.actor?.id}/follow`, {});
      }
      setFollowing(!following);
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '14px 16px',
        borderBottom: '1px solid #F3F4F6',
        background: unread ? '#FAFAFC' : '#fff',
        position: 'relative',
        alignItems: 'flex-start',
      }}
    >
      {unread && (
        <span
          style={{
            position: 'absolute',
            left: 6,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#6366F1',
          }}
        />
      )}

      {/* Avatar + type badge */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar
          name={name}
          size={36}
          palette={n.actor?.palette || 'indigo'}
          src={n.actor?.avatar}
        />
        <span
          style={{
            position: 'absolute',
            right: -4,
            bottom: -4,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: tint.bg,
            color: tint.fg,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #fff',
          }}
        >
          <Icon size={10} strokeWidth={2} />
        </span>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#1F2937', lineHeight: 1.45 }}>
          <strong style={{ color: '#111827' }}>{name}</strong>{' '}
          {n.what}
          {n.letter_title && (
            <>
              {' · '}
              <span style={{ color: '#9CA3AF' }}>
                {n.letter_title.length > 40 ? n.letter_title.slice(0, 40) + '…' : n.letter_title}
              </span>
            </>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{n.age} ago</div>
      </div>

      {n.kind === 'follow' && (
        <Button
          variant={following ? 'pillSec' : 'pill'}
          size="sm"
          onClick={toggleFollow}
          disabled={busy}
        >
          {following ? 'Following' : 'Follow back'}
        </Button>
      )}
    </div>
  );
};

const SectionLabel = ({ children }) => (
  <div
    style={{
      padding: '12px 16px 8px',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: '#9CA3AF',
    }}
  >
    {children}
  </div>
);
