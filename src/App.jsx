import React, { useEffect, useState } from 'react';
import { TopBar, BottomNav, SearchScreen, SavedScreen } from './components/MobileChrome.jsx';
import { Onboarding } from './components/Onboarding.jsx';
import { Feed } from './components/Feed.jsx';
import { LetterDetail } from './components/LetterDetail.jsx';
import { Profile } from './components/Profile.jsx';
import { Editor } from './components/Editor.jsx';
import { LoginModal } from './components/LoginModal.jsx';
import { ProfileGate } from './components/ProfileGate.jsx';
import { refreshAccessToken, setOnUnauthorized, authSignout } from './lib/api.js';

export default function App() {
  const [authed, setAuthed] = useState(false);
  // Prevents flash of the unauthenticated screen while the initial refresh call is in flight.
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState('home');
  const [activeLetter, setActiveLetter] = useState(null);
  const [activeAuthor, setActiveAuthor] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [view, setView] = useState('shell');
  const [feedTick, setFeedTick] = useState(0);

  useEffect(() => {
    // If the refresh token cookie exists and is valid, this restores the session
    // silently on every page load/reload without any user interaction.
    setOnUnauthorized(() => {
      setAuthed(false);
      setView('shell');
      setTab('home');
    });

    refreshAccessToken().then((token) => {
      setAuthed(!!token);
      setAuthChecked(true);
    });
  }, []);

  // Don't render until we know auth state — avoids briefly showing the onboarding screen.
  if (!authChecked) return null;

  const handleAuth = () => {
    setAuthed(true);
    setLoginOpen(false);
    setView('shell');
    setTab('home');
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
    if (!authed) { setLoginOpen(true); return; }
    setActiveLetter(l);
    setView('letter');
  };

  const openProfile = (a) => {
    if (!authed) { setLoginOpen(true); return; }
    setActiveAuthor(a);
    setView('profile');
  };

  const handlePublished = () => {
    setEditorOpen(false);
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
        <LetterDetail
          letter={activeLetter}
          onBack={() => setView('shell')}
          onOpenProfile={openProfile}
        />
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
    if (tab === 'home') return <Feed key={feedTick} onOpenLetter={openLetter} onOpenProfile={openProfile} />;
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
      <div className="ltv-shell">
        {!authed && (
          <div className="ltv-screen">
            <Onboarding onSignIn={() => setLoginOpen(true)} onOpenLetter={openLetter} />
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
                  onWrite={() => setEditorOpen(true)}
                />
                {editorOpen && (
                  <Editor onClose={() => setEditorOpen(false)} onSubmit={handlePublished} />
                )}
              </>
            )}
          </ProfileGate>
        )}
      </div>

      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} onAuth={handleAuth} />}
    </div>
  );
}
