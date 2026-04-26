import React, { useEffect, useState } from 'react';
import { TopBar, BottomNav, SearchScreen, SavedScreen } from './components/MobileChrome.jsx';
import { Onboarding } from './components/Onboarding.jsx';
import { Feed } from './components/Feed.jsx';
import { LetterDetail } from './components/LetterDetail.jsx';
import { Profile } from './components/Profile.jsx';
import { Editor } from './components/Editor.jsx';
import { LoginModal } from './components/LoginModal.jsx';
import { ProfileGate } from './components/ProfileGate.jsx';
import { supabase } from './lib/supabase.js';

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('home');
  const [activeLetter, setActiveLetter] = useState(null);
  const [activeAuthor, setActiveAuthor] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [view, setView] = useState('shell');
  // Bumping `feedTick` forces re-mount of the feed (and its useApi) so a freshly
  // published letter shows up immediately.
  const [feedTick, setFeedTick] = useState(0);

  // Single source of truth for "logged in": Supabase session presence.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) setAuthed(!!session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
      if (session) setLoginOpen(false);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

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

  const handleAuth = () => {
    setLoginOpen(false);
    setView('shell');
    setTab('home');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setView('shell');
    setTab('home');
    setActiveLetter(null);
    setActiveAuthor(null);
  };

  const handlePublished = () => {
    setEditorOpen(false);
    setFeedTick((n) => n + 1);
    setTab('home');
  };

  // Authed routing is wrapped in ProfileGate so first-time users see the
  // username prompt before they hit any sample-less feed.
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
    if (tab === 'home') {
      return <Feed key={feedTick} onOpenLetter={openLetter} onOpenProfile={openProfile} />;
    }
    if (tab === 'search') {
      return <SearchScreen onOpenLetter={openLetter} onOpenProfile={openProfile} />;
    }
    if (tab === 'saved') {
      return <SavedScreen onOpenLetter={openLetter} />;
    }
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
          <>
            <div className="ltv-screen">
              <Onboarding onSignIn={() => setLoginOpen(true)} onOpenLetter={openLetter} />
            </div>
          </>
        )}

        {authed && (
          <ProfileGate>
            {(me) => (
              <>
                {view === 'shell' && (
                  <TopBar tab={tab} onBell={() => {}} onSignOut={handleSignOut} />
                )}
                <div className="ltv-screen">{authedScreen(me)}</div>
                {view === 'shell' && (
                  <BottomNav tab={tab} onTab={setTab} onWrite={() => setEditorOpen(true)} />
                )}
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
