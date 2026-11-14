/// <reference lib="webworker" />
/**
 * Heavy math runs here, off the UI thread. Messages: { id, fn, args } -> { id, ok, result | error }.
 */
import { handlers } from './handlers';

self.onmessage = async (e: MessageEvent<{ id: number; fn: keyof typeof handlers; args: unknown[] }>) => {
  const { id, fn, args } = e.data;
  try {
    const h = handlers[fn] as (...a: unknown[]) => unknown;
    const result = await h(...args);
    (self as unknown as Worker).postMessage({ id, ok: true, result });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, ok: false, error: String(err) });
  }
};
