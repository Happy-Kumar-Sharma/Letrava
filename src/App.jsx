import React, { useEffect, useRef, useState } from 'react';
import { TopBar, BottomNav, SearchScreen, SavedScreen } from './components/MobileChrome.jsx';
import { Onboarding } from './components/Onboarding.jsx';
import { Feed } from './components/Feed.jsx';
import { LetterDetail } from './components/LetterDetail.jsx';
import { Profile } from './components/Profile.jsx';
import { Editor } from './components/Editor.jsx';
import { LoginModal } from './components/LoginModal.jsx';
import { ProfileGate } from './components/ProfileGate.jsx';
import { refreshAccessToken, setOnUnauthorized, authSignout } from './lib/api.js';

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

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState('home');
  const [activeLetter, setActiveLetter] = useState(null);
  const [activeAuthor, setActiveAuthor] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState('signup');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorPrompt, setEditorPrompt] = useState(null);
  const [feedTick, setFeedTick] = useState(0);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (message, color) => {
    clearTimeout(toastTimer.current);
    setToast({ message, color });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    setOnUnauthorized(() => {
      setAuthed(false);
      setView('shell');
      setTab('home');
    });
    refreshAccessToken().then((token) => {
      setAuthed(!!token);
      setAuthChecked(true);
    });
    return () => clearTimeout(toastTimer.current);
  }, []);

  const [view, setView] = useState('shell');

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
    setAuthed(false);
    setView('shell');
    setTab('home');
    setActiveLetter(null);
    setActiveAuthor(null);
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

  const openEditor = (prompt = null) => {
    setEditorPrompt(prompt);
    setEditorOpen(true);
  };

  const handlePublished = () => {
    setEditorOpen(false);
    setEditorPrompt(null);
    setFeedTick((n) => n + 1);
    setTab('home');
  };

  const handleTabChange = (next) => {
    setTab(next);
    setView('shell');
    setActiveLetter(null);
    setActiveAuthor(null);
  };

  const authedScreen = (me) => {
    if (view === 'letter' && activeLetter) {
      return (
        <LetterDetail letter={activeLetter} onBack={() => setView('shell')} onOpenProfile={openProfile} />
      );
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
    if (tab === 'home') return <Feed key={feedTick} onOpenLetter={openLetter} onOpenProfile={openProfile} onWrite={openEditor} />;
    if (tab === 'search') return <SearchScreen onOpenLetter={openLetter} onOpenProfile={openProfile} />;
    if (tab === 'saved') return <SavedScreen onOpenLetter={openLetter} />;
    if (tab === 'profile') {
      return (
        <Profile
          author={{ id: me.id, name: `@${me.username}`, palette: me.palette }}
          self
          onOpenLetter={openLetter}
        />
      );
    }
    return null;
  };

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
                  <TopBar tab={tab} onBell={() => {}} onSignOut={handleSignOut} />
                )}
                <div className="ltv-screen">{authedScreen(me)}</div>
                <BottomNav
                  tab={view === 'shell' ? tab : null}
                  onTab={handleTabChange}
                  onWrite={() => openEditor(null)}
                />
                {editorOpen && (
                  <Editor
                    initialPrompt={editorPrompt}
                    onClose={() => { setEditorOpen(false); setEditorPrompt(null); }}
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
