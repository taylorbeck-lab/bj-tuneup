import type { Handlers } from './handlers';

type Fn = keyof Handlers;
type Ret<F extends Fn> = Awaited<ReturnType<Handlers[F]>>;

/**
 * Two engine workers: one for quick calls the table waits on (coach odds, strategy), and one for
 * long background jobs (generating count plays, ~10–30 s) so those never hold up the coach.
 */
type Lane = 'main' | 'background';
const workers: Partial<Record<Lane, Worker>> = {};
let seq = 0;
const pending = new Map<number, { res: (v: unknown) => void; rej: (e: Error) => void }>();

function get(lane: Lane): Worker {
  let w = workers[lane];
  if (!w) {
    w = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.ok) p.res(e.data.result);
      else p.rej(new Error(e.data.error));
    };
    workers[lane] = w;
  }
  return w;
}

function send<F extends Fn>(lane: Lane, fn: F, args: Parameters<Handlers[F]>): Promise<Ret<F>> {
  const id = ++seq;
  return new Promise((res, rej) => {
    pending.set(id, { res: res as (v: unknown) => void, rej });
    get(lane).postMessage({ id, fn, args });
  });
}

/** Call an engine function in the worker. */
export function call<F extends Fn>(fn: F, ...args: Parameters<Handlers[F]>): Promise<Ret<F>> {
  return send('main', fn, args);
}

/** Call a long-running engine function in the background worker. */
export function callBackground<F extends Fn>(fn: F, ...args: Parameters<Handlers[F]>): Promise<Ret<F>> {
  return send('background', fn, args);
}
