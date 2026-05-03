/**
 * CommentsSection — shared between LetterDetail (mobile) and Desktop ReaderPane.
 * Features: post comment, reply (one level), like, @mention autocomplete,
 * clickable author names, correct avatar display.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { Avatar, Button } from './Shared.jsx';
import { useApi, postJSON, getJSON } from '../lib/api.js';

// ---------------------------------------------------------------------------
// @mention autocomplete
// ---------------------------------------------------------------------------
const useMention = (value, onChange) => {
  const [suggestions, setSuggestions] = useState([]);
  const [mentionStart, setMentionStart] = useState(null);
  const [query, setQuery] = useState('');

  const onInput = useCallback((e) => {
    onChange(e);
    const text = e.target.value;
    const pos = e.target.selectionStart;
    // Walk backwards to find an '@' that isn't preceded by a word char
    let at = -1;
    for (let i = pos - 1; i >= 0; i--) {
      if (text[i] === '@') { at = i; break; }
      if (/\s/.test(text[i])) break;
    }
    if (at === -1) { setSuggestions([]); setMentionStart(null); return; }
    const word = text.slice(at + 1, pos);
    if (word.length < 1) { setSuggestions([]); setMentionStart(null); return; }
    setMentionStart(at);
    setQuery(word);
  }, [onChange]);

  useEffect(() => {
    if (!query) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      getJSON(`/api/search/users?q=${encodeURIComponent(query)}`)
        .then((u) => setSuggestions((u || []).slice(0, 5)))
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const pickSuggestion = useCallback((username, textareaRef) => {
    if (mentionStart === null) return;
    const el = textareaRef.current;
    const pos = el ? el.selectionStart : value.length;
    const before = value.slice(0, mentionStart);
    const after = value.slice(pos);
    const next = `${before}@${username} ${after}`;
    onChange({ target: { value: next } });
    setSuggestions([]);
    setMentionStart(null);
    setQuery('');
    // Restore focus + cursor
    requestAnimationFrame(() => {
      if (el) { el.focus(); el.setSelectionRange(next.length - after.length, next.length - after.length); }
    });
  }, [mentionStart, value, onChange]);

  return { suggestions, onInput, pickSuggestion };
};

// ---------------------------------------------------------------------------
// Render text with @mentions highlighted/clickable
// ---------------------------------------------------------------------------
const MentionText = ({ text, onOpenProfile, style }) => {
  if (!text) return null;
  const parts = text.split(/(@\w+)/g);
  return (
    <span style={style}>
      {parts.map((part, i) =>
        /^@\w+$/.test(part) ? (
          <span
            key={i}
            onClick={() => onOpenProfile?.({ name: part, id: null })}
            style={{
              color: '#4338CA',
              fontWeight: 600,
              cursor: onOpenProfile ? 'pointer' : 'default',
            }}
          >
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Comment input with @mention support
// ---------------------------------------------------------------------------
const CommentInput = ({ value, onChange, placeholder, rows = 2, inputStyle }) => {
  const textareaRef = useRef(null);
  const { suggestions, onInput, pickSuggestion } = useMention(value, onChange);

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onInput}
        placeholder={placeholder}
        rows={rows}
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
          lineHeight: 1.5,
          ...inputStyle,
        }}
      />
      {suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(17,24,39,0.08)',
            zIndex: 20,
            overflow: 'hidden',
          }}
        >
          {suggestions.map((u) => {
            const name = u.username?.startsWith('@') ? u.username : `@${u.username}`;
            return (
              <div
                key={u.id}
                onMouseDown={(e) => { e.preventDefault(); pickSuggestion(u.username, textareaRef); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', cursor: 'pointer',
                  fontSize: 13, color: '#111827',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Avatar name={name} size={24} palette={u.palette} src={u.avatar} />
                <span style={{ fontWeight: 600 }}>{name}</span>
                {u.bio && <span style={{ fontSize: 11, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.bio}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Single comment item (root or reply)
// ---------------------------------------------------------------------------
const CommentItem = ({ comment, letterId, onReply, onOpenProfile, refetch, isReply = false }) => {
  const [liked, setLiked] = useState(comment.liked_by_me || false);
  const [likes, setLikes] = useState(comment.likes_count || 0);
  const [busy, setBusy] = useState(false);
  const name = comment.author?.name?.startsWith('@')
    ? comment.author.name
    : `@${comment.author?.name}`;

  const toggleLike = async () => {
    if (busy) return;
    setBusy(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((n) => n + (wasLiked ? -1 : 1));
    try {
      await postJSON(`/api/letters/${letterId}/comments/${comment.id}/like`, {});
    } catch {
      setLiked(wasLiked);
      setLikes((n) => n + (wasLiked ? 1 : -1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <span onClick={() => onOpenProfile?.(comment.author)} style={{ cursor: onOpenProfile ? 'pointer' : 'default', flexShrink: 0 }}>
        <Avatar
          name={name}
          size={isReply ? 24 : 32}
          palette={comment.author?.palette}
          src={comment.author?.avatar}
        />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
          <span
            onClick={() => onOpenProfile?.(comment.author)}
            style={{ fontSize: 12, fontWeight: 600, color: '#111827', cursor: onOpenProfile ? 'pointer' : 'default' }}
          >
            {name}
          </span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{comment.age} ago</span>
        </div>
        <MentionText
          text={comment.body}
          onOpenProfile={onOpenProfile}
          style={{ fontSize: 13, lineHeight: 1.5, color: '#374151', display: 'block', marginBottom: 6 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#9CA3AF' }}>
          <button
            onClick={toggleLike}
            disabled={busy}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 0, fontSize: 11, fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              color: liked ? '#6366F1' : '#9CA3AF',
              fontWeight: liked ? 600 : 400,
            }}
          >
            <Heart size={12} strokeWidth={liked ? 2.5 : 1.75} fill={liked ? '#6366F1' : 'none'} />
            {likes > 0 ? likes : 'Like'}
          </button>
          {!isReply && (
            <button
              onClick={() => onReply?.(comment)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: 0, fontSize: 11, fontFamily: 'inherit', color: '#9CA3AF',
              }}
            >
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main CommentsSection
// ---------------------------------------------------------------------------
export const CommentsSection = ({ letterId, me, onOpenProfile, compact = false }) => {
  const { data, loading, error, refetch } = useApi(
    `/api/letters/${letterId}/comments`,
    [letterId]
  );
  const comments = data || [];

  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null); // comment being replied to
  const [replyDraft, setReplyDraft] = useState('');
  const [replyPosting, setReplyPosting] = useState(false);

  const myName = me ? (me.username?.startsWith('@') ? me.username : `@${me.username}`) : '@you';

  const postComment = async () => {
    if (!draft.trim() || posting) return;
    setPosting(true);
    try {
      await postJSON(`/api/letters/${letterId}/comments`, { body: draft.trim() });
      setDraft('');
      refetch();
    } catch { /* ignore */ } finally { setPosting(false); }
  };

  const postReply = async () => {
    if (!replyDraft.trim() || replyPosting || !replyTarget) return;
    setReplyPosting(true);
    try {
      await postJSON(`/api/letters/${letterId}/comments`, {
        body: replyDraft.trim(),
        parent_id: replyTarget.id,
      });
      setReplyDraft('');
      setReplyTarget(null);
      refetch();
    } catch { /* ignore */ } finally { setReplyPosting(false); }
  };

  const pad = compact ? '0 16px 16px' : '0 24px 28px';
  const titleSize = compact ? 13 : 14;
  const avatarSize = compact ? 28 : 32;

  return (
    <section style={{ padding: pad }}>
      <div style={{ fontSize: titleSize, fontWeight: 600, color: '#111827', marginBottom: 14 }}>
        Comments · {comments.length}
      </div>

      {/* New comment form */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <Avatar name={myName} size={avatarSize} palette={me?.palette} src={me?.avatar} />
        <div style={{ flex: 1 }}>
          <CommentInput
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a thoughtful comment… (@mention someone)"
            rows={2}
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

      {loading && <div style={{ padding: '12px 0', color: '#9CA3AF', fontSize: 13 }}>Loading comments…</div>}
      {error && <div style={{ padding: '12px 0', color: '#9CA3AF', fontSize: 13 }}>Could not load comments.</div>}
      {!loading && !error && comments.length === 0 && (
        <div style={{ padding: '8px 0 16px', color: '#9CA3AF', fontSize: 13 }}>Be the first to leave a thought.</div>
      )}

      {comments.map((c) => (
        <div key={c.id} style={{ marginBottom: 18 }}>
          <CommentItem
            comment={c}
            letterId={letterId}
            onOpenProfile={onOpenProfile}
            onReply={(target) => {
              setReplyTarget(target);
              setReplyDraft(`@${target.author?.name} `);
            }}
            refetch={refetch}
          />

          {/* Inline reply form */}
          {replyTarget?.id === c.id && (
            <div style={{ marginLeft: 42, marginTop: 10, display: 'flex', gap: 8 }}>
              <Avatar name={myName} size={24} palette={me?.palette} src={me?.avatar} />
              <div style={{ flex: 1 }}>
                <CommentInput
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  placeholder={`Reply to ${c.author?.name}…`}
                  rows={2}
                />
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }}>
                  <Button variant="secondary" size="sm" onClick={() => setReplyTarget(null)}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={postReply} disabled={!replyDraft.trim() || replyPosting}>
                    {replyPosting ? 'Posting…' : 'Reply'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Existing replies */}
          {c.replies && c.replies.length > 0 && (
            <div style={{ marginLeft: 42, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {c.replies.map((r) => (
                <CommentItem
                  key={r.id}
                  comment={r}
                  letterId={letterId}
                  onOpenProfile={onOpenProfile}
                  refetch={refetch}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
};
