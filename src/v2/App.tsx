import { useState } from 'react';
import { useRoute, navigate } from '../router';
import { useV2 } from './settings';
import { PlayScreen } from './play/PlayScreen';
import { SettingsPage } from './screens/SettingsPage';
import { ChartPage } from './screens/ChartPage';
import { Welcome } from './screens/Welcome';
import { StatsPage } from './screens/StatsPage';
import { lazy, Suspense } from 'react';
import { Emblem } from './icons';
import { applyUpdateIfReady } from './update';
const CoachPage = lazy(() => import('./screens/CoachPage').then((m) => ({ default: m.CoachPage })));

const SEEN = 'elPrimoHomeSeen';
const seenThisVisit = () => {
  try {
    return sessionStorage.getItem(SEEN) === '1';
  } catch {
    return false;
  }
};

export function App() {
  const path = useRoute();
  const [seen, setSeen] = useState(seenThisVisit);
  const markSeen = () => {
    try {
      sessionStorage.setItem(SEEN, '1');
    } catch {
      /* ignore */
    }
    setSeen(true);
  };
  const { s, loaded } = useV2();
  if (!loaded)
    return (
      <div className="splash" aria-label="Loading">
        <Emblem height={56} />
      </div>
    );
  // The front door: every time the app opens (once per visit), and any time from the logo on the felt.
  if (path === '/home' || (path === '/' && (!s.onboarded || !seen)))
    return (
      <Welcome
        onEnter={() => {
          markSeen();
          if (path === '/home') navigate('/');
          // no hand is in play at the front door: the safe moment to switch to a new version
          applyUpdateIfReady();
        }}
      />
    );
  if (path === '/settings') return <SettingsPage />;
  if (path === '/chart') return <ChartPage />;
  if (path === '/stats') return <StatsPage />;
  if (path.split('?')[0] === '/coach')
    return (
      <Suspense fallback={null}>
        <CoachPage />
      </Suspense>
    );
  return <PlayScreen />;
}
