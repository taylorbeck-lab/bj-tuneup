import { useRoute } from '../router';
import { useV2 } from './settings';
import { TableScreen } from './table/TableScreen';
import { SettingsPage } from './screens/SettingsPage';
import { ChartPage } from './screens/ChartPage';
import { Welcome } from './screens/Welcome';

export function App() {
  const path = useRoute();
  const { s, loaded } = useV2();
  if (!loaded) return null;
  if (!s.onboarded) return <Welcome />;
  if (path === '/settings') return <SettingsPage />;
  if (path === '/chart') return <ChartPage />;
  return <TableScreen />;
}
