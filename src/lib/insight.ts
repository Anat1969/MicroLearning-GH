import type { Entry, Song } from '../types';

/**
 * תובנה שבועית מחושבת מהנתונים בלבד. בלי ניחושים:
 * - כמה ימים בוצעו מתוך שבעה.
 * - איזה תחום הופיע הכי הרבה בשבוע הזה.
 */
export function weekInsight(entries: Record<string, Entry>, week: string[], songs: Song[]): string {
  const doneKeys = week.filter((k) => entries[k]?.done);
  if (doneKeys.length === 0) {
    return 'השבוע עוד לא התחיל. תרגול אחד מספיק כדי לפתוח רצף.';
  }

  const counts = new Map<string, number>();
  for (const k of doneKeys) {
    const song = songs.find((s) => s.id === entries[k].songId);
    if (song) counts.set(song.category, (counts.get(song.category) ?? 0) + 1);
  }

  let topCategory = '';
  let topCount = 0;
  counts.forEach((count, category) => {
    if (count > topCount) {
      topCount = count;
      topCategory = category;
    }
  });

  const base = `בוצעו ${doneKeys.length} מתוך 7 ימים.`;
  return topCategory ? `${base} התחום הבולט השבוע: ${topCategory}.` : base;
}
