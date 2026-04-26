import React, { useState } from 'react';
import { TopBar, BottomNav, SearchScreen, SavedScreen } from './components/MobileChrome.jsx';
import { Onboarding } from './components/Onboarding.jsx';
import { Feed } from './components/Feed.jsx';
import { LetterDetail } from './components/LetterDetail.jsx';
import { Profile } from './components/Profile.jsx';
import { Editor } from './components/Editor.jsx';
import { LoginModal } from './components/LoginModal.jsx';

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('home');
  const [activeLetter, setActiveLetter] = useState(null);
  const [activeAuthor, setActiveAuthor] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [view, setView] = useState('shell');

  const openLetter = (l) => {
    if (!authed) {
      setLoginOpen(true);
      return;
    }
    setActiveLetter(l);
    setView('letter');
  };

  const openProfile = (a) => {
    if (!authed) {
      setLoginOpen(true);
      return;
    }
    setActiveAuthor(a);
    setView('profile');
  };

  const handleAuth = () => {
    setAuthed(true);
    setLoginOpen(false);
    setView('shell');
    setTab('home');
  };

  let screen;
  if (!authed) {
    screen = <Onboarding onSignIn={() => setLoginOpen(true)} onOpenLetter={openLetter} />;
  } else if (view === 'letter' && activeLetter) {
    screen = (
      <LetterDetail
        letter={activeLetter}
        onBack={() => setView('shell')}
        onOpenProfile={openProfile}
      />
    );
  } else if (view === 'profile') {
    screen = (
      <Profile
        author={activeAuthor || { name: '@hannah_writes', palette: 'indigo' }}
        onOpenLetter={openLetter}
        onBack={() => setView('shell')}
      />
    );
  } else if (tab === 'home') {
    screen = <Feed onOpenLetter={openLetter} onOpenProfile={openProfile} />;
  } else if (tab === 'search') {
    screen = <SearchScreen onOpenLetter={openLetter} onOpenProfile={openProfile} />;
  } else if (tab === 'saved') {
    screen = <SavedScreen onOpenLetter={openLetter} />;
  } else if (tab === 'profile') {
    screen = (
      <Profile
        author={{ name: '@hannah_writes', palette: 'indigo' }}
        self
        onOpenLetter={openLetter}
      />
    );
  }

  return (
    <div className="ltv-shell-wrap">
      <aside className="desktop-context" aria-hidden="true">
        <div
          style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: 18,
            color: '#111827',
            marginBottom: 6,
          }}
        >
          Letrava
        </div>
        <div>
          A mobile-first social platform for letters. The web view mirrors the phone — narrow column, bottom nav, FAB.
          Designed to port to native without redesign.
        </div>
      </aside>

      <div className="ltv-shell">
        {authed && view === 'shell' && <TopBar tab={tab} onBell={() => {}} />}
        <div className="ltv-screen">{screen}</div>
        {authed && view === 'shell' && (
          <BottomNav tab={tab} onTab={setTab} onWrite={() => setEditorOpen(true)} />
        )}
        {editorOpen && <Editor onClose={() => setEditorOpen(false)} onSubmit={() => setEditorOpen(false)} />}
      </div>

      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} onAuth={handleAuth} />}
    </div>
  );
}