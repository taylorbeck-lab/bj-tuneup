import { useEffect, type ReactElement } from 'react';
import { useRoute } from './router';
import { useSettings } from './store/SettingsContext';
import { setHaptics } from './ui/haptics';
import { Home } from './screens/Home';
import { RulesScreen } from './screens/RulesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AboutScreen } from './screens/AboutScreen';
import { DesignScreen } from './screens/DesignScreen';
import { StrategyScreen } from './screens/StrategyScreen';
import { TopBar } from './ui/components';

type Screen = () => ReactElement;
const ROUTES: Record<string, Screen> = {
  '/rules': RulesScreen,
  '/settings': SettingsScreen,
  '/about': AboutScreen,
  '/design': DesignScreen,
  '/strategy': StrategyScreen,
};

/** Paths that have a real screen (used by Home to label modes). */
export const READY: Record<string, boolean> = Object.fromEntries(Object.keys(ROUTES).map((k) => [k, true]));

function NotYet({ path }: { path: string }) {
  return (
    <>
      <TopBar title="Soon" />
      <main className="stack">
        <h2 className="h2">Not built yet</h2>
        <p className="muted mono">{path}</p>
        <p>This mode arrives in a later milestone. See docs/PROGRESS.md.</p>
      </main>
    </>
  );
}

export function App() {
  const path = useRoute();
  const { settings } = useSettings();
  useEffect(() => setHaptics(settings.haptics), [settings.haptics]);
  const base = '/' + (path.split('/')[1] ?? '');
  const S = ROUTES[path] ?? ROUTES[base];
  return <div className="app">{path === '/' ? <Home ready={READY} /> : S ? <S /> : <NotYet path={path} />}</div>;
}
