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
import { SAMPLE_LETTERS } from '../data/letters.js';

const TABS = [
  { key: 'trending', label: 'Trending' },
  { key: 'latest', label: 'Latest' },
  { key: 'following', label: 'Following' },
];

export const Feed = ({ onOpenLetter, onOpenProfile }) => {
  const [mode, setMode] = useState('trending');
  const [bookmarked, setBookmarked] = useState(new Set([2]));

  const toggleBookmark = (id) => {
    setBookmarked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
      <div style={{ padding: 16 }}>
        <div style={{ padding: 16, borderRadius: 14, background: '#FFF7F2', border: '1px solid #F5C9B6' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#B85E3E',
              marginBottom: 6,
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
              fontSize: 18,
              fontWeight: 500,
              color: '#111827',
              lineHeight: 1.3,
              marginBottom: 12,
            }}
          >
            What is ordinary in your life today that may disappear later?
          </div>
          <Button variant="secondary" size="sm" icon={Feather}>
            Write a response
          </Button>
        </div>
      </div>

      {/* Letters */}
      {SAMPLE_LETTERS.map((l) => (
        <FeedLetter
          key={l.id}
          letter={l}
          bookmarked={bookmarked.has(l.id)}
          onBookmark={() => toggleBookmark(l.id)}
          onOpen={() => onOpenLetter(l)}
          onOpenProfile={() => onOpenProfile(l.author)}
        />
      ))}
    </div>
  );
};

const FeedLetter = ({ letter, bookmarked, onBookmark, onOpen, onOpenProfile }) => (
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
          {letter.age} ago · {letter.readTime} read
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
    <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
      {letter.tags.slice(0, 3).map((t) => (
        <Tag key={t}>#{t}</Tag>
      ))}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', color: '#6B7280', fontSize: 13 }}>
      <button onClick={(e) => e.stopPropagation()} style={actionBtn} aria-label="React">
        <Heart size={18} strokeWidth={1.75} />
        <span>{letter.reactions}</span>
      </button>
      <button onClick={(e) => e.stopPropagation()} style={actionBtn} aria-label="Comments">
        <MessageCircle size={18} strokeWidth={1.75} />
        <span>{letter.comments}</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onBookmark();
        }}
        style={{ ...actionBtn, color: bookmarked ? '#6366F1' : '#6B7280' }}
        aria-label={bookmarked ? 'Saved' : 'Save'}
      >
        {bookmarked ? <BookmarkCheck size={18} strokeWidth={1.75} /> : <Bookmark size={18} strokeWidth={1.75} />}
        <span>{letter.saves}</span>
      </button>
      <button onClick={(e) => e.stopPropagation()} style={{ ...actionBtn, marginLeft: 'auto' }} aria-label="Share">
        <Share2 size={18} strokeWidth={1.75} />
      </button>
    </div>
  </article>
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