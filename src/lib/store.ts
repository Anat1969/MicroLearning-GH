import type { Entry, Song, Store } from '../types';

const KEY = 'mdk.v1';

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { entries: {}, customSongs: [], reminder: false };
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      entries: parsed.entries ?? {},
      customSongs: parsed.customSongs ?? [],
      reminder: parsed.reminder ?? false,
    };
  } catch {
    return { entries: {}, customSongs: [], reminder: false };
  }
}

export function saveStore(store: Store): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function dateKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** מחולל מספרים פסאודו-אקראי קבוע לזרע נתון (mulberry32). אותו זרע תמיד נותן את אותו סדר. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** סדר תמורה של כל השירים לסבב נתון. כל שיר מופיע פעם אחת בכל סבב. */
function cycleOrder(cycle: number, n: number): number[] {
  const rand = seeded(Math.imul(cycle + 1, 2654435761) ^ n);
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** סדר סופי לכל סבב, אחרי התאמה לסבב הקודם. מחושב מהסבב הראשון ומתקדם, עם זיכרון מטמון. */
const finalCache = new Map<string, number[]>();
function finalOrder(cycle: number, n: number): number[] {
  const hit = finalCache.get(`${n}|${cycle}`);
  if (hit) return hit;
  const pending: number[] = [];
  let k = cycle;
  while (k >= 0 && !finalCache.has(`${n}|${k}`)) {
    pending.push(k);
    k--;
  }
  let prevLast = k >= 0 ? finalCache.get(`${n}|${k}`)![n - 1] : undefined;
  for (let i = pending.length - 1; i >= 0; i--) {
    const c = pending[i];
    const order = cycleOrder(c, n);
    if (prevLast !== undefined && n > 1 && order[0] === prevLast) {
      [order[0], order[1]] = [order[1], order[0]];
    }
    finalCache.set(`${n}|${c}`, order);
    prevLast = order[n - 1];
  }
  return finalCache.get(`${n}|${cycle}`)!;
}

/**
 * שיר היום: כל שיר מופיע פעם אחת בכל סבב, וסדר הסבב משתנה מסבב לסבב.
 * בין סבב לסבב מונע מצב שבו אותו שיר מופיע פעמיים ברצף.
 */
export function songForDate(key: string, songs: Song[]): Song | undefined {
  const n = songs.length;
  if (n === 0) return undefined;
  const day = dayNumber(key);
  const cycle = Math.floor(day / n);
  const offset = ((day % n) + n) % n;
  return songs[finalOrder(cycle, n)[offset]];
}

export function shiftKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + days));
}

/** Monday to Sunday keys for the week that contains the given key. */
export function weekKeys(key: string): string[] {
  const [y, m, d] = key.split('-').map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7;
  const monday = shiftKey(key, -dow);
  return Array.from({ length: 7 }, (_, i) => shiftKey(monday, i));
}

/** Consecutive done days ending today. If today is not done yet, counting starts from yesterday. */
export function streak(entries: Record<string, Entry>, today: string): number {
  let cursor = entries[today]?.done ? today : shiftKey(today, -1);
  let count = 0;
  while (entries[cursor]?.done) {
    count += 1;
    cursor = shiftKey(cursor, -1);
  }
  return count;
}

export function formatDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function emptyEntry(date: string, songId: string): Entry {
  return { date, songId, done: false, writing: '', declared: false };
}
