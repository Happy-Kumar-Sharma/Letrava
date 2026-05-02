import React, { useEffect, useMemo, useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from './Shared.jsx';
import { postJSON } from '../lib/api.js';

const MOODS = [
  { key: 'hopeful',    label: 'Hopeful',    color: '#E07856' },
  { key: 'thoughtful', label: 'Thoughtful', color: '#8B5CF6' },
  { key: 'sad',        label: 'Sad',        color: '#64748B' },
  { key: 'tender',     label: 'Tender',     color: '#14B8A6' },
];

const WORD_GOAL = 250;

/**
 * Editor — full-screen composer.
 * Calls onSubmit(newLetter) after successful publish.
 */
export const Editor = ({ onClose, onSubmit, initialPrompt = null }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState(initialPrompt ? `Prompt: ${initialPrompt}\n\n` : '');
  const [tags, setTags] = useState(['solitude']);
  const [tagDraft, setTagDraft] = useState('');
  const [mood, setMood] = useState('hopeful');
  const [savedAt, setSavedAt] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  // Auto-save indicator pulse on every edit
  useEffect(() => {
    if (!title && !body) return;
    const t = setTimeout(() => setSavedAt(new Date()), 1000);
    return () => clearTimeout(t);
  }, [title, body]);

  const wordCount = useMemo(
    () => body.trim().split(/\s+/).filter(Boolean).length,
    [body]
  );
  const goalPct = Math.min(1, wordCount / WORD_GOAL);
  const overGoal = wordCount > WORD_GOAL;
  const ringColor = overGoal ? '#10B981' : wordCount === 0 ? '#E5E7EB' : '#6366F1';
  const charCount = body.length;
  const readMin = Math.max(1, Math.round(wordCount / 220));

  const addTag = (e) => {
    if (e.key === 'Enter' && tagDraft.trim() && tags.length < 5) {
      e.preventDefault();
      const cleaned = tagDraft.trim().replace(/^#/, '').toLowerCase();
      if (cleaned && !tags.includes(cleaned)) setTags([...tags, cleaned]);
      setTagDraft('');
    } else if (e.key === 'Backspace' && !tagDraft && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const publish = async () => {
    setError('');
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }
    setPublishing(true);
    try {
      const created = await postJSON('/api/letters', { title: title.trim(), body, tags, mood });
      onSubmit?.(created);
    } catch (err) {
      const msg = err?.body?.detail || err?.message || 'Could not publish letter.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#FAFAF7',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        style={{
          height: 56,
          borderBottom: '1px solid #EDEAE2',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          background: '#fff',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#374151',
            padding: 8,
            display: 'inline-flex',
            borderRadius: '50%',
          }}
        >
          <X size={20} strokeWidth={1.75} />
        </button>
        <div
          style={{
            flex: 1,
            fontSize: 12,
            color: '#9CA3AF',
            textAlign: 'center',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {savedAt ? (
            <>
              <Check size={12} color="#10B981" strokeWidth={2.25} />
              <span>Draft saved · {timeAgo(savedAt)}</span>
            </>
          ) : (
            <span style={{ fontWeight: 500 }}>New letter</span>
          )}
        </div>
        {/* Word-goal ring */}
        <WordRing
          pct={goalPct}
          color={ringColor}
          count={wordCount}
          title={`${wordCount} / ${WORD_GOAL} words${overGoal ? ' (goal reached)' : ''}`}
        />
        <Button
          variant="primary"
          size="sm"
          onClick={publish}
          disabled={!title || !body || publishing}
        >
          {publishing ? 'Publishing…' : 'Publish'}
        </Button>
      </header>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px 16px' }}>
        {/* Eyebrow */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#B85E3E',
            marginBottom: 12,
          }}
        >
          {initialPrompt ? 'New letter · Replying to prompt' : 'New letter'}
        </div>

        {error && (
          <div
            style={{
              fontSize: 12,
              color: '#B91C1C',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              padding: '8px 12px',
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="A title for the future"
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            padding: 0,
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: 30,
            fontWeight: 500,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: '#111827',
            marginBottom: 18,
          }}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write something the future should remember."
          style={{
            width: '100%',
            minHeight: 360,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            padding: 0,
            resize: 'vertical',
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: 17,
            lineHeight: 1.75,
            color: '#1F2937',
          }}
        />
      </div>

      {/* Footer — counts + tags + mood */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #EDEAE2',
          background: '#fff',
          flexShrink: 0,
        }}
      >
        {/* Counts row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 11,
            color: '#9CA3AF',
            marginBottom: 10,
          }}
        >
          <span>{wordCount} words</span>
          <span>·</span>
          <span>{charCount} chars</span>
          <span>·</span>
          <span>~{readMin} min read</span>
          <span style={{ marginLeft: 'auto', color: overGoal ? '#10B981' : '#9CA3AF', fontWeight: 600 }}>
            {overGoal ? 'Goal reached' : `${WORD_GOAL - wordCount} to goal`}
          </span>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {tags.map((t) => (
            <span
              key={t}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 999,
                background: '#EEF2FF',
                color: '#4338CA',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              #{t}
              <button
                onClick={() => setTags(tags.filter((x) => x !== t))}
                aria-label={`Remove tag ${t}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#4338CA',
                  padding: 0,
                  display: 'inline-flex',
                }}
              >
                <X size={11} strokeWidth={2} />
              </button>
            </span>
          ))}
          {tags.length < 5 && (
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={addTag}
              placeholder={tags.length === 0 ? 'add up to 5 tags' : '+ tag'}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 12,
                color: '#111827',
                padding: 4,
                minWidth: 80,
                fontFamily: 'inherit',
              }}
            />
          )}
        </div>

        {/* Mood */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {MOODS.map((m) => {
            const active = mood === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setMood(m.key)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 999,
                  border: '1px solid ' + (active ? m.color : '#E5E7EB'),
                  background: active ? m.color + '14' : '#fff',
                  color: active ? m.color : '#374151',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 200ms cubic-bezier(0.2,0.7,0.2,1)',
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ---- Word-count progress ring -------------------------------------------------
const WordRing = ({ pct, color, count, title }) => {
  const r = 13;
  const c = 2 * Math.PI * r;
  const dash = pct * c;
  return (
    <div style={{ position: 'relative', width: 32, height: 32, marginRight: 8 }} title={title}>
      <svg width="32" height="32" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r={r} fill="none" stroke="#F3F4F6" strokeWidth="3" />
        <circle
          cx="16" cy="16" r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 16 16)"
          style={{ transition: 'stroke-dasharray 280ms cubic-bezier(0.2,0.7,0.2,1), stroke 200ms' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: count > 999 ? 8 : 9,
          fontWeight: 700,
          color: '#111827',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {count}
      </div>
    </div>
  );
};

// "just now" / "12s ago" / "3m ago"
function timeAgo(date) {
  const s = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (s < 5)  return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return 'a while ago';
}
