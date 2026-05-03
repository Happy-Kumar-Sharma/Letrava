import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Feather,
  Home,
  Compass,
  Bookmark,
  BookmarkCheck,
  Bell,
  User,
  Search,
  Share2,
  MoreHorizontal,
  Heart,
  Lightbulb,
  CircleDot,
  Cloud,
  Sun,
  Sparkles,
  MessageCircle,
  UserPlus,
  AtSign,
  ArrowLeft,
  X,
  Check,
  ChevronRight,
  FileText,
  LogOut,
} from 'lucide-react';
import { Avatar, Tag, Button, Logo } from './Shared.jsx';
import { Editor } from './Editor.jsx';
import { Profile } from './Profile.jsx';
import { useApi, getJSON, postJSON, delJSON, putJSON } from '../lib/api.js';

// ---------------------------------------------------------------------------
// Token shorthands
// ---------------------------------------------------------------------------
const C = {
  ink:    '#111827',
  ink2:   '#1F2937',
  mute:   '#6B7280',
  mute2:  '#9CA3AF',
  bg:     '#fff',
  bg2:    '#FAFAF7',
  bg3:    '#F3F2EE',
  bg4:    '#F8F7F2',
  line:   '#F3F4F6',
  line2:  '#E5E7EB',
  line3:  '#EDEAE2',
  indigo: '#6366F1',
  ind50:  '#EEF2FF',
  ind7:   '#4338CA',
  quill:  '#E07856',
  serif:  'Fraunces, Georgia, serif',
  sans:   'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  mono:   'JetBrains Mono, ui-monospace, monospace',
};

const iconBtnStyle = (size = 36) => ({
  width: size, height: size, borderRadius: '50%',
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: '#374151', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  position: 'relative', flexShrink: 0,
});

const REACTIONS_D = [
  { key: 'like',       label: 'Like',       Icon: Heart,     color: '#6366F1' },
  { key: 'thoughtful', label: 'Thoughtful', Icon: Lightbulb, color: '#8B5CF6' },
  { key: 'relatable',  label: 'Relatable',  Icon: CircleDot, color: '#14B8A6' },
  { key: 'sad',        label: 'Sad',        Icon: Cloud,     color: '#64748B' },
  { key: 'hopeful',    label: 'Hopeful',    Icon: Sun,       color: '#E07856' },
  { key: 'inspiring',  label: 'Inspiring',  Icon: Sparkles,  color: '#F59E0B' },
];

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { k: 'discover',       Icon: Compass,   label: 'Discover' },
  { k: 'home',           Icon: Home,      label: 'Home' },
  { k: 'saved',          Icon: Bookmark,  label: 'Saved' },
  { k: 'notifications',  Icon: Bell,      label: 'Notifications' },
  { k: 'profile',        Icon: User,      label: 'Profile' },
];

const DesktopSidebar = ({ route, onRoute, me, onSignOut, followedUsers }) => (
  <aside
    style={{
      width: 220,
      flexShrink: 0,
      background: C.bg2,
      borderRight: '1px solid ' + C.line,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      padding: '16px 12px',
      gap: 2,
    }}
  >
    <div style={{ marginBottom: 16, paddingLeft: 4 }}>
      <Logo size={22} />
    </div>

    <button
      onClick={() => onRoute('editor')}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', marginBottom: 12,
        background: C.ink, color: '#fff', border: 'none', borderRadius: 10,
        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: C.sans,
        boxShadow: '0 1px 2px rgba(17,24,39,0.08)',
      }}
    >
      <Feather size={16} strokeWidth={1.75} />
      Write a letter
    </button>

    {NAV_ITEMS.map(({ k, Icon, label }) => {
      const active = route === k;
      return (
        <button
          key={k}
          onClick={() => onRoute(k)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 8,
            fontSize: 13, fontWeight: 500, fontFamily: C.sans,
            color: active ? C.ink : '#374151',
            background: active ? '#fff' : 'transparent',
            border: '1px solid ' + (active ? C.line2 : 'transparent'),
            boxShadow: active ? '0 1px 2px rgba(17,24,39,0.04)' : 'none',
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <Icon size={16} strokeWidth={1.75} color={active ? C.indigo : C.mute} />
          <span style={{ flex: 1 }}>{label}</span>
        </button>
      );
    })}

    {followedUsers && followedUsers.length > 0 && (
      <>
        <div style={{ padding: '20px 12px 6px', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.mute2 }}>
          Following
        </div>
        {followedUsers.slice(0, 6).map((u) => {
          const name = u.username?.startsWith('@') ? u.username : `@${u.username}`;
          return (
            <button
              key={u.id}
              onClick={() => onRoute('profile', { authorId: u.id, authorName: name, authorPalette: u.palette })}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 12px', fontSize: 13, color: '#374151', fontFamily: C.sans,
                background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Avatar name={name} size={20} palette={u.palette} src={u.avatar} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            </button>
          );
        })}
      </>
    )}

    <div style={{ flex: 1 }} />

    {me && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: '#fff', border: '1px solid ' + C.line2, marginTop: 12 }}>
        <Avatar name={`@${me.username}`} size={28} palette={me.palette} src={me.avatar} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{me.username}</div>
        </div>
        <button
          onClick={onSignOut}
          style={{ ...iconBtnStyle(28), color: C.mute }}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={14} strokeWidth={1.75} />
        </button>
      </div>
    )}
  </aside>
);

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------
const DesktopHeader = ({ onCmdK, onCompose, me }) => (
  <header style={{ height: 56, background: '#fff', borderBottom: '1px solid ' + C.line, display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0, gap: 12 }}>
    <button
      onClick={onCmdK}
      style={{
        flex: 1, maxWidth: 480,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', background: '#F3F4F6', borderRadius: 10,
        color: C.mute2, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: C.sans,
      }}
    >
      <Search size={16} strokeWidth={1.75} />
      <span style={{ flex: 1, textAlign: 'left' }}>Search letters, writers, prompts…</span>
      <span style={{ fontFamily: C.mono, fontSize: 11, padding: '2px 6px', background: '#fff', border: '1px solid ' + C.line2, borderRadius: 4, color: C.mute }}>⌘K</span>
    </button>
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
      <Button variant="ghost" size="sm" icon={Feather} onClick={onCompose}>Write</Button>
      {me && <Avatar name={`@${me.username}`} size={32} palette={me.palette} src={me.avatar} />}
    </div>
  </header>
);

// ---------------------------------------------------------------------------
// Feed column (master list)
// ---------------------------------------------------------------------------
const FeedColumn = ({ activeId, onOpen, feed = 'trending', onFeedChange }) => {
  const { data: letters, loading } = useApi(`/api/letters?feed=${feed}`, [feed]);
  const items = letters || [];

  return (
    <section style={{ background: '#fff', borderRight: '1px solid ' + C.line, overflowY: 'auto', display: 'flex', flexDirection: 'column' }} className="ltv-desktop-col">
      <div style={{ position: 'sticky', top: 0, zIndex: 2, background: '#fff', borderBottom: '1px solid ' + C.line, padding: '14px 20px' }}>
        <h2 style={{ margin: '0 0 10px', fontFamily: C.serif, fontSize: 22, fontWeight: 500, color: C.ink }}>Discover</h2>
        <div style={{ display: 'flex', gap: 4 }}>
          {['trending', 'latest', 'following'].map((k) => (
            <button
              key={k}
              onClick={() => onFeedChange(k)}
              style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 7,
                color: feed === k ? C.ink : C.mute,
                background: feed === k ? '#F3F4F6' : 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: C.sans,
                textTransform: 'capitalize',
              }}
            >
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ padding: 24, color: C.mute2, fontSize: 13 }}>Loading…</div>}
      {items.map((l) => {
        const active = activeId === l.id;
        return (
          <button
            key={l.id}
            onClick={() => onOpen(l)}
            style={{
              all: 'unset', display: 'block', cursor: 'pointer',
              padding: '14px 20px',
              borderBottom: '1px solid ' + C.line,
              background: active ? C.ind50 : '#fff',
              borderLeft: '3px solid ' + (active ? C.indigo : 'transparent'),
              transition: 'background 160ms',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11, color: C.mute }}>
              <Avatar name={l.author.name} size={18} palette={l.author.palette} src={l.author.avatar} />
              <span style={{ fontWeight: 600, color: C.ink }}>{l.author.name}</span>
              <span>·</span><span>{l.age}</span>
              <span>·</span><span>{l.read_time}</span>
            </div>
            <div style={{ fontFamily: C.serif, fontSize: 17, fontWeight: 500, color: C.ink, lineHeight: 1.25, marginBottom: 6 }}>{l.title}</div>
            <div style={{ fontFamily: C.serif, fontSize: 13, lineHeight: 1.55, color: C.mute, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 8 }}>{l.excerpt}</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: C.mute2 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Heart size={11} strokeWidth={1.75} />{l.reactions}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><MessageCircle size={11} strokeWidth={1.75} />{l.comments}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: l.saved ? C.indigo : C.mute2 }}>
                {l.saved ? <BookmarkCheck size={11} strokeWidth={1.75} /> : <Bookmark size={11} strokeWidth={1.75} />}
                {l.saves}
              </span>
            </div>
          </button>
        );
      })}
    </section>
  );
};

// ---------------------------------------------------------------------------
// Reader pane (inspector)
// ---------------------------------------------------------------------------
const ReaderPane = ({ letter, onOpenProfile }) => {
  const [reaction, setReaction] = useState(letter?.my_reaction || null);
  const [saved, setSaved] = useState(!!letter?.saved);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data: fresh, refetch } = useApi(
    letter ? `/api/letters/${letter.id}` : null,
    [letter?.id]
  );
  const { data: commentsRaw, refetch: refetchComments } = useApi(
    letter ? `/api/letters/${letter.id}/comments` : null,
    [letter?.id]
  );
  const comments = commentsRaw || [];
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const full = fresh || letter;

  useEffect(() => {
    if (!fresh) return;
    setReaction(fresh.my_reaction || null);
    setSaved(!!fresh.saved);
  }, [fresh]);

  useEffect(() => {
    setDraft('');
  }, [letter?.id]);

  const onReact = async (key) => {
    if (busy) return;
    setBusy(true);
    const prev = reaction;
    const next = reaction === key ? null : key;
    setReaction(next);
    try {
      await putJSON(`/api/letters/${full.id}/reactions`, { kind: next });
      refetch();
    } catch { setReaction(prev); } finally { setBusy(false); }
  };

  const onToggleSave = async () => {
    if (busy) return;
    setBusy(true);
    const was = saved;
    setSaved(!was);
    try {
      if (was) await delJSON(`/api/letters/${full.id}/save`);
      else      await postJSON(`/api/letters/${full.id}/save`, {});
      refetch();
    } catch { setSaved(was); } finally { setBusy(false); }
  };

  const postComment = async () => {
    if (!draft.trim() || posting) return;
    setPosting(true);
    try {
      await postJSON(`/api/letters/${full.id}/comments`, { body: draft.trim() });
      setDraft('');
      refetchComments();
    } catch { /* ignore */ } finally { setPosting(false); }
  };

  if (!letter) {
    return (
      <main style={{ background: C.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center', padding: 40 }}>
        <svg width="80" height="80" viewBox="0 0 64 64" style={{ opacity: 0.15, marginBottom: 16 }} aria-hidden="true">
          <path d="M 14 8 L 14 52 L 44 52" stroke={C.ink} strokeWidth="8" fill="none" strokeLinecap="square" />
          <path d="M 38 10 C 52 16, 56 30, 48 48 C 44 42, 38 38, 32 36 C 36 28, 38 20, 38 10 Z" fill={C.quill} />
        </svg>
        <div style={{ fontFamily: C.serif, fontSize: 20, color: C.ink, marginBottom: 6 }}>Select a letter to read</div>
        <div style={{ fontSize: 13, color: C.mute, maxWidth: 320, lineHeight: 1.5 }}>
          Letters open here in the reader pane. Press{' '}
          <kbd style={{ fontFamily: C.mono, fontSize: 11, padding: '2px 6px', background: '#fff', border: '1px solid ' + C.line2, borderRadius: 4 }}>⌘K</kbd>{' '}
          to search and jump.
        </div>
      </main>
    );
  }

  const paragraphs = (full?.body || '').split('\n\n');
  const [firstP, ...restP] = paragraphs;
  const firstChar = (firstP || '').charAt(0);
  const firstRest = (firstP || '').slice(1);

  return (
    <main style={{ background: '#fff', overflowY: 'auto', position: 'relative' }} className="ltv-desktop-col">
      <div style={{ maxWidth: 660, margin: '0 auto', padding: '40px 56px 80px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#B85E3E', marginBottom: 14 }}>
          A letter to the future
        </div>

        <h1 style={{ fontFamily: C.serif, fontSize: 38, fontWeight: 500, lineHeight: 1.05, letterSpacing: '-0.025em', margin: '0 0 20px', color: C.ink }}>
          {full.title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, paddingBottom: 22, borderBottom: '1px solid ' + C.line }}>
          <span
            onClick={() => onOpenProfile && onOpenProfile(full.author)}
            style={{ cursor: onOpenProfile ? 'pointer' : 'default' }}
          >
            <Avatar name={full.author.name} size={40} palette={full.author.palette} src={full.author.avatar} />
          </span>
          <div style={{ flex: 1 }}>
            <div
              onClick={() => onOpenProfile && onOpenProfile(full.author)}
              style={{ fontSize: 13, fontWeight: 600, color: C.ink, cursor: onOpenProfile ? 'pointer' : 'default' }}
            >
              {full.author.name}
            </div>
            <div style={{ fontSize: 11, color: C.mute2 }}>
              {full.age} ago · {full.read_time} read{typeof full.reactions === 'number' && ` · ${full.reactions} reactions`}
            </div>
          </div>
          <Button variant={following ? 'pillSec' : 'pill'} size="sm" onClick={() => setFollowing(!following)}>
            {following ? 'Following' : 'Follow'}
          </Button>
          <button style={iconBtnStyle(32)} onClick={onToggleSave} aria-label={saved ? 'Saved' : 'Save'} disabled={busy}>
            {saved ? <BookmarkCheck size={16} color={C.indigo} strokeWidth={1.75} /> : <Bookmark size={16} strokeWidth={1.75} />}
          </button>
          <button style={iconBtnStyle(32)} aria-label="Share"><Share2 size={16} strokeWidth={1.75} /></button>
          <button style={iconBtnStyle(32)} aria-label="More"><MoreHorizontal size={16} strokeWidth={1.75} /></button>
        </div>

        <article style={{ fontFamily: C.serif, fontSize: 19, lineHeight: 1.75, color: C.ink2, marginBottom: 24 }}>
          {firstP && (
            <p style={{ margin: '0 0 22px' }}>
              <span style={{ fontFamily: C.serif, fontSize: 64, lineHeight: 0.8, float: 'left', color: C.quill, marginRight: 10, marginTop: 8, fontWeight: 500 }}>
                {firstChar}
              </span>
              {firstRest}
            </p>
          )}
          {restP.map((p, i) => <p key={i} style={{ margin: '0 0 22px' }}>{p}</p>)}
        </article>

        {full.tags && full.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 32 }}>
            {full.tags.map((t) => <Tag key={t}>#{t}</Tag>)}
          </div>
        )}

        {/* Reactions */}
        <div style={{ padding: 20, background: C.bg2, border: '1px solid ' + C.line, borderRadius: 14, marginBottom: 28 }}>
          <div style={{ fontSize: 12, color: C.mute, marginBottom: 12 }}>How did this letter sit with you?</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {REACTIONS_D.map((r) => {
              const active = reaction === r.key;
              return (
                <button
                  key={r.key}
                  onClick={() => onReact(r.key)}
                  disabled={busy}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 12px', borderRadius: 999,
                    border: '1px solid ' + (active ? r.color : C.line2),
                    background: active ? r.color + '14' : '#fff',
                    color: active ? r.color : '#374151',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: C.sans,
                    transition: 'all 200ms cubic-bezier(0.2,0.7,0.2,1)',
                  }}
                >
                  <r.Icon size={14} strokeWidth={1.75} color={active ? r.color : C.mute} />
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comments */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 14 }}>
            Comments · {comments.length}
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            <div style={{ flex: 1, padding: 12, border: '1px solid ' + C.line2, borderRadius: 12, background: '#fff' }}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Leave a thought…"
                rows={2}
                style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontFamily: C.serif, fontSize: 14, lineHeight: 1.55, color: C.ink, background: 'transparent', boxSizing: 'border-box' }}
              />
              {draft.trim() && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                  <Button variant="primary" size="sm" onClick={postComment} disabled={posting}>
                    {posting ? 'Posting…' : 'Post'}
                  </Button>
                </div>
              )}
            </div>
          </div>
          {comments.map((c) => (
            <div key={c.id} style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
              <Avatar name={c.author?.name} size={32} palette={c.author?.palette} src={c.author?.avatar} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 2 }}>
                  {c.author?.name} <span style={{ color: C.mute2, fontWeight: 400 }}>· {c.age} ago</span>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: '#374151', fontFamily: C.serif }}>{c.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

// ---------------------------------------------------------------------------
// Notifications pane (full-width in desktop)
// ---------------------------------------------------------------------------
const KIND_ICON_D = { reaction: Heart, comment: MessageCircle, follow: UserPlus, mention: AtSign };
const KIND_TINT_D = {
  reaction: { bg: '#FBE5DA', fg: '#B85E3E' },
  comment:  { bg: '#E0F2EF', fg: '#0F766E' },
  follow:   { bg: '#EEF2FF', fg: '#4338CA' },
  mention:  { bg: '#F1ECFF', fg: '#6B21A8' },
};

const NotificationsPane = () => {
  const { data } = useApi('/api/notifications');
  const notifs = data || [];
  const [tab, setTab] = useState('all');

  const filtered = notifs.filter((n) => {
    if (tab === 'mentions') return n.kind === 'mention';
    if (tab === 'follows')  return n.kind === 'follow';
    if (tab === 'comments') return n.kind === 'comment';
    return true;
  });

  const today   = filtered.filter((n) => n.unread);
  const earlier = filtered.filter((n) => !n.unread);

  return (
    <section style={{ background: '#fff', overflowY: 'auto' }} className="ltv-desktop-col">
      <div style={{ position: 'sticky', top: 0, zIndex: 2, background: '#fff', borderBottom: '1px solid ' + C.line, padding: '16px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontFamily: C.serif, fontSize: 26, fontWeight: 500 }}>Notifications</h2>
          <button style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: C.mute, fontFamily: C.sans }}>
            Mark all read
          </button>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
          {[['all','All'], ['mentions','Mentions'], ['follows','Follows'], ['comments','Comments']].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 7,
                color: tab === k ? C.ink : C.mute,
                background: tab === k ? '#F3F4F6' : 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: C.sans,
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {today.length > 0 && (
        <>
          <DSectionLabel>Today</DSectionLabel>
          {today.map((n) => <DNotifRow key={n.id} n={n} unread />)}
        </>
      )}
      {earlier.length > 0 && (
        <>
          <DSectionLabel>Earlier</DSectionLabel>
          {earlier.map((n) => <DNotifRow key={n.id} n={n} />)}
        </>
      )}
      {filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: C.mute2, fontSize: 13 }}>Nothing here yet.</div>
      )}
    </section>
  );
};

const DNotifRow = ({ n, unread }) => {
  const tint = KIND_TINT_D[n.kind] || KIND_TINT_D.mention;
  const Icon = KIND_ICON_D[n.kind] || AtSign;
  const name = n.actor?.username?.startsWith('@') ? n.actor.username : `@${n.actor?.username}`;
  return (
    <div style={{ display: 'flex', gap: 14, padding: '14px 28px', borderBottom: '1px solid ' + C.line, background: unread ? '#FAFAFC' : '#fff', position: 'relative', cursor: 'pointer', alignItems: 'flex-start' }}>
      {unread && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 6, height: 6, borderRadius: '50%', background: C.indigo }} />}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar name={name} size={40} palette={n.actor?.palette || 'indigo'} src={n.actor?.avatar} />
        <span style={{ position: 'absolute', right: -4, bottom: -4, width: 20, height: 20, borderRadius: '50%', background: tint.bg, color: tint.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
          <Icon size={11} strokeWidth={2} />
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.45 }}>
          <strong style={{ color: C.ink }}>{name}</strong> {n.what}
          {n.letter_title && <> · <span style={{ color: C.mute, fontStyle: 'italic' }}>{n.letter_title.length > 50 ? n.letter_title.slice(0, 50) + '…' : n.letter_title}</span></>}
        </div>
        <div style={{ fontSize: 11, color: C.mute2, marginTop: 2 }}>{n.age} ago</div>
      </div>
      {n.kind === 'follow' && <Button variant="pillSec" size="sm">Follow back</Button>}
    </div>
  );
};

const DSectionLabel = ({ children }) => (
  <div style={{ padding: '12px 28px 8px', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.mute2 }}>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Command palette (⌘K)
// ---------------------------------------------------------------------------
const CommandPalette = ({ onClose, onOpenLetter }) => {
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [letters, setLetters] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const t = setTimeout(() => setDq(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!dq.trim()) { setLetters([]); setUsers([]); return; }
    setLoading(true);
    Promise.all([
      getJSON(`/api/search/letters?q=${encodeURIComponent(dq)}`),
      getJSON(`/api/search/users?q=${encodeURIComponent(dq)}`),
    ]).then(([l, u]) => { setLetters(l || []); setUsers(u || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dq]);

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const ACTIONS = [
    { icon: Feather,   label: 'Write a new letter', shortcut: '⌘N' },
    { icon: Bookmark,  label: 'Show my saved',       shortcut: '⌘S' },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 120, zIndex: 60 }}
      onClick={onClose}
    >
      <div
        style={{ width: 580, background: '#fff', borderRadius: 14, boxShadow: '0 30px 80px rgba(0,0,0,0.30)', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid ' + C.line }}>
          <Search size={18} strokeWidth={1.75} color={C.mute} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search letters, writers, prompts…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, fontFamily: C.sans, color: C.ink }}
          />
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: C.mute }}>
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div style={{ padding: '8px 0', maxHeight: 440, overflowY: 'auto' }}>
          {loading && <div style={{ padding: '12px 16px', color: C.mute2, fontSize: 13 }}>Searching…</div>}

          {letters.length > 0 && (
            <>
              <PaletteSection>Letters</PaletteSection>
              {letters.slice(0, 5).map((l, i) => (
                <div
                  key={l.id}
                  onClick={() => { onOpenLetter(l); onClose(); }}
                  style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: i === 0 && !q ? C.ind50 : '#fff' }}
                >
                  <FileText size={16} strokeWidth={1.75} color={C.mute} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div>
                    <div style={{ fontSize: 11, color: C.mute }}>{l.author.name} · {l.read_time}</div>
                  </div>
                </div>
              ))}
            </>
          )}

          {users.length > 0 && (
            <>
              <PaletteSection>Writers</PaletteSection>
              {users.slice(0, 3).map((u) => {
                const name = u.username?.startsWith('@') ? u.username : `@${u.username}`;
                return (
                  <div key={u.id} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <Avatar name={name} size={20} palette={u.palette} src={u.avatar} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{name}</div>
                      <div style={{ fontSize: 11, color: C.mute }}>{u.followers_count} followers</div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {!dq.trim() && (
            <>
              <PaletteSection>Actions</PaletteSection>
              {ACTIONS.map(({ icon: Icon, label, shortcut }) => (
                <div key={label} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, color: '#374151', cursor: 'pointer' }}>
                  <Icon size={16} strokeWidth={1.75} color={C.mute} />
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500, fontFamily: C.sans }}>{label}</div>
                  <span style={{ fontFamily: C.mono, fontSize: 10, padding: '2px 5px', background: '#F3F4F6', borderRadius: 3, color: C.mute }}>{shortcut}</span>
                </div>
              ))}
            </>
          )}

          {dq.trim() && !loading && letters.length === 0 && users.length === 0 && (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: C.mute2, fontSize: 13 }}>
              No results for "{dq}"
            </div>
          )}
        </div>

        <div style={{ padding: '10px 16px', borderTop: '1px solid ' + C.line, background: C.bg2, fontSize: 11, color: C.mute, display: 'flex', gap: 16 }}>
          <span><kbd style={{ fontFamily: C.mono }}>↵</kbd> open</span>
          <span><kbd style={{ fontFamily: C.mono }}>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
};

const PaletteSection = ({ children }) => (
  <div style={{ padding: '8px 16px', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.mute2 }}>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Desktop editor modal (wraps the existing Editor component)
// ---------------------------------------------------------------------------
const DesktopEditorModal = ({ onClose, onSubmit, initialPrompt }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 40 }}>
    <div style={{ width: '100%', maxWidth: 880, height: '100%', maxHeight: 720, borderRadius: 16, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.30)', position: 'relative' }}>
      <Editor onClose={onClose} onSubmit={onSubmit} initialPrompt={initialPrompt} />
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main DesktopShell export
// ---------------------------------------------------------------------------
export const DesktopShell = ({ me, onSignOut }) => {
  const [route, setRoute] = useState('discover');
  const [activeLetter, setActiveLetter] = useState(null);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [feedTab, setFeedTab] = useState('trending');
  const [profileTarget, setProfileTarget] = useState(null);

  // ⌘K keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdkOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleRoute = (r, meta = {}) => {
    if (r === 'editor') { setEditorOpen(true); return; }
    if (r === 'profile' && meta.authorId) setProfileTarget(meta);
    setRoute(r);
    setActiveLetter(null);
  };

  const fullPane = ['notifications', 'profile'].includes(route);
  const gridCols = fullPane ? '220px 1fr' : '220px 380px 1fr';

  const { data: followedUsers } = useApi(me ? `/api/search/users` : null);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: C.bg4, fontFamily: C.sans, color: C.ink, overflow: 'hidden' }}>
      <DesktopHeader onCmdK={() => setCmdkOpen(true)} onCompose={() => setEditorOpen(true)} me={me} />

      <div style={{ display: 'grid', gridTemplateColumns: gridCols, flex: 1, overflow: 'hidden' }}>
        <DesktopSidebar
          route={route}
          onRoute={handleRoute}
          me={me}
          onSignOut={onSignOut}
          followedUsers={followedUsers || []}
        />

        {(route === 'discover' || route === 'home' || route === 'saved') && (
          <>
            <FeedColumn
              activeId={activeLetter?.id}
              onOpen={setActiveLetter}
              feed={feedTab}
              onFeedChange={setFeedTab}
            />
            <ReaderPane letter={activeLetter} />
          </>
        )}

        {route === 'notifications' && <NotificationsPane />}

        {route === 'profile' && (
          <div style={{ background: '#fff', overflowY: 'auto' }} className="ltv-desktop-col">
            <Profile
              author={profileTarget
                ? { id: profileTarget.authorId, name: profileTarget.authorName, palette: profileTarget.authorPalette }
                : { id: me?.id, name: `@${me?.username}`, palette: me?.palette }
              }
              self={!profileTarget}
              onOpenLetter={(l) => { setActiveLetter(l); setRoute('discover'); }}
              onBack={profileTarget ? () => { setProfileTarget(null); setRoute('discover'); } : undefined}
            />
          </div>
        )}
      </div>

      {editorOpen && (
        <DesktopEditorModal
          onClose={() => setEditorOpen(false)}
          onSubmit={() => { setEditorOpen(false); setRoute('discover'); }}
        />
      )}

      {cmdkOpen && (
        <CommandPalette
          onClose={() => setCmdkOpen(false)}
          onOpenLetter={(l) => { setActiveLetter(l); setRoute('discover'); }}
        />
      )}
    </div>
  );
};
