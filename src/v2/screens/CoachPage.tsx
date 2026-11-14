import { useEffect, useRef, useState } from 'react';
import { useV2 } from '../settings';
import { askCoach, contextNote, CoachError, type ChatTurn } from '../coach/ai';
import { loadStats, type V2Stats } from '../stats';
import { kvGet, kvSet } from '../../store/db';
import { Sun } from '../icons';

const STARTERS = ['Quiz me on the hands I miss', 'Explain the true count like I’m new', 'When should I raise my bet?', 'Why do I keep missing soft 18?'];

/** Key gate: the chat appears only once a Claude API key is saved on this device. */
export function KeyGate() {
  const { set } = useV2();
  const [k, setK] = useState('');
  return (
    <div className="group" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="display" style={{ fontSize: 24 }}>
        Unlock the coach <span className="serif">chat</span>
      </div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4 }}>
        Ask about any hand, get quizzed on your leaks, talk through the count. It runs on Claude with your own API key. The key stays on this phone and is only sent to Anthropic.
      </p>
      <input
        type="password"
        placeholder="sk-ant-…"
        value={k}
        onChange={(e) => setK(e.target.value)}
        aria-label="Claude API key"
        style={{ border: '2px solid var(--ink)', borderRadius: 10, padding: '10px 12px', background: 'var(--paper)', fontFamily: 'var(--mono)' }}
      />
      <button className="act stand" disabled={!k.trim().startsWith('sk-')} onClick={() => set({ apiKey: k.trim() })}>
        Save key
      </button>
    </div>
  );
}

export function CoachPage() {
  const { s } = useV2();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState(() => new URLSearchParams(location.hash.split('?')[1] ?? '').get('q') ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const stats = useRef<V2Stats | null>(null);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStats().then((x) => (stats.current = x));
    kvGet<ChatTurn[]>('v2chat').then((t) => t && setTurns(t));
    return () => abort.current?.abort();
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [turns]);

  const send = async (q: string) => {
    if (!s.apiKey || !q.trim() || busy) return;
    setErr('');
    const history: ChatTurn[] = [...turns, { role: 'user', text: q.trim() }];
    setTurns([...history, { role: 'assistant', text: '' }]);
    setDraft('');
    setBusy(true);
    abort.current = new AbortController();
    try {
      const reply = await askCoach(s.apiKey, history.slice(-20), contextNote(s, stats.current), (t) => setTurns([...history, { role: 'assistant', text: t }]), abort.current.signal);
      const done = [...history, { role: 'assistant' as const, text: reply }];
      setTurns(done);
      kvSet('v2chat', done.slice(-40));
    } catch (e) {
      setTurns(history);
      setErr(e instanceof CoachError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="frame">
      <header className="hud">
        <a className="pill" href="#/">
          ← Table
        </a>
        <span className="spacer" />
        {turns.length > 0 && (
          <button className="pill" onClick={() => (setTurns([]), kvSet('v2chat', []))}>
            New chat
          </button>
        )}
      </header>
      <div className="page" style={{ flex: 1 }}>
        <h1>
          Ask the <span className="serif" style={{ fontSize: 36 }}>coach</span>
        </h1>
        {!s.apiKey ? (
          <KeyGate />
        ) : (
          <>
            {turns.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Sun size={36} color="var(--coral)" />
                  <p style={{ margin: 0 }}>The coach knows your record, your leaks and your last few hands.</p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {STARTERS.map((q) => (
                    <button key={q} className="pill" onClick={() => send(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-live="polite">
              {turns.map((t, i) => (
                <div
                  key={i}
                  className="coach"
                  style={{
                    alignSelf: t.role === 'user' ? 'flex-end' : 'stretch',
                    background: t.role === 'user' ? 'var(--mustard)' : 'var(--paper)',
                    maxWidth: t.role === 'user' ? '85%' : undefined,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <p>{t.text || (busy ? '…' : '')}</p>
                </div>
              ))}
              {err && <p className="bad">{err}</p>}
              <div ref={end} />
            </div>
          </>
        )}
      </div>
      {s.apiKey && (
        <form
          className="dock"
          style={{ minHeight: 0, flex: 'none', flexDirection: 'row', position: 'sticky', bottom: 0, background: 'var(--page)' }}
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about a hand, the count, your bets…"
            aria-label="Message the coach"
            style={{ flex: 1, border: '2.5px solid var(--ink)', borderRadius: 12, padding: '12px 14px', background: 'var(--paper)', boxShadow: 'var(--shadow)' }}
          />
          <button className="act stand" style={{ minHeight: 48, padding: '0 16px' }} disabled={busy || !draft.trim()}>
            Ask
          </button>
        </form>
      )}
    </div>
  );
}
