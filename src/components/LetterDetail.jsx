import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Heart,
  Lightbulb,
  CircleDot,
  Cloud,
  Sun,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Share2,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { Avatar, Tag, Button, iconBtnSm, BodyRenderer } from './Shared.jsx';
import { CommentsSection } from './CommentsSection.jsx';
import { useApi, putJSON, postJSON, delJSON } from '../lib/api.js';
import { useShare } from '../hooks/useShare.js';

const REACTION_ICONS = { Heart, Lightbulb, CircleDot, Cloud, Sun, Sparkles };

const REACTIONS = [
  { key: 'like',       label: 'Like',       icon: 'Heart',     color: '#6366F1' },
  { key: 'thoughtful', label: 'Thoughtful', icon: 'Lightbulb', color: '#8B5CF6' },
  { key: 'relatable',  label: 'Relatable',  icon: 'CircleDot', color: '#14B8A6' },
  { key: 'sad',        label: 'Sad',        icon: 'Cloud',     color: '#64748B' },
  { key: 'hopeful',    label: 'Hopeful',    icon: 'Sun',       color: '#E07856' },
  { key: 'inspiring',  label: 'Inspiring',  icon: 'Sparkles',  color: '#F59E0B' },
];


export const LetterDetail = ({ letter: seedLetter, onBack, onOpenProfile, me, onDeleted, onEdit, publicView = false, onSignIn }) => {
  const share = useShare();
  const { data: fresh, refetch } = useApi(`/api/letters/${seedLetter.id}`, [seedLetter.id]);
  const letter = fresh || seedLetter;

  const [reaction, setReaction]     = useState(letter.my_reaction || null);
  const [saved, setSaved]           = useState(!!letter.saved);
  const [following, setFollowing]   = useState(false);
  const [busy, setBusy]             = useState(false);
  const [showMenu, setShowMenu]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const isAuthor = !publicView && me && letter.author && String(me.id) === String(letter.author.id);

  // Reading progress (0..1) — drives the thin bar at the top of the screen.
  const scrollRef = useRef(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    // The scroll container is .ltv-screen — find it from this element.
    const root = scrollRef.current;
    if (!root) return;
    let scroller = root.parentElement;
    while (scroller && !scroller.classList?.contains('ltv-screen')) {
      scroller = scroller.parentElement;
    }
    if (!scroller) return;
    const onScroll = () => {
      const max = scroller.scrollHeight - scroller.clientHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / max)) : 0);
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [letter.id]);

  useEffect(() => {
    if (!fresh) return;
    setReaction(fresh.my_reaction || null);
    setSaved(!!fresh.saved);
  }, [fresh]);

  const onReact = async (key) => {
    if (publicView) { onSignIn?.('signup'); return; }
    if (busy) return;
    setBusy(true);
    const prev = reaction;
    const next = reaction === key ? null : key;
    setReaction(next);
    try {
      await putJSON(`/api/letters/${letter.id}/reactions`, { kind: next });
      refetch();
    } catch (err) {
      console.error('reaction failed', err);
      setReaction(prev);
    } finally {
      setBusy(false);
    }
  };

  const onToggleSave = async () => {
    if (busy) return;
    setBusy(true);
    const wasSaved = saved;
    setSaved(!wasSaved);
    try {
      if (wasSaved) await delJSON(`/api/letters/${letter.id}/save`);
      else          await postJSON(`/api/letters/${letter.id}/save`, {});
      refetch();
    } catch (err) {
      console.error('save failed', err);
      setSaved(wasSaved);
    } finally {
      setBusy(false);
    }
  };

  const onToggleFollow = async () => {
    if (busy || !letter.author?.id) return;
    setBusy(true);
    try {
      if (following) await delJSON(`/api/users/${letter.author.id}/follow`);
      else           await postJSON(`/api/users/${letter.author.id}/follow`, {});
      setFollowing(!following);
    } catch (err) {
      console.error('follow failed', err);
    } finally {
      setBusy(false);
    }
  };

  // Reaction tally (optional — only renders if backend provides
  // letter.reaction_breakdown as { [kind]: count }).
  const breakdown = letter.reaction_breakdown;


  return (
    <div ref={scrollRef}>
      {/* Custom header with reading-progress bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
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
            padding: '0 8px 0 4px',
          }}
        >
          {onBack && (
            <button onClick={onBack} style={iconBtnSm} aria-label="Back">
              <ArrowLeft size={20} strokeWidth={1.75} />
            </button>
          )}
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#111827',
              marginLeft: onBack ? 0 : 12,
            }}
          >
            Letter
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
            <button
              style={iconBtnSm}
              onClick={onToggleSave}
              aria-label={saved ? 'Saved' : 'Save'}
              disabled={busy}
            >
              {saved ? (
                <BookmarkCheck size={20} color="#6366F1" strokeWidth={1.75} />
              ) : (
                <Bookmark size={20} color="#374151" strokeWidth={1.75} />
              )}
            </button>
            <button
              style={iconBtnSm}
              aria-label="Share"
              onClick={() => share({ title: letter.title, text: letter.excerpt, url: `${window.location.origin}/letter/${letter.id}` })}
            >
              <Share2 size={20} strokeWidth={1.75} />
            </button>
            {isAuthor && (
              <div style={{ position: 'relative' }}>
                <button style={iconBtnSm} aria-label="More options" onClick={() => { setShowMenu(!showMenu); setConfirmDel(false); }}>
                  <MoreHorizontal size={20} strokeWidth={1.75} />
                </button>
                {showMenu && (
                  <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 20, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 4px 16px rgba(17,24,39,0.10)', minWidth: 160, overflow: 'hidden' }}>
                    {/* Edit */}
                    <button
                      onClick={() => { setShowMenu(false); onEdit?.(letter); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: '#374151', fontFamily: 'inherit', textAlign: 'left' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit letter
                    </button>
                    <div style={{ height: 1, background: '#F3F4F6' }} />
                    {/* Delete */}
                    {!confirmDel ? (
                      <button onClick={() => setConfirmDel(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: '#EF4444', fontFamily: 'inherit', textAlign: 'left' }}>
                        <Trash2 size={14} strokeWidth={1.75} /> Delete letter
                      </button>
                    ) : (
                      <div style={{ padding: '10px 14px' }}>
                        <div style={{ fontSize: 12, color: '#374151', marginBottom: 8 }}>Delete this letter?</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={async () => { try { await delJSON(`/api/letters/${letter.id}`); onDeleted?.(); onBack?.(); } catch { /* ignore */ } }} style={{ flex: 1, padding: '6px 0', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                          <button onClick={() => { setConfirmDel(false); setShowMenu(false); }} style={{ flex: 1, padding: '6px 0', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {!isAuthor && (
              <button style={iconBtnSm} aria-label="More">
                <MoreHorizontal size={20} strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>
        <div style={{ height: 2, background: '#F3F4F6' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.round(progress * 100)}%`,
              background: '#6366F1',
              transition: 'width 80ms linear',
            }}
          />
        </div>
      </header>

      {/* Eyebrow */}
      <div
        style={{
          padding: '20px 24px 0',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#B85E3E',
          marginBottom: 10,
        }}
      >
        A letter to the future
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontSize: 30,
          fontWeight: 500,
          lineHeight: 1.08,
          letterSpacing: '-0.02em',
          color: '#111827',
          margin: '0 24px 18px',
          textWrap: 'pretty',
        }}
      >
        {letter.title}
      </h1>

      {/* Author bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 24px 22px',
          borderBottom: '1px solid #F3F4F6',
          marginBottom: 20,
        }}
      >
        <span onClick={() => onOpenProfile(letter.author)} style={{ cursor: 'pointer' }}>
          <Avatar name={letter.author.name} size={36} palette={letter.author.palette} src={letter.author.avatar} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            onClick={() => onOpenProfile(letter.author)}
            style={{ fontSize: 13, fontWeight: 600, color: '#111827', cursor: 'pointer' }}
          >
            {letter.author.name}
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>
            {letter.age} ago · {letter.read_time} read
            {typeof letter.reactions === 'number' && ` · ${letter.reactions} reactions`}
          </div>
        </div>
        {!publicView && (
          <Button
            variant={following ? 'pillSec' : 'pill'}
            size="sm"
            onClick={onToggleFollow}
            disabled={busy}
          >
            {following ? 'Following' : 'Follow'}
          </Button>
        )}
        {publicView && (
          <Button variant="pill" size="sm" onClick={() => onSignIn?.('signup')}>
            Follow
          </Button>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '0 24px 28px' }}>
        <article style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 17, lineHeight: 1.75, color: '#1F2937' }}>
          <BodyRenderer body={letter.body} />
        </article>
        {letter.tags && letter.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 22 }}>
            {letter.tags.map((t) => (
              <Tag key={t}>#{t}</Tag>
            ))}
          </div>
        )}
      </div>

      {/* Reactions block */}
      <div
        style={{
          borderTop: '1px solid #F3F4F6',
          borderBottom: '1px solid #F3F4F6',
          padding: '18px 20px',
          background: '#FAFAF7',
        }}
      >
        <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 10, letterSpacing: '0.04em' }}>
          How did this letter sit with you?
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {REACTIONS.map((r) => {
            const RxIcon = REACTION_ICONS[r.icon];
            const active = reaction === r.key;
            return (
              <button
                key={r.key}
                onClick={() => onReact(r.key)}
                disabled={busy}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  borderRadius: 999,
                  border: '1px solid ' + (active ? r.color : '#E5E7EB'),
                  background: active ? r.color + '14' : '#fff',
                  color: active ? r.color : '#374151',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 200ms cubic-bezier(0.2,0.7,0.2,1)',
                  transform: active ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <RxIcon size={14} color={active ? r.color : '#6B7280'} strokeWidth={1.75} />
                {r.label}
              </button>
            );
          })}
        </div>
        {breakdown && Object.keys(breakdown).length > 0 && (
          <ReactionBar breakdown={breakdown} total={letter.reactions || 0} />
        )}
      </div>

      {publicView ? (
        <PublicViewCTA onSignIn={onSignIn} />
      ) : (
        <CommentsSection letterId={letter.id} me={me} onOpenProfile={onOpenProfile} />
      )}
    </div>
  );
};

// ---- Public view CTA (replaces comments for unauthenticated visitors) -------
const PublicViewCTA = ({ onSignIn }) => (
  <div
    style={{
      margin: '0 24px 32px',
      padding: '28px 24px',
      borderRadius: 16,
      background: 'linear-gradient(180deg, #FFF7F2 0%, #FFFBF7 100%)',
      border: '1px solid #F5C9B6',
      textAlign: 'center',
    }}
  >
    <div
      style={{
        fontFamily: 'Fraunces, Georgia, serif',
        fontSize: 20,
        fontWeight: 500,
        color: '#111827',
        marginBottom: 8,
        lineHeight: 1.2,
      }}
    >
      Join the conversation
    </div>
    <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px', lineHeight: 1.55 }}>
      Register or sign in to read comments, react, and write your own letters.
    </p>
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      <Button variant="primary" size="sm" onClick={() => onSignIn?.('signup')}>
        Create account
      </Button>
      <Button variant="secondary" size="sm" onClick={() => onSignIn?.('login')}>
        Sign in
      </Button>
    </div>
  </div>
);

// ---- Reaction distribution bar ----------------------------------------------
const ReactionBar = ({ breakdown, total }) => {
  const entries = REACTIONS
    .map(r => ({ ...r, count: breakdown[r.key] || 0 }))
    .filter(e => e.count > 0);
  const sum = entries.reduce((n, e) => n + e.count, 0) || 1;
  const top = [...entries].sort((a, b) => b.count - a.count).slice(0, 3);
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: '#F3F4F6' }}>
        {entries.map(e => (
          <div key={e.key} style={{ width: `${(e.count / sum) * 100}%`, background: e.color }} />
        ))}
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: '#9CA3AF' }}>
        {total} readers
        {top.map(e => ` · ${e.count} ${e.label.toLowerCase()}`).join('')}
      </div>
    </div>
  );
};

