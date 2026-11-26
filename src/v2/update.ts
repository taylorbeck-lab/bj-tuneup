import { registerSW } from 'virtual:pwa-register';

/**
 * App updates never interrupt a game. A new version downloads quietly in the background and waits;
 * it's put in place at the front door (when you tap Deal me in or pick a level), or the next time the
 * app is opened from scratch. Never mid-hand. Coming back after a while away brings the front door
 * back (see App.tsx), which is when a waiting update goes in.
 */
let ready = false;
let registration: ServiceWorkerRegistration | undefined;
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    ready = true;
  },
  onRegisteredSW(_url, r) {
    registration = r;
  },
});

/**
 * Look for a new version now. An app on the home screen can stay open in the background for days
 * without ever reloading, so it's asked each time you come back to it.
 */
export function checkForUpdate(): void {
  void registration?.update().catch(() => {});
}

/** If a new version is waiting, switch to it now (reloads the page). Returns true if it did. */
export function applyUpdateIfReady(): boolean {
  if (!ready) return false;
  ready = false;
  void updateSW(true);
  return true;
}
