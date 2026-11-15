import { Component, type ReactNode } from 'react';

/** Clear this app's saved data and offline cache (what a private window starts with), then reload. */
export async function startFresh(): Promise<void> {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* ignore */
  }
  try {
    const keys = (await caches?.keys?.()) ?? [];
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    /* ignore */
  }
  try {
    await new Promise<void>((res) => {
      const r = indexedDB.deleteDatabase('tuneup');
      r.onsuccess = r.onerror = r.onblocked = () => res();
      setTimeout(res, 2000);
    });
  } catch {
    /* ignore */
  }
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
  // back to the front door, as a brand-new player
  location.replace(location.pathname);
}

/** If anything breaks while drawing, show a way out instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    const e = this.state.error;
    if (!e) return this.props.children;
    return (
      <div className="frame" style={{ justifyContent: 'center', padding: 24, gap: 14 }}>
        <h1 className="display" style={{ margin: 0, fontSize: 34 }}>
          Something went wrong
        </h1>
        <p style={{ margin: 0 }}>The table hit a snag. Reloading usually fixes it. If it doesn't, start fresh: that clears this app's saved data on this device (bankroll and stats too).</p>
        <pre className="mono" style={{ whiteSpace: 'pre-wrap', fontSize: 11, opacity: 0.7, margin: 0 }}>
          {String(e.message || e)}
        </pre>
        <button className="act primary" onClick={() => location.reload()}>
          Reload
        </button>
        <button className="act" onClick={() => void startFresh()}>
          Start fresh
        </button>
      </div>
    );
  }
}
