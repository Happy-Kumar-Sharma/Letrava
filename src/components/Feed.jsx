import React, { useState } from 'react';
import {
  Feather,
  Heart,
  MessageCircle,
  Bookmark,
  BookmarkCheck,
  Share2,
  MoreHorizontal,
} from 'lucide-react';
import { Avatar, Tag, Button } from './Shared.jsx';
import { useApi, putJSON, delJSON, postJSON } from '../lib/api.js';

const TABS = [
  { key: 'trending', label: 'Trending' },
  { key: 'latest', label: 'Latest' },
  { key: 'following', label: 'Following' },
];

export const Feed = ({ onOpenLetter, onOpenProfile, onWrite }) => {
  const [mode, setMode] = useState('trending');
  const { data: letters, loading, error, refetch } = useApi(`/api/letters?feed=${mode}`, [mode]);
  const { data: prompt } = useApi('/api/prompts/current');

  return (
    <div>
      {/* Sticky tabs */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 4,
          background: '#fff',
          display: 'flex',
          borderBottom: '1px solid #F3F4F6',
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setMode(t.key)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '14px 8px',
              fontSize: 14,
              fontWeight: 600,
              color: mode === t.key ? '#111827' : '#9CA3AF',
              borderBottom: mode === t.key ? '2px solid #6366F1' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Prompt of the week */}
      {prompt && (
        <div style={{ padding: 16 }}>
          <div style={{ padding: 16, borderRadius: 14, background: '#FFF7F2', border: '1px solid #F5C9B6' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B85E3E', marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Feather size={12} strokeWidth={1.75} />
              Prompt of the week
            </div>
            <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 18, fontWeight: 500, color: '#111827', lineHeight: 1.3, marginBottom: 12 }}>
              {prompt.prompt}
            </div>
            <Button variant="secondary" size="sm" icon={Feather} onClick={() => onWrite?.(prompt.prompt)}>
              Write a response
            </Button>
          </div>
        </div>
      )}

      {/* Letters */}
      {loading && <Empty text="Loading letters…" />}
      {error && (
        <Empty
          text={`Could not load feed. ${error?.message || ''}`}
          actionLabel="Try again"
          onAction={refetch}
        />
      )}
      {!loading && !error && letters && letters.length === 0 && (
        <Empty text="No latest feed yet" />
      )}
      {!loading && !error && letters && letters.map((l) => (
        <FeedLetter
          key={l.id}
          letter={l}
          onChanged={refetch}
          onOpen={() => onOpenLetter(l)}
          onOpenProfile={() => onOpenProfile(l.author)}
        />
      ))}
    </div>
  );
};

const FeedLetter = ({ letter, onChanged, onOpen, onOpenProfile }) => {
  // Optimistic local state on top of server-truth values.
  const [saved, setSaved]       = useState(!!letter.saved);
  const [saveCount, setSaveCt]  = useState(letter.saves);
  const [busy, setBusy]         = useState(false);

  const toggleBookmark = async (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const wasSaved = saved;
    setSaved(!wasSaved);
    setSaveCt((n) => n + (wasSaved ? -1 : 1));
    try {
      if (wasSaved) {
        await delJSON(`/api/letters/${letter.id}/save`);
      } else {
        await postJSON(`/api/letters/${letter.id}/save`, {});
      }
      onChanged?.();
    } catch (err) {
      // revert
      setSaved(wasSaved);
      setSaveCt((n) => n + (wasSaved ? 1 : -1));
      console.error('save toggle failed', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      onClick={onOpen}
      style={{ padding: 16, borderBottom: '1px solid #F3F4F6', cursor: 'pointer', background: '#fff' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span
          onClick={(e) => {
            e.stopPropagation();
            onOpenProfile();
          }}
          style={{ cursor: 'pointer' }}
        >
          <Avatar name={letter.author.name} size={32} palette={letter.author.palette} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onOpenProfile();
            }}
            style={{ fontSize: 13, fontWeight: 600, color: '#111827', cursor: 'pointer' }}
          >
            {letter.author.name}
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>
            {letter.age} ago · {letter.read_time} read
          </div>
        </div>
        <button
          onClick={(e) => e.stopPropagation()}
          aria-label="More"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#9CA3AF' }}
        >
          <MoreHorizontal size={18} strokeWidth={1.75} />
        </button>
      </div>
      <h3
        style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontSize: 20,
          fontWeight: 500,
          lineHeight: 1.2,
          letterSpacing: '-0.005em',
          color: '#111827',
          margin: '0 0 8px',
        }}
      >
        {letter.title}
      </h3>
      <p
        style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontSize: 15,
          lineHeight: 1.55,
          color: '#4B5563',
          margin: '0 0 12px',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {letter.excerpt}
      </p>
      {letter.tags && letter.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {letter.tags.slice(0, 3).map((t) => (
            <Tag key={t}>#{t}</Tag>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', color: '#6B7280', fontSize: 13 }}>
        <button onClick={(e) => e.stopPropagation()} style={actionBtn} aria-label="React">
          <Heart size={18} strokeWidth={1.75} color={letter.my_reaction ? '#6366F1' : '#6B7280'} />
          <span>{letter.reactions}</span>
        </button>
        <button onClick={(e) => e.stopPropagation()} style={actionBtn} aria-label="Comments">
          <MessageCircle size={18} strokeWidth={1.75} />
          <span>{letter.comments}</span>
        </button>
        <button
          onClick={toggleBookmark}
          style={{ ...actionBtn, color: saved ? '#6366F1' : '#6B7280' }}
          aria-label={saved ? 'Saved' : 'Save'}
          disabled={busy}
        >
          {saved ? <BookmarkCheck size={18} strokeWidth={1.75} /> : <Bookmark size={18} strokeWidth={1.75} />}
          <span>{saveCount}</span>
        </button>
        <button onClick={(e) => e.stopPropagation()} style={{ ...actionBtn, marginLeft: 'auto' }} aria-label="Share">
          <Share2 size={18} strokeWidth={1.75} />
        </button>
      </div>
    </article>
  );
};

const Empty = ({ text, actionLabel, onAction }) => (
  <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
    <div style={{ marginBottom: actionLabel ? 12 : 0 }}>{text}</div>
    {actionLabel && (
      <Button variant="secondary" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);

const actionBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: '#6B7280',
  fontSize: 12,
  fontWeight: 500,
  padding: '6px 10px 6px 0',
};
