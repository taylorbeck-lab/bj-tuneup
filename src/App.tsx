import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { useRoute } from './router';
import { useSettings } from './store/SettingsContext';
import { setHaptics } from './ui/haptics';
import { Home } from './screens/Home';
import { Onboarding } from './screens/Onboarding';
import { TopBar } from './ui/components';

/** Lazy-load a named export: each screen is its own chunk (all precached for offline use). */
function L<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M, props?: Record<string, unknown>): ComponentType {
  const C = lazy(async () => {
    const m = await load();
    const Comp = m[name] as ComponentType<Record<string, unknown>>;
    return { default: () => <Comp {...(props ?? {})} /> };
  });
  return C;
}

const drills = () => import('./screens/drills/DrillsMenu');
const ROUTES: Record<string, ComponentType> = {
  '/rules': L(() => import('./screens/RulesScreen'), 'RulesScreen'),
  '/settings': L(() => import('./screens/SettingsScreen'), 'SettingsScreen'),
  '/about': L(() => import('./screens/AboutScreen'), 'AboutScreen'),
  '/design': L(() => import('./screens/DesignScreen'), 'DesignScreen'),
  '/strategy': L(() => import('./screens/StrategyScreen'), 'StrategyScreen'),
  '/drills': L(drills, 'DrillsMenu'),
  '/drills/countdown': L(() => import('./screens/drills/Countdown'), 'Countdown'),
  '/drills/running': L(() => import('./screens/drills/RunningCount'), 'RunningCount', { mode: 'rc' }),
  '/drills/acecount': L(() => import('./screens/drills/RunningCount'), 'RunningCount', { mode: 'ace' }),
  '/drills/keycard': L(() => import('./screens/drills/RunningCount'), 'RunningCount', { mode: 'key' }),
  '/drills/discard': L(() => import('./screens/drills/TrayDrills'), 'DiscardDrill'),
  '/drills/truecount': L(() => import('./screens/drills/TrayDrills'), 'TrueCountDrill'),
  '/drills/bs': L(() => import('./screens/drills/FlashDrills'), 'BsFlash'),
  '/drills/dev': L(() => import('./screens/drills/FlashDrills'), 'DevFlash'),
  '/drills/bet': L(() => import('./screens/drills/BetDrill'), 'BetDrill'),
  '/sim': L(() => import('./screens/sim/SimScreen'), 'SimScreen'),
  '/tuneup': L(() => import('./screens/TuneUpScreen'), 'TuneUpScreen'),
  '/stats': L(() => import('./screens/StatsScreen'), 'StatsScreen'),
  '/analyzer': L(() => import('./screens/AnalyzerScreen'), 'AnalyzerScreen'),
  '/indices': L(() => import('./screens/IndicesScreen'), 'IndicesScreen'),
  '/feel': L(() => import('./screens/FeelLabScreen'), 'FeelLabScreen'),
  '/review': L(() => import('./screens/ReviewScreen'), 'ReviewList'),
  '/strike': L(() => import('./screens/StrikeScreen'), 'StrikeScreen'),
  '/sidebets': L(() => import('./screens/SideBetScreen'), 'SideBetScreen'),
};
const ReviewDetail = lazy(() => import('./screens/ReviewScreen').then((m) => ({ default: m.ReviewDetail })));

/** Paths that have a real screen (used by Home to label modes). */
export const READY: Record<string, boolean> = Object.fromEntries(Object.keys(ROUTES).map((k) => [k, true]));

function NotFound({ path }: { path: string }) {
  return (
    <>
      <TopBar title="Not found" />
      <main className="stack">
        <p className="muted mono">{path}</p>
        <a className="btn" href="#/">
          Home
        </a>
      </main>
    </>
  );
}

const Loading = () => (
  <main className="stack" aria-busy="true">
    <p className="mono muted">Loading…</p>
  </main>
);

export function App() {
  const path = useRoute();
  const { settings, loaded } = useSettings();
  useEffect(() => setHaptics(settings.haptics), [settings.haptics]);
  if (loaded && !settings.onboarded)
    return (
      <div className="app">
        <Onboarding />
      </div>
    );
  const base = '/' + (path.split('/')[1] ?? '');
  let content;
  if (path.startsWith('/review/')) content = <ReviewDetail key={path} id={path.slice(8)} />;
  else if (path === '/') content = <Home ready={READY} />;
  else {
    const S = ROUTES[path] ?? ROUTES[base];
    content = S ? <S key={path} /> : <NotFound path={path} />;
  }
  return (
    <div className="app">
      <Suspense fallback={<Loading />}>{content}</Suspense>
    </div>
  );
}
