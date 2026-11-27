import { useEffect, useState } from 'react';
import { useRoute, navigate } from '../router';
import { useV2 } from './settings';
import { PlayScreen } from './play/PlayScreen';
import { SettingsPage } from './screens/SettingsPage';
import { ChartPage } from './screens/ChartPage';
import { Welcome } from './screens/Welcome';
import { StatsPage } from './screens/StatsPage';
import { PlanPage } from './screens/PlanPage';
import { RealPage } from './screens/RealPage';
import { lazy, Suspense } from 'react';
import { Emblem } from './icons';
import { applyUpdateIfReady, checkForUpdate } from './update';
import { loadGenerated } from '../store/strategy';
import { rulesKey } from '../engine/rules';
// (the build-time constant itself, so the chat and its SDK are left out of the bundle entirely)
const CoachPage = __AI_COACH__ ? lazy(() => import('./screens/CoachPage').then((m) => ({ default: m.CoachPage }))) : null;

const SEEN = 'elPrimoHomeSeen';
/** Away this long, and you come back to the front door. */
const AWAY_MS = 30 * 60 * 1000;
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
  // Back after a while away (an app on the home screen stays open in the background): look for a new
  // version, and after half an hour or more start again at the front door, like sitting back down.
  useEffect(() => {
    let hiddenAt = 0;
    const on = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      checkForUpdate();
      if (hiddenAt && Date.now() - hiddenAt >= AWAY_MS) {
        try {
          sessionStorage.removeItem(SEEN);
        } catch {
          /* ignore */
        }
        setSeen(false);
      }
      hiddenAt = 0;
    };
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  const { s, loaded } = useV2();
  // Work out the strategy for the rules in play as soon as the app opens (it takes a second or more the
  // first time, then it's kept on the device), so the table is ready by the time you sit down.
  const rk = rulesKey(s.rules);
  useEffect(() => {
    if (loaded) void loadGenerated(s.rules).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, rk]);
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
        // asked for by name (Settings → How it works, the logo on the felt): the cards, not just the door
        tour={path === '/home'}
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
  if (path === '/plan') return <PlanPage />;
  if (path === '/real') return <RealPage />;
  if (CoachPage && path.split('?')[0] === '/coach')
    return (
      <Suspense fallback={null}>
        <CoachPage />
      </Suspense>
    );
  return <PlayScreen />;
}
