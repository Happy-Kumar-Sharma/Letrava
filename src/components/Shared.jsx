import React, { useState } from 'react';

export const Logo = ({ size = 28, inverse = false }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M 14 8 L 14 52 L 44 52"
        stroke={inverse ? '#fff' : '#111827'}
        strokeWidth="8"
        fill="none"
        strokeLinecap="square"
      />
      <path
        d="M 38 10 C 52 16, 56 30, 48 48 C 44 42, 38 38, 32 36 C 36 28, 38 20, 38 10 Z"
        fill="#E07856"
      />
    </svg>
    <span
      style={{
        fontFamily: 'Fraunces, Georgia, serif',
        fontSize: Math.round(size * 0.72),
        fontWeight: 500,
        color: inverse ? '#fff' : '#111827',
        letterSpacing: '0.01em',
      }}
    >
      Letrava
    </span>
  </span>
);

const PALETTES = {
  indigo: { bg: '#EEF2FF', fg: '#4338CA' },
  coral:  { bg: '#FBE5DA', fg: '#B85E3E' },
  teal:   { bg: '#E0F2EF', fg: '#0F766E' },
  violet: { bg: '#F1ECFF', fg: '#6B21A8' },
  amber:  { bg: '#FEF3C7', fg: '#B45309' },
};

export const Avatar = ({ name = '?', size = 36, palette = 'indigo', src = null }) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }}
      />
    );
  }
  const p = PALETTES[palette] || PALETTES.indigo;
  const initials = name.replace('@', '').slice(0, 1).toUpperCase();
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: p.bg,
        color: p.fg,
        fontFamily: 'Fraunces, Georgia, serif',
        fontWeight: 600,
        fontSize: Math.round(size * 0.42),
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
};

export const Tag = ({ children, variant = 'default', onClick }) => {
  const variants = {
    default: { background: '#F3F4F6', color: '#4B5563' },
    indigo:  { background: '#EEF2FF', color: '#4338CA' },
    outline: { background: '#fff', color: '#4B5563', border: '1px solid #E5E7EB' },
  };
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        cursor: onClick ? 'pointer' : 'default',
        ...variants[variant],
      }}
    >
      {children}
    </span>
  );
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  style,
  type = 'button',
  icon: IconComp,
  disabled,
  ...rest
}) => {
  const variants = {
    primary:   { background: '#6366F1', color: '#fff', border: '1px solid transparent' },
    secondary: { background: '#fff', color: '#111827', border: '1px solid #D1D5DB' },
    ghost:     { background: 'transparent', color: '#111827', border: '1px solid transparent' },
    danger:    { background: '#fff', color: '#EF4444', border: '1px solid #D1D5DB' },
    pill:      { background: '#6366F1', color: '#fff', border: '1px solid transparent', borderRadius: 999 },
    pillSec:   { background: '#fff', color: '#111827', border: '1px solid #D1D5DB', borderRadius: 999 },
  };
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 13 },
    md: { padding: '10px 18px', fontSize: 14 },
    lg: { padding: '12px 22px', fontSize: 15 },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      {...rest}
      style={{
        fontFamily: 'Inter, sans-serif',
        fontWeight: 600,
        lineHeight: 1,
        borderRadius: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 200ms cubic-bezier(0.2,0.7,0.2,1)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        whiteSpace: 'nowrap',
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
    >
      {IconComp && <IconComp size={size === 'sm' ? 14 : 16} strokeWidth={1.75} />}
      {children}
    </button>
  );
};

export const Card = ({ children, hoverable = false, paper = false, style, ...rest }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => hoverable && setHover(true)}
      onMouseLeave={() => hoverable && setHover(false)}
      style={{
        background: paper ? '#FAFAF7' : '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 14,
        boxShadow: hover
          ? '0 12px 32px rgba(17,24,39,0.08), 0 4px 8px rgba(17,24,39,0.04)'
          : '0 1px 2px rgba(17,24,39,0.04)',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 200ms cubic-bezier(0.2,0.7,0.2,1)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

export const iconBtn = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: '#374151',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const iconBtnSm = { ...iconBtn, width: 36, height: 36 };

// ---------------------------------------------------------------------------
// Inline + block markdown renderer (shared between mobile LetterDetail and
// desktop ReaderPane so formatting is consistent everywhere)
// ---------------------------------------------------------------------------
export function parseInline(text) {
  return text.split(/(\*\*[^*\n]+?\*\*|_[^_\n]+?_)/g).map((seg, i) => {
    if (seg.startsWith('**') && seg.endsWith('**')) return <strong key={i}>{seg.slice(2, -2)}</strong>;
    if (seg.startsWith('_')  && seg.endsWith('_'))  return <em key={i}>{seg.slice(1, -1)}</em>;
    return seg;
  });
}

export function BodyRenderer({ body, dropCapColor = '#E07856' }) {
  const blocks = (body || '').split('\n\n');
  const elements = [];
  let firstRendered = false;

  blocks.forEach((block, bi) => {
    if (!block.trim()) return;
    const lines = block.split('\n');

    // Pure bullet-list block (every line starts with "- ")
    if (lines.every(l => l.startsWith('- '))) {
      elements.push(
        <ul key={bi} style={{ margin: '0 0 18px', paddingLeft: 22 }}>
          {lines.map((l, i) => (
            <li key={i} style={{ marginBottom: 4 }}>{parseInline(l.slice(2))}</li>
          ))}
        </ul>
      );
      return;
    }

    lines.forEach((line, li) => {
      const key = `${bi}-${li}`;
      if (line.startsWith('## ')) {
        elements.push(
          <div key={key} style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 21, fontWeight: 500, color: '#111827', margin: '26px 0 8px', lineHeight: 1.2 }}>
            {parseInline(line.slice(3))}
          </div>
        );
      } else if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={key} style={{ borderLeft: '3px solid #E07856', paddingLeft: 16, margin: '0 0 18px', color: '#4B5563', fontStyle: 'italic' }}>
            {parseInline(line.slice(2))}
          </blockquote>
        );
      } else if (line.startsWith('- ')) {
        elements.push(
          <div key={key} style={{ paddingLeft: 18, marginBottom: 6 }}>
            <span style={{ color: '#E07856', marginRight: 6 }}>•</span>
            {parseInline(line.slice(2))}
          </div>
        );
      } else if (!firstRendered) {
        // Drop-cap on the very first non-block line
        firstRendered = true;
        const first = line.charAt(0);
        const rest  = line.slice(1);
        elements.push(
          <p key={key} style={{ margin: '0 0 18px' }}>
            <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 56, lineHeight: 0.8, float: 'left', color: dropCapColor, marginRight: 8, marginTop: 6, fontWeight: 500 }}>
              {first}
            </span>
            {parseInline(rest)}
          </p>
        );
      } else {
        elements.push(<p key={key} style={{ margin: '0 0 18px' }}>{parseInline(line)}</p>);
      }
    });
  });

  return <>{elements}</>;
}