import React, { useRef, useState } from 'react';
import { Bell, BellOff, Camera, Heart, MessageCircle, Share2, X, ArrowLeft, MoreHorizontal, Trash2 } from 'lucide-react';
import { Avatar, Tag, Button, iconBtnSm } from './Shared.jsx';
import { ScreenHeader } from './MobileChrome.jsx';
import { useApi, postJSON, delJSON, patchJSON, triggerGlobalRefresh } from '../lib/api.js';
import { useShare } from '../hooks/useShare.js';

const PALETTES = ['indigo', 'coral', 'teal', 'violet', 'amber'];

// Cover gradient by palette — keeps profile cover band tied to the avatar color.
const COVERS = {
  indigo: 'linear-gradient(135deg, #EEF2FF 0%, #C7D2FE 100%)',
  coral:  'linear-gradient(135deg, #FBE5DA 0%, #F5C9B6 100%)',
  teal:   'linear-gradient(135deg, #E0F2EF 0%, #99F6E4 100%)',
  violet: 'linear-gradient(135deg, #F1ECFF 0%, #DDD6FE 100%)',
  amber:  'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
};

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
// Edit profile form (unchanged)
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
// Inline letter row with optional delete
// ---------------------------------------------------------------------------
const ProfileLetterRow = ({ letter: l, canDelete, onOpen, onDeleted }) => {
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div
      onClick={confirmDel ? undefined : onOpen}
      style={{ padding: 16, borderBottom: '1px solid #F3F4F6', cursor: confirmDel ? 'default' : 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 17, fontWeight: 500, color: '#111827', lineHeight: 1.3, marginBottom: 4 }}>{l.title}</div>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 13, lineHeight: 1.55, color: '#6B7280', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.excerpt}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#9CA3AF' }}>
            <span>{l.age} ago</span>
            <span>{l.read_time}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Heart size={11} strokeWidth={1.75} />{l.reactions}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><MessageCircle size={11} strokeWidth={1.75} />{l.comments}</span>
          </div>
        </div>
        {canDelete && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, paddingTop: 2 }}
          >
            {!confirmDel ? (
              <button
                onClick={() => setConfirmDel(true)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#9CA3AF', display: 'inline-flex' }}
                aria-label="Delete letter"
                title="Delete letter"
              >
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ color: '#374151' }}>Delete?</span>
                <button
                  onClick={async () => {
                    try { await delJSON(`/api/letters/${l.id}`); onDeleted?.(); }
                    catch { /* ignore */ }
                    setConfirmDel(false);
                  }}
                  style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >Yes</button>
                <button
                  onClick={() => setConfirmDel(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9CA3AF', fontFamily: 'inherit' }}
                >Cancel</button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Profile screen — upgraded with cover band, segmented tabs, polish
// ---------------------------------------------------------------------------
const PROFILE_TABS = [
  { key: 'letters', label: 'Letters' },
  { key: 'about',   label: 'About' },
];

export const Profile = ({ author, onOpenLetter, onBack, self }) => {
  const profilePath = self ? '/api/me/profile' : author?.id ? `/api/users/${author.id}` : null;
  const { data: profile, loading, error, refetch } = useApi(profilePath, [profilePath]);
  const lettersPath = profile?.id ? `/api/letters?author=${profile.id}&limit=50` : null;
  const { data: letters } = useApi(lettersPath, [lettersPath]);

  const [tab, setTab] = useState('letters');
  const [busy, setBusy] = useState(false);
  const [followState, setFollowState] = useState(null);
  const [notifyState, setNotifyState] = useState(null);
  const [editing, setEditing] = useState(false);
  const [localProfile, setLocalProfile] = useState(null);
  const share = useShare();

  const displayed = localProfile || profile;
  const isFollowing   = followState?.is_following ?? displayed?.is_following ?? false;
  const followers     = followState?.followers_count ?? displayed?.followers_count ?? 0;
  const notify        = notifyState ?? followState?.notify_new_letters ?? displayed?.notify_new_letters ?? false;

  const toggleFollow = async () => {
    if (!displayed?.id || busy) return;
    setBusy(true);
    try {
      const next = isFollowing
        ? await delJSON(`/api/users/${displayed.id}/follow`)
        : await postJSON(`/api/users/${displayed.id}/follow`, {});
      setFollowState(next);
      if (!isFollowing) setNotifyState(next.notify_new_letters ?? true);
      else setNotifyState(false);
    } catch (err) {
      console.error('follow toggle failed', err);
    } finally {
      setBusy(false);
    }
  };

  const toggleNotify = async () => {
    if (!displayed?.id || !isFollowing || busy) return;
    setBusy(true);
    try {
      const res = await patchJSON(`/api/users/${displayed.id}/follow/notify`, {});
      setNotifyState(res.notify_new_letters);
    } catch (err) {
      console.error('notify toggle failed', err);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !profilePath) {
    return (
      <div>
        {!self && <ScreenHeader title="Profile" onBack={onBack} />}
        <ProfileSkeleton />
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

  const cover = COVERS[displayed.palette] || COVERS.indigo;
  const joinDate = displayed.created_at ? formatJoinDate(displayed.created_at) : null;

  return (
    <div>
      {/* Cover band — gradient from palette, with floating back/more controls */}
      <div style={{ height: 96, background: cover, position: 'relative' }}>
        {!self && onBack && (
          <button
            onClick={onBack}
            style={{
              position: 'absolute', left: 8, top: 8,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.85)',
              border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              color: '#111827',
            }}
            aria-label="Back"
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </button>
        )}
        <button
          style={{
            position: 'absolute', right: 8, top: 8,
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.85)',
            border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            color: '#111827',
          }}
          aria-label="More"
        >
          <MoreHorizontal size={18} strokeWidth={1.75} />
        </button>
      </div>

      {/* Avatar overlapping cover band */}
      <div style={{ padding: '0 20px', marginTop: -36, position: 'relative' }}>
        <div style={{ display: 'inline-block', borderRadius: '50%', border: '4px solid #fff', background: '#fff' }}>
          <Avatar name={displayName} size={72} palette={displayed.palette} src={displayed.avatar} />
        </div>
      </div>

      {/* Identity & meta */}
      <div style={{ padding: '12px 20px 8px' }}>
        <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 24, fontWeight: 500, color: '#111827', lineHeight: 1.1 }}>
          {displayName}
        </div>
        {joinDate && (
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Joined {joinDate}</div>
        )}
        {(displayed.bio || self) && (
          <p style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 15, lineHeight: 1.55, color: '#374151', margin: '12px 0 14px' }}>
            {displayed.bio || (self ? 'Add a short bio.' : ' ')}
          </p>
        )}

        {/* Stat row */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
          <Stat n={displayed.letters_count ?? 0} label="letters" />
          <Stat n={followers} label="followers" />
          <Stat n={displayed.following_count ?? 0} label="following" />
        </div>

        {/* CTA cluster */}
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
              <button
                style={{
                  ...iconBtnSm,
                  color: isFollowing && notify ? '#6366F1' : '#374151',
                  opacity: isFollowing ? 1 : 0.4,
                }}
                onClick={toggleNotify}
                disabled={!isFollowing || busy}
                aria-label={notify ? 'Turn off notifications' : 'Notify on new letters'}
                title={notify ? 'Notifications on' : 'Get notified when they post'}
              >
                {notify && isFollowing
                  ? <Bell size={18} strokeWidth={1.75} fill="#6366F1" color="#6366F1" />
                  : <Bell size={18} strokeWidth={1.75} />
                }
              </button>
              <button
                style={iconBtnSm}
                onClick={() => share({
                  title: `${displayName} on Letrava`,
                  text: displayed.bio || 'Read their letters on Letrava',
                  url: window.location.href,
                })}
                aria-label="Share profile"
              >
                <Share2 size={18} strokeWidth={1.75} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Segmented tabs */}
      <div style={{ display: 'flex', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6', marginTop: 18 }}>
        {PROFILE_TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '12px 8px', fontSize: 12, fontWeight: 600,
            color: tab === t.key ? '#111827' : '#9CA3AF',
            borderBottom: tab === t.key ? '2px solid #111827' : '2px solid transparent',
            marginBottom: -1,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {t.label}
            {t.key === 'letters' && displayed.letters_count != null && (
              <span style={{ color: '#9CA3AF', fontWeight: 500 }}>· {displayed.letters_count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'letters' && (
        <>
          {!letters && <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Loading letters…</div>}
          {letters && letters.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
              {self ? 'You haven’t written a letter yet.' : `${displayName} hasn’t written a letter yet.`}
            </div>
          )}
          {letters && letters.map((l) => (
            <ProfileLetterRow
              key={l.id}
              letter={l}
              canDelete={!!self}
              onOpen={() => onOpenLetter(l)}
              onDeleted={() => { triggerGlobalRefresh(); refetch(); }}
            />
          ))}
        </>
      )}

      {tab === 'about' && (
        <div style={{ padding: 20, fontFamily: 'Fraunces, Georgia, serif', fontSize: 15, lineHeight: 1.65, color: '#374151' }}>
          {displayed.bio || (self ? 'You haven’t added a bio yet.' : `${displayName} has not added a bio.`)}
        </div>
      )}
    </div>
  );
};

const Stat = ({ n, label }) => (
  <div>
    <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>{n}</div>
    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{label}</div>
  </div>
);

const ProfileSkeleton = () => (
  <div>
    <div style={{ height: 96, background: '#F3F4F6' }} />
    <div style={{ padding: '0 20px', marginTop: -36 }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#E5E7EB', border: '4px solid #fff' }} />
    </div>
    <div style={{ padding: '12px 20px' }}>
      <div style={{ width: 160, height: 18, background: '#F3F4F6', borderRadius: 6, marginBottom: 8 }} />
      <div style={{ width: 100, height: 10, background: '#F3F4F6', borderRadius: 4, marginBottom: 16 }} />
      <div style={{ width: '90%', height: 12, background: '#F3F4F6', borderRadius: 4, marginBottom: 6 }} />
      <div style={{ width: '70%', height: 12, background: '#F3F4F6', borderRadius: 4 }} />
    </div>
  </div>
);

function formatJoinDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  } catch { return null; }
}
