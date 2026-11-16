import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/bricolage-grotesque/latin-400.css';
import '@fontsource/bricolage-grotesque/latin-600.css';
import '@fontsource/bricolage-grotesque/latin-800.css';
import '@fontsource/anton/latin-400.css';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import './v2/theme.css';
import { App } from './v2/App';
import { V2SettingsProvider } from './v2/settings';
import './v2/update';
import { ErrorBoundary } from './v2/ErrorBoundary';

// After an update, an old page can ask for a file that no longer exists: reload once to pick up the new version.
window.addEventListener('vite:preloadError', () => {
  try {
    if (sessionStorage.getItem('reloadedForUpdate')) return;
    sessionStorage.setItem('reloadedForUpdate', '1');
  } catch {
    /* ignore */
  }
  location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <V2SettingsProvider>
        <App />
      </V2SettingsProvider>
    </ErrorBoundary>
  </StrictMode>,
);
