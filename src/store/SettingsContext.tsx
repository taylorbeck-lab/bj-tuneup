import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { kvGet, kvSet } from './db';
import { DEFAULT_SETTINGS, mergeSettings, type Settings } from './settings';

interface Ctx {
  settings: Settings;
  update: (patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) => void;
  loaded: boolean;
}

const SettingsCtx = createContext<Ctx>({ settings: DEFAULT_SETTINGS, update: () => {}, loaded: false });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    kvGet<Settings>('settings').then((s) => {
      setSettings(mergeSettings(s));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.classList.toggle('four-color', settings.fourColor);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', settings.theme === 'dark' ? '#0d0d0d' : '#f2f0eb');
  }, [settings.theme, settings.fourColor]);

  const update = useCallback<Ctx['update']>((patch) => {
    setSettings((prev) => {
      const p = typeof patch === 'function' ? patch(prev) : patch;
      const next = mergeSettings({ ...prev, ...p });
      kvSet('settings', next);
      return next;
    });
  }, []);

  return <SettingsCtx.Provider value={{ settings, update, loaded }}>{children}</SettingsCtx.Provider>;
}

export const useSettings = () => useContext(SettingsCtx);
