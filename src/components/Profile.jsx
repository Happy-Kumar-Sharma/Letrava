import React, { useState } from 'react';
import { Bell, Heart, MessageCircle } from 'lucide-react';
import { Avatar, Tag, Button } from './Shared.jsx';
import { ScreenHeader } from './MobileChrome.jsx';
import { useApi, postJSON, delJSON } from '../lib/api.js';

const PROFILE_TABS = [
  { key: 'letters', label: 'Letters' },
  { key: 'about', label: 'About' },
];

/**
 * Profile screen.
 * - `self`: render the viewer's own profile from /api/me/profile
 * - otherwise: render the author from /api/users/{id} (requires `author.id`)
 */
export const Profile = ({ author, onOpenLetter, onBack, self }) => {
  const profilePath = self
    ? '/api/me/profile'
    : author?.id
      ? `/api/users/${author.id}`
      : null;

  const { data: profile, loading, error, refetch } = useApi(profilePath, [profilePath]);

  // Hide the letters list until we know the author id.
  const lettersPath = profile?.id ? `/api/letters?author=${profile.id}&limit=50` : null;
  const { data: letters } = useApi(lettersPath, [lettersPath]);

  const [tab, setTab] = useState('letters');
  const [busy, setBusy] = useState(false);
  const [followState, setFollowState] = useState(null); // {is_following, followers_count}

  const isFollowing = followState?.is_following ?? profile?.is_following ?? false;
  const followers = followState?.followers_count ?? profile?.followers_count ?? 0;

  const toggleFollow = async () => {
    if (!profile?.id || busy) return;
    setBusy(true);
    try {
      const next = isFollowing
        ? await delJSON(`/api/users/${profile.id}/follow`)
        : await postJSON(`/api/users/${profile.id}/follow`, {});
      setFollowState(next);
    } catch (err) {
      console.error('follow toggle failed', err);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !profilePath) {
    return (
      <div>
        {!self && <ScreenHeader title="Profile" onBack={onBack} />}
        <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
          Loading…
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div>
        {!self && <ScreenHeader title="Profile" onBack={onBack} />}
        <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
          <div style={{ marginBottom: 12 }}>Could not load profile.</div>
          <Button variant="secondary" size="sm" onClick={refetch}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const displayName = profile.username?.startsWith('@') ? profile.username : `@${profile.username}`;

  return (
    <div>
      {!self && <ScreenHeader title="Profile" onBack={onBack} />}

      <div style={{ padding: '20px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <Avatar name={displayName} size={64} palette={profile.palette} />
          <div style={{ display: 'flex', gap: 16 }}>
            <Stat n={profile.letters_count} label="letters" />
            <Stat n={followers} label="followers" />
            <Stat n={profile.following_count} label="following" />
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
          {displayName}
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
          {profile.bio || (self ? 'Add a short bio.' : ' ')}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {self ? (
            <Button variant="secondary" size="sm" style={{ flex: 1, justifyContent: 'center' }}>
              Edit profile
            </Button>
          ) : (
            <>
              <Button
                variant={isFollowing ? 'pillSec' : 'pill'}
                size="sm"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={toggleFollow}
                disabled={busy}
              >
                {isFollowing ? 'Following' : 'Follow'}
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

      {tab === 'letters' && (
        <>
          {!letters && (
            <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
              Loading letters…
            </div>
          )}
          {letters && letters.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
              No latest feed yet
            </div>
          )}
          {letters && letters.map((l) => (
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
                <span>{l.read_time}</span>
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
        </>
      )}

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
          {profile.bio || (self ? 'You haven\u2019t added a bio yet.' : `${displayName} has not added a bio.`)}
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
