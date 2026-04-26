import React, { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from './Shared.jsx';
import { postJSON } from '../lib/api.js';

const MOODS = [
  { key: 'hopeful', label: 'Hopeful', color: '#E07856' },
  { key: 'thoughtful', label: 'Thoughtful', color: '#8B5CF6' },
  { key: 'sad', label: 'Sad', color: '#64748B' },
  { key: 'tender', label: 'Tender', color: '#14B8A6' },
];

/**
 * Editor — full-screen composer.
 * Calls onSubmit(newLetter) after successful publish so the shell can refresh.
 */
export const Editor = ({ onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState(['solitude']);
  const [tagDraft, setTagDraft] = useState('');
  const [mood, setMood] = useState('hopeful');
  const [savedAt, setSavedAt] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!title && !body) return;
    const t = setTimeout(() => setSavedAt(new Date()), 1000);
    return () => clearTimeout(t);
  }, [title, body]);

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;

  const addTag = (e) => {
    if (e.key === 'Enter' && tagDraft.trim() && tags.length < 5) {
      e.preventDefault();
      setTags([...tags, tagDraft.trim().replace(/^#/, '')]);
      setTagDraft('');
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
      const created = await postJSON('/api/letters', {
        title: title.trim(),
        body,
        tags,
        mood,
      });
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
          }}
        >
          <X size={20} strokeWidth={1.75} />
        </button>
        <div style={{ flex: 1, fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
          {savedAt ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Check size={12} color="#10B981" strokeWidth={2} />
              Draft saved
            </span>
          ) : (
            'New letter'
          )}
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={publish}
          disabled={!title || !body || publishing}
        >
          {publishing ? 'Publishing…' : 'Publish'}
        </Button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
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
            fontSize: 28,
            fontWeight: 500,
            lineHeight: 1.15,
            letterSpacing: '-0.015em',
            color: '#111827',
            marginBottom: 16,
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
            lineHeight: 1.7,
            color: '#1F2937',
          }}
        />
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid #EDEAE2', background: '#fff', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>{wordCount} words</div>
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
              placeholder="add tag"
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 12,
                color: '#111827',
                padding: 4,
                minWidth: 70,
                fontFamily: 'inherit',
              }}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {MOODS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMood(m.key)}
              style={{
                padding: '5px 10px',
                borderRadius: 999,
                border: '1px solid ' + (mood === m.key ? m.color : '#E5E7EB'),
                background: mood === m.key ? m.color + '14' : '#fff',
                color: mood === m.key ? m.color : '#374151',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
