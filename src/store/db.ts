/**
 * Local persistence. Everything lives in IndexedDB on the device; there is no backend.
 * Falls back to an in-memory map when IndexedDB is unavailable (tests, private mode).
 */
import { openDB, type IDBPDatabase } from 'idb';

export type StoreName = 'kv' | 'sessions' | 'srs' | 'shoes';
const DB_NAME = 'tuneup';
const DB_VERSION = 1;

let dbp: Promise<IDBPDatabase> | null = null;

/**
 * Safari can leave an IndexedDB open or request hanging (or lose the connection after the app has
 * been in the background). Nothing here may wait forever: every call gives up after a few seconds
 * and falls back to memory, and a lost connection is reopened on the next call.
 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((res, rej) => {
    const id = setTimeout(() => rej(new Error('IndexedDB timed out')), ms);
    p.then(
      (v) => {
        clearTimeout(id);
        res(v);
      },
      (e) => {
        clearTimeout(id);
        rej(e);
      },
    );
  });
}
const OP_MS = 3000;
const mem: Record<StoreName, Map<IDBValidKey, unknown>> = {
  kv: new Map(),
  sessions: new Map(),
  srs: new Map(),
  shoes: new Map(),
};

function hasIdb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function db(): Promise<IDBPDatabase> {
  if (!dbp) {
    const opening = openDB(DB_NAME, DB_VERSION, {
      terminated() {
        dbp = null;
      },
      blocking() {
        void opening.then((d) => d.close());
        dbp = null;
      },
      upgrade(d) {
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('sessions')) {
          const s = d.createObjectStore('sessions', { keyPath: 'id' });
          s.createIndex('kind', 'kind');
          s.createIndex('at', 'at');
        }
        if (!d.objectStoreNames.contains('srs')) d.createObjectStore('srs', { keyPath: 'key' });
        if (!d.objectStoreNames.contains('shoes')) {
          const s = d.createObjectStore('shoes', { keyPath: 'id' });
          s.createIndex('at', 'at');
        }
      },
    });
    dbp = withTimeout(opening, 4000).catch((e) => {
      dbp = null;
      throw e;
    });
  }
  return dbp;
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  if (!hasIdb()) return mem.kv.get(key) as T | undefined;
  try {
    return (await withTimeout((await db()).get('kv', key), OP_MS)) as T | undefined;
  } catch {
    return mem.kv.get(key) as T | undefined;
  }
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  mem.kv.set(key, value);
  if (!hasIdb()) return;
  try {
    await withTimeout((await db()).put('kv', value, key), OP_MS);
  } catch {
    /* memory fallback already updated */
  }
}

/** Put a record that has its own key (`id` or `key`). */
export async function put<T extends object>(store: Exclude<StoreName, 'kv'>, value: T): Promise<void> {
  const k = (value as { id?: IDBValidKey; key?: IDBValidKey }).id ?? (value as { key?: IDBValidKey }).key!;
  mem[store].set(k, value);
  if (!hasIdb()) return;
  try {
    await withTimeout((await db()).put(store, value), OP_MS);
  } catch {
    /* ignore */
  }
}

export async function getAll<T>(store: Exclude<StoreName, 'kv'>): Promise<T[]> {
  if (!hasIdb()) return [...mem[store].values()] as T[];
  try {
    return (await withTimeout((await db()).getAll(store), OP_MS)) as T[];
  } catch {
    return [...mem[store].values()] as T[];
  }
}

export async function getOne<T>(store: Exclude<StoreName, 'kv'>, key: IDBValidKey): Promise<T | undefined> {
  if (!hasIdb()) return mem[store].get(key) as T | undefined;
  try {
    return (await withTimeout((await db()).get(store, key), OP_MS)) as T | undefined;
  } catch {
    return mem[store].get(key) as T | undefined;
  }
}

export async function del(store: StoreName, key: IDBValidKey): Promise<void> {
  mem[store].delete(key);
  if (!hasIdb()) return;
  try {
    await withTimeout((await db()).delete(store, key), OP_MS);
  } catch {
    /* ignore */
  }
}

export async function clearAll(): Promise<void> {
  for (const k of Object.keys(mem) as StoreName[]) mem[k].clear();
  if (!hasIdb()) return;
  const d = await db();
  for (const s of ['kv', 'sessions', 'srs', 'shoes'] as StoreName[]) await d.clear(s);
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
