import { registerSW } from 'virtual:pwa-register';

/**
 * App updates never interrupt a game. A new version downloads quietly in the background and waits;
 * it's put in place at the front door (when you tap Deal me in or pick a mode), or the next time the
 * app is opened from scratch. Never mid-hand.
 */
let ready = false;
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    ready = true;
  },
});

/** If a new version is waiting, switch to it now (reloads the page). Returns true if it did. */
export function applyUpdateIfReady(): boolean {
  if (!ready) return false;
  ready = false;
  void updateSW(true);
  return true;
}
