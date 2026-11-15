import { useRoute } from '../router';
import { useV2 } from './settings';
import { PlayScreen } from './play/PlayScreen';
import { SettingsPage } from './screens/SettingsPage';
import { ChartPage } from './screens/ChartPage';
import { Welcome } from './screens/Welcome';
import { StatsPage } from './screens/StatsPage';
import { lazy, Suspense } from 'react';
import { Emblem } from './icons';
const CoachPage = lazy(() => import('./screens/CoachPage').then((m) => ({ default: m.CoachPage })));

export function App() {
  const path = useRoute();
  const { s, loaded } = useV2();
  if (!loaded)
    return (
      <div className="splash" aria-label="Loading">
        <Emblem height={56} />
      </div>
    );
  if (!s.onboarded) return <Welcome />;
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
