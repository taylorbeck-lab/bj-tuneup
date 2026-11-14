import { getAll, put, uid } from './db';

export interface Mistake {
  key: string;
  label: string;
  detail: string;
  evLost?: number;
}

export interface SessionRecord {
  id: string;
  /** e.g. 'drill:countdown', 'sim', 'tuneup', 'feel', 'strike', 'sidebet' */
  kind: string;
  at: number;
  durationMs: number;
  total: number;
  correct: number;
  accuracy: number;
  avgMs?: number;
  evLost?: number;
  hands?: number;
  metrics?: Record<string, number>;
  mistakes: Mistake[];
  /** Optional reference to a stored shoe for hand review. */
  shoeId?: string;
  /** Feel Lab: graded decisions that departed from the chart or where the exact play differed. */
  feel?: import('../engine/feel').FeelRecord[];
}

export async function saveSession(s: Omit<SessionRecord, 'id' | 'at'> & { id?: string; at?: number }): Promise<SessionRecord> {
  const rec: SessionRecord = { id: s.id ?? uid(), at: s.at ?? Date.now(), ...s } as SessionRecord;
  await put('sessions', rec);
  return rec;
}

export async function listSessions(kind?: string): Promise<SessionRecord[]> {
  const all = await getAll<SessionRecord>('sessions');
  return all.filter((s) => !kind || s.kind === kind || s.kind.startsWith(kind + ':')).sort((a, b) => b.at - a.at);
}
