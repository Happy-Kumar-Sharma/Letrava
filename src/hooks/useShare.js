import { useCallback } from 'react';

function fireToast(message) {
  window.dispatchEvent(new CustomEvent('letrava:toast', { detail: { message } }));
}

/**
 * Returns an async `share(options)` function.
 * Uses the Web Share API when available; falls back to clipboard copy.
 * Fires a global 'letrava:toast' event so App.jsx can show feedback.
 */
export function useShare() {
  return useCallback(async ({ title, text, url } = {}) => {
    const shareUrl = url || window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: title || 'Letrava', text, url: shareUrl });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return; // user cancelled
      }
    }

    // Clipboard API (modern)
    try {
      await navigator.clipboard.writeText(shareUrl);
      fireToast('Link copied to clipboard');
      return;
    } catch { /* fall through to legacy */ }

    // Legacy execCommand fallback
    try {
      const el = document.createElement('textarea');
      el.value = shareUrl;
      el.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      fireToast('Link copied to clipboard');
    } catch {
      fireToast('Could not copy link');
    }
  }, []);
}
