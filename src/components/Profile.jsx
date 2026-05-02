import React, { useRef, useState } from 'react';
import { Bell, Camera, Heart, MessageCircle, X } from 'lucide-react';
import { Avatar, Tag, Button } from './Shared.jsx';
import { ScreenHeader } from './MobileChrome.jsx';
import { useApi, postJSON, delJSON, patchJSON } from '../lib/api.js';

const PALETTES = ['indigo', 'coral', 'teal', 'violet', 'amber'];
const PROFILE_TABS = [{ key: 'letters', label: 'Letters' }, { key: 'about', label: 'About' }];

// ---------------------------------------------------------------------------
// Image compression via Canvas API
// ---------------------------------------------------------------------------
function compressImage(file, maxPx = 256, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Edit profile form
// ---------------------------------------------------------------------------
const EditProfileForm = ({ profile, onSaved, onCancel }) => {
  const [palette, setPalette] = useState(profile.palette || 'indigo');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatar, setAvatar] = useState(profile.avatar || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    try {
      const compressed = await compressImage(file);
      setAvatar(compressed);
      setError('');
    } catch {
      setError('Could not process image.');
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await patchJSON('/api/me', { palette, bio, avatar: avatar || '' });
      onSaved(updated);
    } catch (e) {
      setError(e?.body?.detail || e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const inp = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1px solid #D1D5DB', fontSize: 14, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* Avatar upload */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar name={profile.username} size={72} palette={palette} src={avatar} />
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 24, height: 24, borderRadius: '50%',
              background: '#111827', color: '#fff', border: '2px solid #fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Camera size={12} strokeWidth={2} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>@{profile.username}</div>
          <div style={{ fontSize: 12, color: '#9CA3AF' }}>Username cannot be changed</div>
          {avatar && (
            <button
              onClick={() => setAvatar(null)}
              style={{ fontSize: 11, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}
            >
              Remove photo
            </button>
          )}
        </div>
      </div>

      {/* Bio */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A short line about your letters."
          rows={3}
          maxLength={200}
          style={{ ...inp, resize: 'vertical' }}
        />
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, textAlign: 'right' }}>{bio.length}/200</div>
      </div>

      {/* Palette */}
      <div style={{ marginBottom: 18 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Avatar colour</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {PALETTES.map((p) => (
            <button key={p} type="button" onClick={() => setPalette(p)} style={{
              padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', textTransform: 'capitalize',
              border: '1px solid ' + (palette === p ? '#4338CA' : '#E5E7EB'),
              background: palette === p ? '#EEF2FF' : '#fff',
              color: palette === p ? '#4338CA' : '#374151',
            }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ fontSize: 12, color: '#B91C1C', marginBottom: 10 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="primary" onClick={save} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="secondary" onClick={onCancel} style={{ flex: 1, justifyContent: 'center' }}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Profile screen
// ---------------------------------------------------------------------------
export const Profile = ({ author, onOpenLetter, onBack, self }) => {
  const profilePath = self ? '/api/me/profile' : author?.id ? `/api/users/${author.id}` : null;
  const { data: profile, loading, error, refetch } = useApi(profilePath, [profilePath]);
  const lettersPath = profile?.id ? `/api/letters?author=${profile.id}&limit=50` : null;
  const { data: letters } = useApi(lettersPath, [lettersPath]);

  const [tab, setTab] = useState('letters');
  const [busy, setBusy] = useState(false);
  const [followState, setFollowState] = useState(null);
  const [editing, setEditing] = useState(false);
  const [localProfile, setLocalProfile] = useState(null);

  const displayed = localProfile || profile;
  const isFollowing = followState?.is_following ?? displayed?.is_following ?? false;
  const followers = followState?.followers_count ?? displayed?.followers_count ?? 0;

  const toggleFollow = async () => {
    if (!displayed?.id || busy) return;
    setBusy(true);
    try {
      const next = isFollowing
        ? await delJSON(`/api/users/${displayed.id}/follow`)
        : await postJSON(`/api/users/${displayed.id}/follow`, {});
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
        <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Loading…</div>
      </div>
    );
  }

  if (error || !displayed) {
    return (
      <div>
        {!self && <ScreenHeader title="Profile" onBack={onBack} />}
        <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
          <div style={{ marginBottom: 12 }}>Could not load profile.</div>
          <Button variant="secondary" size="sm" onClick={refetch}>Try again</Button>
        </div>
      </div>
    );
  }

  const displayName = displayed.username?.startsWith('@') ? displayed.username : `@${displayed.username}`;

  if (editing && self) {
    return (
      <div>
        <ScreenHeader
          title="Edit profile"
          right={
            <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#374151' }}>
              <X size={20} strokeWidth={1.75} />
            </button>
          }
        />
        <EditProfileForm
          profile={displayed}
          onSaved={(updated) => { setLocalProfile({ ...displayed, ...updated }); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div>
      {!self && <ScreenHeader title="Profile" onBack={onBack} />}

      <div style={{ padding: '20px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <Avatar name={displayName} size={64} palette={displayed.palette} src={displayed.avatar} />
          <div style={{ display: 'flex', gap: 16 }}>
            <Stat n={displayed.letters_count} label="letters" />
            <Stat n={followers} label="followers" />
            <Stat n={displayed.following_count} label="following" />
          </div>
        </div>
        <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, fontWeight: 500, color: '#111827', marginBottom: 4 }}>
          {displayName}
        </div>
        <p style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 14, lineHeight: 1.5, color: '#4B5563', margin: '0 0 14px' }}>
          {displayed.bio || (self ? 'Add a short bio.' : ' ')}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {self ? (
            <Button variant="secondary" size="sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditing(true)}>
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
              <Button variant="secondary" size="sm" icon={Bell}>Notify</Button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
        {PROFILE_TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '12px 8px', fontSize: 13, fontWeight: 600,
            color: tab === t.key ? '#111827' : '#9CA3AF',
            borderBottom: tab === t.key ? '2px solid #6366F1' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'letters' && (
        <>
          {!letters && <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Loading letters…</div>}
          {letters && letters.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No letters yet.</div>}
          {letters && letters.map((l) => (
            <div key={l.id} onClick={() => onOpenLetter(l)} style={{ padding: 16, borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}>
              <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 17, fontWeight: 500, color: '#111827', lineHeight: 1.3, marginBottom: 4 }}>{l.title}</div>
              <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 13, lineHeight: 1.5, color: '#6B7280', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.excerpt}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#9CA3AF' }}>
                <span>{l.age} ago</span>
                <span>{l.read_time}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Heart size={11} strokeWidth={1.75} />{l.reactions}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><MessageCircle size={11} strokeWidth={1.75} />{l.comments}</span>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'about' && (
        <div style={{ padding: 20, fontFamily: 'Fraunces, Georgia, serif', fontSize: 15, lineHeight: 1.6, color: '#374151' }}>
          {displayed.bio || (self ? 'You haven’t added a bio yet.' : `${displayName} has not added a bio.`)}
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
