import type { Handlers } from './handlers';

type Fn = keyof Handlers;
type Ret<F extends Fn> = Awaited<ReturnType<Handlers[F]>>;

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { res: (v: unknown) => void; rej: (e: Error) => void }>();

function get(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.ok) p.res(e.data.result);
      else p.rej(new Error(e.data.error));
    };
  }
  return worker;
}

/** Call an engine function in the worker. */
export function call<F extends Fn>(fn: F, ...args: Parameters<Handlers[F]>): Promise<Ret<F>> {
  const id = ++seq;
  return new Promise((res, rej) => {
    pending.set(id, { res: res as (v: unknown) => void, rej });
    get().postMessage({ id, fn, args });
  });
}
