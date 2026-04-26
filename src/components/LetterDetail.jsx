import React, { useState } from 'react';
import {
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
} from 'lucide-react';
import { Avatar, Tag, Button, iconBtnSm } from './Shared.jsx';
import { ScreenHeader } from './MobileChrome.jsx';

const REACTION_ICONS = {
  Heart,
  Lightbulb,
  CircleDot,
  Cloud,
  Sun,
  Sparkles,
};

const REACTIONS = [
  { key: 'like',       label: 'Like',       icon: 'Heart',     color: '#6366F1' },
  { key: 'thoughtful', label: 'Thoughtful', icon: 'Lightbulb', color: '#8B5CF6' },
  { key: 'relatable',  label: 'Relatable',  icon: 'CircleDot', color: '#14B8A6' },
  { key: 'sad',        label: 'Sad',        icon: 'Cloud',     color: '#64748B' },
  { key: 'hopeful',    label: 'Hopeful',    icon: 'Sun',       color: '#E07856' },
  { key: 'inspiring',  label: 'Inspiring',  icon: 'Sparkles',  color: '#F59E0B' },
];

export const LetterDetail = ({ letter, onBack, onOpenProfile }) => {
  const [reaction, setReaction] = useState(null);
  const [following, setFollowing] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  return (
    <div>
      <ScreenHeader
        title="Letter"
        onBack={onBack}
        right={
          <>
            <button
              style={iconBtnSm}
              onClick={() => setBookmarked(!bookmarked)}
              aria-label={bookmarked ? 'Saved' : 'Save'}
            >
              {bookmarked ? (
                <BookmarkCheck size={20} color="#6366F1" strokeWidth={1.75} />
              ) : (
                <Bookmark size={20} color="#374151" strokeWidth={1.75} />
              )}
            </button>
            <button style={iconBtnSm} aria-label="Share">
              <Share2 size={20} strokeWidth={1.75} />
            </button>
            <button style={iconBtnSm} aria-label="More">
              <MoreHorizontal size={20} strokeWidth={1.75} />
            </button>
          </>
        }
      />

      {/* Author bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px' }}>
        <span onClick={() => onOpenProfile(letter.author)} style={{ cursor: 'pointer' }}>
          <Avatar name={letter.author.name} size={40} palette={letter.author.palette} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            onClick={() => onOpenProfile(letter.author)}
            style={{ fontSize: 14, fontWeight: 600, color: '#111827', cursor: 'pointer' }}
          >
            {letter.author.name}
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF' }}>
            {letter.age} ago · {letter.readTime} read
          </div>
        </div>
        <Button
          variant={following ? 'pillSec' : 'pill'}
          size="sm"
          onClick={() => setFollowing(!following)}
        >
          {following ? 'Following' : 'Follow'}
        </Button>
      </div>

      {/* Letter body */}
      <div style={{ padding: '8px 20px 24px' }}>
        <h1
          style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: 28,
            fontWeight: 500,
            lineHeight: 1.15,
            letterSpacing: '-0.015em',
            color: '#111827',
            margin: '0 0 18px',
          }}
        >
          {letter.title}
        </h1>
        <article
          style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: 17,
            lineHeight: 1.7,
            color: '#1F2937',
          }}
        >
          {letter.body.split('\n\n').map((p, i) => (
            <p key={i} style={{ margin: '0 0 18px' }}>
              {p}
            </p>
          ))}
        </article>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 20 }}>
          {letter.tags.map((t) => (
            <Tag key={t}>#{t}</Tag>
          ))}
        </div>
      </div>

      {/* Reactions */}
      <div
        style={{
          borderTop: '1px solid #F3F4F6',
          borderBottom: '1px solid #F3F4F6',
          padding: '16px',
          background: '#FAFAF7',
        }}
      >
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
          How did this letter sit with you?
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {REACTIONS.map((r) => {
            const RxIcon = REACTION_ICONS[r.icon];
            const active = reaction === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setReaction(active ? null : r.key)}
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
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 200ms cubic-bezier(0.2,0.7,0.2,1)',
                }}
              >
                <RxIcon size={13} color={active ? r.color : '#6B7280'} strokeWidth={1.75} />
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comments */}
      <CommentsSection />
    </div>
  );
};

const CommentsSection = () => {
  const [draft, setDraft] = useState('');
  const comments = [
    {
      id: 1,
      name: '@calmlines',
      palette: 'amber',
      age: '2h',
      body: 'The radiator clicking, the tea cup. You captured something I have been trying to put down for months. Thank you.',
    },
    {
      id: 2,
      name: '@nightowl_p',
      palette: 'violet',
      age: '4h',
      body: 'I read this twice. The second time I was crying about something completely unrelated.',
      replies: [
        {
          name: '@hannah_writes',
          palette: 'indigo',
          age: '3h',
          body: 'Thank you. That is exactly the response I hoped for.',
        },
      ],
    },
    {
      id: 3,
      name: '@rv_letters',
      palette: 'teal',
      age: '6h',
      body: 'Saved. I am going to write a reply letter this evening.',
    },
  ];
  return (
    <section style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 14 }}>
        Comments · {comments.length}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <Avatar name="@hannah_writes" size={32} />
        <div style={{ flex: 1 }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a thoughtful comment…"
            rows={2}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              fontSize: 13,
              fontFamily: 'inherit',
              outline: 'none',
              resize: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <Button variant="primary" size="sm" disabled={!draft.trim()}>
              Post
            </Button>
          </div>
        </div>
      </div>

      {comments.map((c) => (
        <div key={c.id} style={{ marginBottom: 18 }}>
          <Comment {...c} />
          {c.replies && (
            <div
              style={{
                marginLeft: 40,
                marginTop: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {c.replies.map((r, i) => (
                <Comment key={i} {...r} reply />
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
};

const Comment = ({ name, palette, age, body, reply }) => (
  <div style={{ display: 'flex', gap: 10 }}>
    <Avatar name={name} size={reply ? 24 : 32} palette={palette} />
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{name}</span>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{age} ago</span>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: '#374151', marginBottom: 4 }}>{body}</div>
      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#9CA3AF' }}>
        <button style={ghostBtn}>♡ Like</button>
        <button style={ghostBtn}>Reply</button>
      </div>
    </div>
  </div>
);

const ghostBtn = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'inherit',
  padding: 0,
  fontSize: 11,
};