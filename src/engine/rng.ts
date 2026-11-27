/** Small, fast, seedable PRNG (mulberry32). Deterministic so shoes can be replayed/exported. */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The device's own random source (the one used for encryption keys), as a 0..1 generator with 53
 * random bits a draw. This is as random as a digital shuffle gets: it isn't a formula replaying from
 * a seed, there is no pattern to find, and with it every order of the cards is as likely as any
 * other. Used for the shoe at the table. Falls back to Math.random where there's no crypto.
 */
export function cryptoRng(): Rng {
  const c = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function' ? crypto : null;
  if (!c) return Math.random;
  const buf = new Uint32Array(128);
  let i = buf.length;
  return () => {
    if (i + 2 > buf.length) {
      c.getRandomValues(buf);
      i = 0;
    }
    const hi = buf[i++] >>> 5; // 27 bits
    const lo = buf[i++] >>> 6; // 26 bits
    return (hi * 67108864 + lo) / 9007199254740992;
  };
}

export function randomSeed(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 2 ** 32);
}

/** Uniform integer in [0, n). */
export function randInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}

/** In-place Fisher–Yates shuffle. */
export function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

export function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}
