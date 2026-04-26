import React, { useState } from 'react';
import { Bell, Heart, MessageCircle } from 'lucide-react';
import { Avatar, Tag, Button } from './Shared.jsx';
import { ScreenHeader } from './MobileChrome.jsx';
import { SAMPLE_LETTERS } from '../data/letters.js';

const PROFILE_TABS = [
  { key: 'letters', label: 'Letters' },
  { key: 'about', label: 'About' },
];

export const Profile = ({ author, onOpenLetter, onBack, self }) => {
  const [following, setFollowing] = useState(false);
  const [tab, setTab] = useState('letters');
  const authorLetters = SAMPLE_LETTERS.filter((l) => l.author.name === author.name);
  const allLetters = authorLetters.length > 0 ? authorLetters : SAMPLE_LETTERS.slice(0, 4);

  return (
    <div>
      {!self && <ScreenHeader title="Profile" onBack={onBack} />}

      <div style={{ padding: '20px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <Avatar name={author.name} size={64} palette={author.palette} />
          <div style={{ display: 'flex', gap: 16 }}>
            <Stat n="42" label="letters" />
            <Stat n="1.2k" label="followers" />
            <Stat n="184" label="following" />
          </div>
        </div>
        <div
          style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: 22,
            fontWeight: 500,
            color: '#111827',
            marginBottom: 4,
          }}
        >
          {author.name}
        </div>
        <p
          style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: 14,
            lineHeight: 1.5,
            color: '#4B5563',
            margin: '0 0 14px',
          }}
        >
          A quiet writer in a loud city. Letters about ordinary evenings and the things I want to remember before they
          disappear.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {self ? (
            <Button variant="secondary" size="sm" style={{ flex: 1, justifyContent: 'center' }}>
              Edit profile
            </Button>
          ) : (
            <>
              <Button
                variant={following ? 'pillSec' : 'pill'}
                size="sm"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setFollowing(!following)}
              >
                {following ? 'Following' : 'Follow'}
              </Button>
              <Button variant="secondary" size="sm" icon={Bell}>
                Notify
              </Button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
        {PROFILE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '12px 8px',
              fontSize: 13,
              fontWeight: 600,
              color: tab === t.key ? '#111827' : '#9CA3AF',
              borderBottom: tab === t.key ? '2px solid #6366F1' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'letters' &&
        allLetters.map((l) => (
          <div
            key={l.id}
            onClick={() => onOpenLetter(l)}
            style={{ padding: 16, borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
          >
            <div
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: 17,
                fontWeight: 500,
                color: '#111827',
                lineHeight: 1.3,
                marginBottom: 4,
              }}
            >
              {l.title}
            </div>
            <div
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: 13,
                lineHeight: 1.5,
                color: '#6B7280',
                marginBottom: 8,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {l.excerpt}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#9CA3AF' }}>
              <span>{l.age} ago</span>
              <span>{l.readTime}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Heart size={11} strokeWidth={1.75} />
                {l.reactions}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <MessageCircle size={11} strokeWidth={1.75} />
                {l.comments}
              </span>
            </div>
          </div>
        ))}


      {tab === 'about' && (
        <div
          style={{
            padding: 20,
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: 15,
            lineHeight: 1.6,
            color: '#374151',
          }}
        >
          {author.name} writes letters about evenings, weather, and the small repeated objects of an ordinary life.
        </div>
      )}
    </div>
  );
};

const Stat = ({ n, label }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{n}</div>
    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{label}</div>
  </div>
);