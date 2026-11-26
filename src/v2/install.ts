import { useEffect, useState } from 'react';

/**
 * Putting the app on the home screen. Android (Chrome) hands us an install prompt to show when we
 * like; an iPhone never prompts, so we say where the button is (Share, then Add to Home Screen), and
 * that only works in Safari: a link opened inside another app (Messages previews, Instagram, Chrome on
 * iPhone before iOS 16.4) has to be opened in Safari first.
 */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    listeners.forEach((f) => f());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((f) => f());
  });
}

export type InstallHow = 'installed' | 'prompt' | 'ios' | 'ios-other' | 'none';

export function installHow(ua: string, standalone: boolean, hasPrompt: boolean, touchPoints = 0): InstallHow {
  if (standalone) return 'installed';
  if (hasPrompt) return 'prompt';
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);
  if (!ios) return 'none';
  // on an iPhone only Safari itself can add to the home screen
  const other = /CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line\/|Snapchat|GSA\//.test(ua);
  return other ? 'ios-other' : 'ios';
}

const standaloneNow = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

export function useInstall(): { how: InstallHow; install: () => Promise<void> } {
  const [, bump] = useState(0);
  useEffect(() => {
    const f = () => bump((n) => n + 1);
    listeners.add(f);
    return () => void listeners.delete(f);
  }, []);
  const how = typeof navigator === 'undefined' ? 'none' : installHow(navigator.userAgent, standaloneNow(), !!deferred, navigator.maxTouchPoints);
  return {
    how,
    install: async () => {
      if (!deferred) return;
      const d = deferred;
      deferred = null;
      await d.prompt();
      await d.userChoice.catch(() => null);
      bump((n) => n + 1);
    },
  };
}

/** How to add the app to the home screen on this device, in a line (null when there's nothing to say). */
export function installLine(how: InstallHow): string | null {
  if (how === 'ios') return 'Tap Share (the square with the arrow), then “Add to Home Screen”.';
  if (how === 'ios-other') return 'Open this page in Safari, then tap Share and “Add to Home Screen”.';
  if (how === 'prompt') return 'It opens full screen, like any app, and works with no signal.';
  return null;
}
