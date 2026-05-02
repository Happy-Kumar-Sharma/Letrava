import React, { useState } from 'react';
import {
  Feather,
  Flame,
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
      {/* Sticky tab row */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 4,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
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
              fontSize: 13,
              fontWeight: 600,
              color: mode === t.key ? '#111827' : '#9CA3AF',
              borderBottom: mode === t.key ? '2px solid #6366F1' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 160ms cubic-bezier(0.2,0.7,0.2,1)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Prompt of the week — refined gradient + watermark feather */}
      {prompt && (
        <div style={{ padding: 16 }}>
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: 'linear-gradient(180deg, #FFF7F2 0%, #FFFBF7 100%)',
              border: '1px solid #F5C9B6',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <svg
              width="80"
              height="80"
              viewBox="0 0 64 64"
              style={{ position: 'absolute', right: -8, bottom: -10, opacity: 0.18 }}
              aria-hidden="true"
            >
              <path
                d="M 38 10 C 52 16, 56 30, 48 48 C 44 42, 38 38, 32 36 C 36 28, 38 20, 38 10 Z"
                fill="#E07856"
              />
            </svg>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#B85E3E',
                marginBottom: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Feather size={12} strokeWidth={1.75} />
              Prompt of the week
            </div>
            <div
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: 19,
                fontWeight: 500,
                color: '#111827',
                lineHeight: 1.3,
                marginBottom: 12,
                maxWidth: 320,
              }}
            >
              {prompt.prompt}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Button variant="primary" size="sm" icon={Feather} onClick={() => onWrite?.(prompt.prompt)}>
                Write a response
              </Button>
              {(prompt.response_count != null || prompt.days_left != null) && (
                <span style={{ fontSize: 11, color: '#6B7280' }}>
                  {prompt.response_count != null && `${prompt.response_count} letters`}
                  {prompt.response_count != null && prompt.days_left != null && ' · '}
                  {prompt.days_left != null && `${prompt.days_left} days left`}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Letters */}
      {loading && <FeedSkeleton />}
      {error && (
        <Empty
          text={`Could not load feed. ${error?.message || ''}`}
          actionLabel="Try again"
          onAction={refetch}
        />
      )}
      {!loading && !error && letters && letters.length === 0 && (
        <Empty text="No letters here yet — check back soon." />
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
  const [saved, setSaved]      = useState(!!letter.saved);
  const [saveCount, setSaveCt] = useState(letter.saves);
  const [busy, setBusy]        = useState(false);
  const [hover, setHover]      = useState(false);

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
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: 16,
        borderBottom: '1px solid #F3F4F6',
        cursor: 'pointer',
        background: hover ? '#FAFAFC' : '#fff',
        transition: 'background 160ms cubic-bezier(0.2,0.7,0.2,1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span
          onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
          style={{ cursor: 'pointer' }}
        >
          <Avatar name={letter.author.name} size={32} palette={letter.author.palette} src={letter.author.avatar} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
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
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 4, color: '#9CA3AF',
          }}
        >
          <MoreHorizontal size={18} strokeWidth={1.75} />
        </button>
      </div>
      <h3
        style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontSize: 21,
          fontWeight: 500,
          lineHeight: 1.18,
          letterSpacing: '-0.005em',
          color: '#111827',
          margin: '0 0 8px',
          textWrap: 'pretty',
        }}
      >
        {letter.title}
      </h3>
      <p
        style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontSize: 15,
          lineHeight: 1.6,
          color: '#4B5563',
          margin: '0 0 14px',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {letter.excerpt}
      </p>
      {letter.tags && letter.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {letter.tags.slice(0, 3).map((t) => (
            <Tag key={t}>#{t}</Tag>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', color: '#6B7280', fontSize: 12, fontWeight: 500 }}>
        <button onClick={(e) => e.stopPropagation()} style={actionBtn} aria-label="React">
          <Heart size={16} strokeWidth={1.75} color={letter.my_reaction ? '#6366F1' : '#6B7280'} />
          <span>{letter.reactions}</span>
        </button>
        <button onClick={(e) => e.stopPropagation()} style={actionBtn} aria-label="Comments">
          <MessageCircle size={16} strokeWidth={1.75} />
          <span>{letter.comments}</span>
        </button>
        <button
          onClick={toggleBookmark}
          style={{ ...actionBtn, color: saved ? '#6366F1' : '#6B7280' }}
          aria-label={saved ? 'Saved' : 'Save'}
          disabled={busy}
        >
          {saved ? <BookmarkCheck size={16} strokeWidth={1.75} /> : <Bookmark size={16} strokeWidth={1.75} />}
          <span>{saveCount}</span>
        </button>
        <button onClick={(e) => e.stopPropagation()} style={{ ...actionBtn, marginLeft: 'auto' }} aria-label="Share">
          <Share2 size={16} strokeWidth={1.75} />
        </button>
      </div>
    </article>
  );
};

// Skeleton list while feed is loading — replaces the bare "Loading…" string
const FeedSkeleton = () => (
  <div>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{ padding: 16, borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6' }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: 100, height: 10, borderRadius: 4, background: '#F3F4F6', marginBottom: 6 }} />
            <div style={{ width: 60, height: 8, borderRadius: 4, background: '#F3F4F6' }} />
          </div>
        </div>
        <div style={{ width: '90%', height: 18, borderRadius: 6, background: '#F3F4F6', marginBottom: 10 }} />
        <div style={{ width: '100%', height: 12, borderRadius: 4, background: '#F3F4F6', marginBottom: 6 }} />
        <div style={{ width: '70%', height: 12, borderRadius: 4, background: '#F3F4F6' }} />
      </div>
    ))}
    <style>{`
      @keyframes ltvShimmer { 0%{opacity:.6} 50%{opacity:1} 100%{opacity:.6} }
      div[style*="background: rgb(243, 244, 246)"] { animation: ltvShimmer 1.4s ease-in-out infinite; }
    `}</style>
  </div>
);

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
  padding: '6px 12px 6px 0',
};
