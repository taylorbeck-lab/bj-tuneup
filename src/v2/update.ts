import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * App updates never interrupt a game. A new version downloads quietly in the background and waits;
 * it's put in place at the front door (while it's showing, or when you tap Deal me in or pick a
 * level), or the next time the app is opened from scratch. Never mid-hand. Coming back after a while
 * away brings the front door back (see App.tsx), which is when a waiting update goes in. Settings
 * shows when this copy was built and has an Update button, for when you want it now.
 */
let ready = false;
let registration: ServiceWorkerRegistration | undefined;
const subs = new Set<() => void>();
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    ready = true;
    subs.forEach((f) => f());
  },
  onRegisteredSW(_url, r) {
    registration = r;
  },
});

/** If a new version is waiting, switch to it now (reloads the page). Returns true if it did. */
export function applyUpdateIfReady(): boolean {
  if (!ready) return false;
  ready = false;
  // Reload ourselves once the new version has taken over. (The library only reloads a page that was
  // opened under an earlier version; the very first visit, never reloaded since, would be switched in
  // the background and left showing the old screen.) If the hand-over is never announced, reload anyway.
  let reloaded = false;
  const reload = () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  };
  navigator.serviceWorker?.addEventListener('controllerchange', reload, { once: true });
  // (a page the old version never took control of gets no announcement at all: don't keep it waiting)
  setTimeout(reload, navigator.serviceWorker?.controller ? 4000 : 1500);
  void updateSW(true);
  return true;
}

/** Call `f` when a new version has finished downloading and is waiting. Returns the way to stop listening. */
export function onUpdateReady(f: () => void): () => void {
  subs.add(f);
  return () => void subs.delete(f);
}

/** Is a new version downloaded and waiting? (Re-renders when one arrives.) */
export function useUpdateReady(): boolean {
  const [r, setR] = useState(ready);
  useEffect(() => {
    setR(ready);
    return onUpdateReady(() => setR(true));
  }, []);
  return r;
}

export type UpdateCheck = 'ready' | 'downloading' | 'latest' | 'unknown';

/**
 * Look for a new version now. An app on the home screen can stay open in the background for days
 * without ever reloading, so it's asked each time you come back to it, and from Settings.
 */
export async function checkForUpdate(): Promise<UpdateCheck> {
  if (ready) return 'ready';
  if (!registration) return 'unknown';
  try {
    await registration.update();
  } catch {
    return 'unknown';
  }
  if (ready || registration.waiting) return 'ready';
  return registration.installing ? 'downloading' : 'latest';
}
