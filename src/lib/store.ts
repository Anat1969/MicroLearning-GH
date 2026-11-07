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

function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function songForDate(key: string, songs: Song[]): Song | undefined {
  if (songs.length === 0) return undefined;
  const n = songs.length;
  return songs[((dayNumber(key) % n) + n) % n];
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
