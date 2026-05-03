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
import { getJSON, setOnUnauthorized, authSignout, triggerGlobalRefresh } from './lib/api.js';

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

export default function App() {
  const [authed, setAuthed]         = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab]               = useState('home');
  const [activeLetter, setActiveLetter] = useState(null);
  const [activeAuthor, setActiveAuthor] = useState(null);
  const [loginOpen, setLoginOpen]   = useState(false);
  const [loginMode, setLoginMode]   = useState('signup');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorPrompt, setEditorPrompt] = useState(null);
  const [editorLetter, setEditorLetter] = useState(null);
  const [feedTick, setFeedTick]     = useState(0);
  const [toast, setToast]           = useState(null);
  const [isDesktop, setIsDesktop]   = useState(() => window.innerWidth >= 1024);
  const [view, setView]             = useState('shell');
  const toastTimer = useRef(null);

  // Pull-to-refresh state
  const screenRef    = useRef(null);
  const ptrTouch     = useRef({ y0: 0, progress: 0 });
  const [pullProgress, setPullProgress]   = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const PTR_THRESHOLD = 72;

  const showToast = (message, color) => {
    clearTimeout(toastTimer.current);
    setToast({ message, color });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  // Responsive desktop detection
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Global toast (fired by useShare or other hooks)
  useEffect(() => {
    const handler = (e) => showToast(e.detail.message, '#16A34A');
    window.addEventListener('letrava:toast', handler);
    return () => window.removeEventListener('letrava:toast', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auth init + unauthorized callback
  useEffect(() => {
    // Only silently clear auth state — never force-open the login modal.
    // The user will see the unauthenticated UI and can sign in whenever they choose.
    // Forced logouts were causing unexpected session drops; the access token is now
    // 24 h and the refresh token 1 year, so this callback fires only on genuine
    // multi-day inactivity or an explicit server-side session revocation.
    setOnUnauthorized(() => {
      setAuthed(false);
      setView('shell');
      setTab('home');
    });
    // Use the access_token cookie (Path=/api, valid 15 min) to check auth on startup.
    // If it's still valid → authed immediately, no cookie rotation needed.
    // If it's expired  → api() auto-retries after calling POST /api/auth/refresh,
    //                    so the refresh_token cookie is only sent when truly needed.
    // If both fail     → _onUnauthorized fires, then .catch sets authChecked=true.
    getJSON('/api/auth/me')
      .then(() => { setAuthed(true);  setAuthChecked(true); })
      .catch(() => { setAuthed(false); setAuthChecked(true); });
    return () => clearTimeout(toastTimer.current);
  }, []);

  // Pull-to-refresh gesture (mobile only — no-op on desktop)
  const doRefresh = useCallback(() => {
    setPullRefreshing(true);
    triggerGlobalRefresh();
    setFeedTick((n) => n + 1);
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

  const openLogin = (mode = 'signup') => {
    setLoginMode(mode);
    setLoginOpen(true);
  };

  const handleAuth = (isNew = false) => {
    setAuthed(true);
    setLoginOpen(false);
    setView('shell');
    setTab('home');
    if (isNew) showToast('✓ Account created — you\'re logged in!', '#16A34A');
  };

  const handleSignOut = async () => {
    await authSignout();
    // Clear all session state
    setAuthed(false);
    setView('shell');
    setTab('home');
    setActiveLetter(null);
    setActiveAuthor(null);
    setEditorOpen(false);
    setEditorPrompt(null);
    setFeedTick(0);
    setToast(null);
    // Redirect to sign-in
    setLoginMode('signin');
    setLoginOpen(true);
  };

  const openLetter = (l) => {
    if (!authed) { openLogin('signup'); return; }
    setActiveLetter(l);
    setView('letter');
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

  const handlePublished = (result) => {
    setEditorOpen(false);
    setEditorPrompt(null);
    setEditorLetter(null);
    setFeedTick((n) => n + 1);
    // After editing, jump back to the updated letter detail
    if (result?.id && editorLetter) {
      setActiveLetter(result);
      setView('letter');
    } else {
      setTab('home');
    }
  };

  const handleTabChange = (next) => {
    setTab(next);
    setView('shell');
    setActiveLetter(null);
    setActiveAuthor(null);
  };

  const authedScreen = (me) => {
    if (view === 'notifications') {
      return <NotificationsScreen onBack={() => setView('shell')} />;
    }
    if (view === 'letter' && activeLetter) {
      return <LetterDetail
        letter={activeLetter}
        onBack={() => setView('shell')}
        onOpenProfile={openProfile}
        me={me}
        onDeleted={() => { setFeedTick((n) => n + 1); setView('shell'); }}
        onEdit={(l) => openEditor(null, l)}
      />;
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
    if (tab === 'home')    return <Feed key={feedTick} onOpenLetter={openLetter} onOpenProfile={openProfile} onWrite={openEditor} me={me} onLetterDeleted={() => setFeedTick((n) => n + 1)} onEditLetter={(l) => openEditor(null, l)} />;
    if (tab === 'search')  return <SearchScreen onOpenLetter={openLetter} onOpenProfile={openProfile} />;
    if (tab === 'saved')   return <SavedScreen onOpenLetter={openLetter} />;
    if (tab === 'profile') return <Profile author={{ id: me.id, name: `@${me.username}`, palette: me.palette }} self onOpenLetter={openLetter} />;
    return null;
  };

  // Desktop layout — authenticated only
  if (isDesktop && authed) {
    return (
      <ProfileGate>
        {(me) => <DesktopShell me={me} onSignOut={handleSignOut} />}
      </ProfileGate>
    );
  }

  return (
    <div className="ltv-shell-wrap">
      {toast && <Toast message={toast.message} color={toast.color} />}
      <div className="ltv-shell">
        {!authed && (
          <div className="ltv-screen">
            <Onboarding onSignIn={openLogin} onOpenLetter={openLetter} />
          </div>
        )}

        {authed && (
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
