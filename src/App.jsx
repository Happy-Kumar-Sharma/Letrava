import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TopBar, BottomNav, SearchScreen, SavedScreen } from './components/MobileChrome.jsx';
import { Onboarding } from './components/Onboarding.jsx';
import { Feed } from './components/Feed.jsx';
import { LetterDetail } from './components/LetterDetail.jsx';
import { Profile } from './components/Profile.jsx';
import { Editor } from './components/Editor.jsx';
import { LoginModal } from './components/LoginModal.jsx';
import { ProfileGate } from './components/ProfileGate.jsx';
import { NotificationsScreen } from './components/NotificationsScreen.jsx';
import { DesktopShell } from './components/Desktop.jsx';
import { getJSON, setOnUnauthorized, authSignout, triggerGlobalRefresh, useApi } from './lib/api.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse /letter/:id from a pathname, returns integer id or null. */
function parseLetterId(pathname) {
  const m = pathname.match(/^\/letter\/(\d+)(?:\/.*)?$/);
  return m ? parseInt(m[1], 10) : null;
}

/** Push /letter/:id into browser history. */
function pushLetterUrl(id) {
  window.history.pushState({ letterId: id }, '', `/letter/${id}`);
}

/** Reset URL back to the app root. */
function pushRootUrl() {
  window.history.pushState({}, '', '/');
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
const Toast = ({ message, color = '#16A34A' }) => (
  <div style={{
    position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
    background: color, color: '#fff', padding: '10px 20px', borderRadius: 10,
    fontSize: 14, fontWeight: 600, zIndex: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
    whiteSpace: 'nowrap', pointerEvents: 'none',
  }}>
    {message}
  </div>
);

// ---------------------------------------------------------------------------
// Pull-to-refresh indicator
// ---------------------------------------------------------------------------
const PullIndicator = ({ progress, refreshing }) => {
  const visible = progress > 0.05 || refreshing;
  if (!visible) return null;
  const size = 28;
  const r = 11;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
      display: 'flex', justifyContent: 'center',
      transform: `translateY(${Math.min(progress, 1) * 48 - 28}px)`,
      transition: refreshing ? 'none' : 'transform 80ms linear',
      pointerEvents: 'none',
    }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: '#fff', boxShadow: '0 2px 8px rgba(17,24,39,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F3F4F6" strokeWidth="2.5" />
          <circle
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke="#6366F1" strokeWidth="2.5"
            strokeDasharray={refreshing ? `${circ * 0.7} ${circ * 0.3}` : `${circ * Math.min(progress, 1)} ${circ}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition: refreshing ? 'none' : 'stroke-dasharray 80ms linear' }}
          >
            {refreshing && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`0 ${size/2} ${size/2}`}
                to={`360 ${size/2} ${size/2}`}
                dur="0.8s"
                repeatCount="indefinite"
              />
            )}
          </circle>
        </svg>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Loader for a letter by ID (used by both authed and public paths)
// ---------------------------------------------------------------------------
const LetterLoader = ({ letterId, children }) => {
  const { data: letter, loading } = useApi(
    letterId ? `/api/letters/${letterId}` : null,
    [letterId]
  );
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
        Loading…
      </div>
    );
  }
  if (!letter) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
        Letter not found.
      </div>
    );
  }
  return children(letter);
};

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  const [authed, setAuthed]           = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab]                 = useState('home');
  const [activeLetter, setActiveLetter] = useState(null);
  const [activeAuthor, setActiveAuthor] = useState(null);
  const [loginOpen, setLoginOpen]     = useState(false);
  const [loginMode, setLoginMode]     = useState('signup');
  const [editorOpen, setEditorOpen]   = useState(false);
  const [editorPrompt, setEditorPrompt] = useState(null);
  const [editorLetter, setEditorLetter] = useState(null);
  const [toast, setToast]             = useState(null);
  const [isDesktop, setIsDesktop]     = useState(() => window.innerWidth >= 1024);
  const [view, setView]               = useState('shell');
  // URL-driven letter ID (set from pathname on load / popstate)
  const [urlLetterId, setUrlLetterId] = useState(() => parseLetterId(window.location.pathname));
  const toastTimer = useRef(null);

  // Pull-to-refresh state
  const screenRef    = useRef(null);
  const ptrTouch     = useRef({ y0: 0, progress: 0 });
  const [pullProgress, setPullProgress]     = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const PTR_THRESHOLD = 72;

  const showToast = (message, color) => {
    clearTimeout(toastTimer.current);
    setToast({ message, color });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  // ── Responsive desktop detection ──────────────────────────────────────────
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Global toast (fired by useShare etc.) ─────────────────────────────────
  useEffect(() => {
    const handler = (e) => showToast(e.detail.message, '#16A34A');
    window.addEventListener('letrava:toast', handler);
    return () => window.removeEventListener('letrava:toast', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setOnUnauthorized(() => {
      setAuthed(false);
      setView('shell');
      setTab('home');
    });
    getJSON('/api/auth/me')
      .then(() => { setAuthed(true);  setAuthChecked(true); })
      .catch(() => { setAuthed(false); setAuthChecked(true); });

    // Open shared letter on startup if URL contains /letter/:id
    const id = parseLetterId(window.location.pathname);
    if (id) {
      setUrlLetterId(id);
      setView('letter');
    }

    return () => clearTimeout(toastTimer.current);
  }, []);

  // ── Browser back / forward ────────────────────────────────────────────────
  useEffect(() => {
    const onPop = () => {
      const id = parseLetterId(window.location.pathname);
      if (id) {
        setUrlLetterId(id);
        setView('letter');
      } else {
        setUrlLetterId(null);
        setActiveLetter(null);
        setView('shell');
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const doRefresh = useCallback(() => {
    setPullRefreshing(true);
    triggerGlobalRefresh();
    setTimeout(() => setPullRefreshing(false), 1200);
  }, []);

  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const onStart = (e) => {
      if (el.scrollTop <= 0) ptrTouch.current.y0 = e.touches[0].clientY;
    };
    const onMove = (e) => {
      if (!ptrTouch.current.y0) return;
      const dy = e.touches[0].clientY - ptrTouch.current.y0;
      if (dy > 0 && el.scrollTop <= 0) {
        const p = Math.min(dy / PTR_THRESHOLD, 1.3);
        ptrTouch.current.progress = p;
        setPullProgress(p);
      } else {
        ptrTouch.current = { y0: 0, progress: 0 };
        setPullProgress(0);
      }
    };
    const onEnd = () => {
      if (ptrTouch.current.progress >= 1) doRefresh();
      ptrTouch.current = { y0: 0, progress: 0 };
      setPullProgress(0);
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove',  onMove,  { passive: true });
    el.addEventListener('touchend',   onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onEnd);
    };
  }, [doRefresh]);

  if (!authChecked) return null;

  // ── Auth helpers ──────────────────────────────────────────────────────────
  const openLogin = (mode = 'signup') => {
    setLoginMode(mode);
    setLoginOpen(true);
  };

  const handleAuth = (isNew = false) => {
    setAuthed(true);
    setLoginOpen(false);
    // If user just signed in while on a shared letter, keep viewing it
    if (view !== 'letter') {
      setView('shell');
      setTab('home');
    }
    if (isNew) showToast('✓ Account created — you\'re logged in!', '#16A34A');
  };

  const handleSignOut = async () => {
    await authSignout();
    setAuthed(false);
    setView('shell');
    setTab('home');
    setActiveLetter(null);
    setActiveAuthor(null);
    setEditorOpen(false);
    setEditorPrompt(null);
    setToast(null);
    // Keep urlLetterId so logged-out public view still works
    setLoginMode('signin');
    setLoginOpen(true);
    pushRootUrl();
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const openLetter = (l) => {
    pushLetterUrl(l.id);
    setActiveLetter(l);
    setUrlLetterId(null); // use activeLetter object, not id-only lookup
    setView('letter');
    // Unauthenticated users can still view — publicView handled in render
  };

  const goBackFromLetter = () => {
    pushRootUrl();
    setActiveLetter(null);
    setUrlLetterId(null);
    setView('shell');
  };

  const openProfile = (a) => {
    if (!authed) { openLogin('signup'); return; }
    setActiveAuthor(a);
    setView('profile');
  };

  const openEditor = (prompt = null, letter = null) => {
    setEditorPrompt(prompt);
    setEditorLetter(letter);
    setEditorOpen(true);
  };

  // After create/edit: refetch feeds without remounting them
  const handlePublished = (result) => {
    setEditorOpen(false);
    setEditorPrompt(null);
    triggerGlobalRefresh();
    if (result?.id && editorLetter) {
      // Edit: jump back to the updated letter
      setActiveLetter(result);
      setEditorLetter(null);
      pushLetterUrl(result.id);
      setView('letter');
    } else {
      setEditorLetter(null);
      setTab('home');
      setView('shell');
      pushRootUrl();
    }
  };

  const handleTabChange = (next) => {
    setTab(next);
    setView('shell');
    setActiveLetter(null);
    setActiveAuthor(null);
    if (next !== 'letter') pushRootUrl();
  };

  // ── Authed screen resolver ─────────────────────────────────────────────────
  const authedScreen = (me) => {
    if (view === 'notifications') {
      return <NotificationsScreen onBack={() => setView('shell')} />;
    }

    if (view === 'letter') {
      // Have a full letter object already (from feed click)
      if (activeLetter) {
        return (
          <LetterDetail
            letter={activeLetter}
            onBack={goBackFromLetter}
            onOpenProfile={openProfile}
            me={me}
            onDeleted={() => { triggerGlobalRefresh(); goBackFromLetter(); }}
            onEdit={(l) => openEditor(null, l)}
          />
        );
      }
      // Only have an ID (came via shared URL) — load by ID
      if (urlLetterId) {
        return (
          <LetterLoader letterId={urlLetterId}>
            {(letter) => (
              <LetterDetail
                letter={letter}
                onBack={goBackFromLetter}
                onOpenProfile={openProfile}
                me={me}
                onDeleted={() => { triggerGlobalRefresh(); goBackFromLetter(); }}
                onEdit={(l) => openEditor(null, l)}
              />
            )}
          </LetterLoader>
        );
      }
    }

    if (view === 'profile') {
      return (
        <Profile
          author={activeAuthor || { id: me.id, name: `@${me.username}`, palette: me.palette }}
          onOpenLetter={openLetter}
          onBack={() => setView('shell')}
        />
      );
    }

    if (tab === 'home') return (
      <Feed
        onOpenLetter={openLetter}
        onOpenProfile={openProfile}
        onWrite={openEditor}
        me={me}
        onLetterDeleted={triggerGlobalRefresh}
        onEditLetter={(l) => openEditor(null, l)}
      />
    );
    if (tab === 'search')  return <SearchScreen onOpenLetter={openLetter} onOpenProfile={openProfile} />;
    if (tab === 'saved')   return <SavedScreen onOpenLetter={openLetter} />;
    if (tab === 'profile') return (
      <Profile
        author={{ id: me.id, name: `@${me.username}`, palette: me.palette }}
        self
        onOpenLetter={openLetter}
      />
    );
    return null;
  };

  // ── Desktop layout ─────────────────────────────────────────────────────────
  if (isDesktop && authed) {
    return (
      <ProfileGate>
        {(me) => <DesktopShell me={me} onSignOut={handleSignOut} />}
      </ProfileGate>
    );
  }

  // ── Public (unauthenticated) letter view ──────────────────────────────────
  // Shown when someone opens a shared /letter/:id link without being logged in.
  const showPublicLetter = !authed && (view === 'letter' || urlLetterId) && urlLetterId;

  return (
    <div className="ltv-shell-wrap">
      {toast && <Toast message={toast.message} color={toast.color} />}
      <div className="ltv-shell">
        {showPublicLetter ? (
          <div className="ltv-screen">
            <LetterLoader letterId={urlLetterId}>
              {(letter) => (
                <LetterDetail
                  letter={letter}
                  onBack={() => { pushRootUrl(); setUrlLetterId(null); setView('shell'); }}
                  onOpenProfile={() => openLogin('signup')}
                  me={null}
                  publicView
                  onSignIn={openLogin}
                />
              )}
            </LetterLoader>
          </div>
        ) : !authed ? (
          <div className="ltv-screen">
            <Onboarding onSignIn={openLogin} onOpenLetter={openLetter} />
          </div>
        ) : (
          <ProfileGate>
            {(me) => (
              <>
                {view === 'shell' && (
                  <TopBar tab={tab} onBell={() => setView('notifications')} onSignOut={handleSignOut} />
                )}
                <div className="ltv-screen" ref={screenRef} style={{ position: 'relative' }}>
                  <PullIndicator progress={pullProgress} refreshing={pullRefreshing} />
                  {authedScreen(me)}
                </div>
                <BottomNav
                  tab={view === 'shell' ? tab : null}
                  onTab={handleTabChange}
                  onWrite={() => openEditor(null)}
                />
                {editorOpen && (
                  <Editor
                    initialPrompt={editorPrompt}
                    initialLetter={editorLetter}
                    onClose={() => { setEditorOpen(false); setEditorPrompt(null); setEditorLetter(null); }}
                    onSubmit={handlePublished}
                  />
                )}
              </>
            )}
          </ProfileGate>
        )}
      </div>

      {loginOpen && (
        <LoginModal
          initialMode={loginMode}
          onClose={() => setLoginOpen(false)}
          onAuth={handleAuth}
        />
      )}
    </div>
  );
}
