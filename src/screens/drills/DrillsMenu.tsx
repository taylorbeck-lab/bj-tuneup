import { useEffect, useState } from 'react';
import { TopBar } from '../../ui/components';
import { listSessions, type SessionRecord } from '../../store/sessions';

export const DRILLS = [
  { id: 'countdown', kind: 'drill:countdown', title: 'Deck countdown', sub: 'One deck, as fast as you can' },
  { id: 'running', kind: 'drill:running', title: 'Running count', sub: 'Game-speed rounds, random checkpoints' },
  { id: 'discard', kind: 'drill:discard', title: 'Discard estimation', sub: 'Read the tray to the quarter deck' },
  { id: 'truecount', kind: 'drill:truecount', title: 'True count', sub: 'Running count + tray → TC' },
  { id: 'bs', kind: 'drill:bs', title: 'Basic strategy flash', sub: 'Weighted to your misses' },
  { id: 'dev', kind: 'drill:dev', title: 'Deviations flash', sub: 'Index plays and insurance, near the index' },
  { id: 'bet', kind: 'drill:bet', title: 'Bet sizing', sub: 'Your ramp, or half Kelly' },
  { id: 'acecount', kind: 'drill:acecount', title: 'Ace side count', sub: 'Aces unseen at checkpoints' },
  { id: 'keycard', kind: 'drill:keycard', title: 'Key cards', sub: '“Has the K♠ come out?”' },
] as const;

export function DrillsMenu() {
  const [last, setLast] = useState<Record<string, SessionRecord>>({});
  useEffect(() => {
    listSessions('drill').then((all) => {
      const m: Record<string, SessionRecord> = {};
      for (const s of all) {
        const base = s.kind.startsWith('drill:bet') ? 'drill:bet' : s.kind;
        if (!m[base]) m[base] = s;
      }
      setLast(m);
    });
  }, []);
  return (
    <>
      <TopBar title="Drills" />
      <main>
        <nav className="menu" aria-label="Drills">
          {DRILLS.map((d) => {
            const s = last[d.kind];
            return (
              <a key={d.id} href={`#/drills/${d.id}`}>
                <div>
                  <div className="title">{d.title}</div>
                  <div className="sub">{d.sub}</div>
                </div>
                <span className="num">{s ? `${Math.round(s.accuracy * 100)}%` : '—'}</span>
              </a>
            );
          })}
        </nav>
      </main>
    </>
  );
}
