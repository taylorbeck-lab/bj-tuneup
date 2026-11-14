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
import { DrillsMenu } from './screens/drills/DrillsMenu';
import { Countdown } from './screens/drills/Countdown';
import { RunningCount } from './screens/drills/RunningCount';
import { DiscardDrill, TrueCountDrill } from './screens/drills/TrayDrills';
import { BsFlash, DevFlash } from './screens/drills/FlashDrills';
import { BetDrill } from './screens/drills/BetDrill';
import { SimScreen } from './screens/sim/SimScreen';
import { TuneUpScreen } from './screens/TuneUpScreen';
import { StatsScreen } from './screens/StatsScreen';
import { AnalyzerScreen } from './screens/AnalyzerScreen';
import { IndicesScreen } from './screens/IndicesScreen';
import { FeelLabScreen } from './screens/FeelLabScreen';
import { ReviewList, ReviewDetail } from './screens/ReviewScreen';
import { StrikeScreen } from './screens/StrikeScreen';
import { SideBetScreen } from './screens/SideBetScreen';
import { TopBar } from './ui/components';

type Screen = () => ReactElement | null;
const ROUTES: Record<string, Screen> = {
  '/rules': RulesScreen,
  '/settings': SettingsScreen,
  '/about': AboutScreen,
  '/design': DesignScreen,
  '/strategy': StrategyScreen,
  '/drills': DrillsMenu,
  '/drills/countdown': () => <Countdown />,
  '/drills/running': () => <RunningCount mode="rc" />,
  '/drills/acecount': () => <RunningCount mode="ace" />,
  '/drills/keycard': () => <RunningCount mode="key" />,
  '/drills/discard': DiscardDrill,
  '/drills/truecount': () => <TrueCountDrill />,
  '/drills/bs': () => <BsFlash />,
  '/drills/dev': () => <DevFlash />,
  '/drills/bet': BetDrill,
  '/sim': SimScreen,
  '/tuneup': TuneUpScreen,
  '/stats': StatsScreen,
  '/analyzer': AnalyzerScreen,
  '/indices': IndicesScreen,
  '/feel': FeelLabScreen,
  '/review': ReviewList,
  '/strike': StrikeScreen,
  '/sidebets': SideBetScreen,
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
  if (path.startsWith('/review/')) return <div className="app"><ReviewDetail key={path} id={path.slice(8)} /></div>;
  const S = ROUTES[path] ?? ROUTES[base];
  // key by path so navigating between drills remounts state
  return <div className="app">{path === '/' ? <Home ready={READY} /> : S ? <S key={path} /> : <NotYet path={path} />}</div>;
}
