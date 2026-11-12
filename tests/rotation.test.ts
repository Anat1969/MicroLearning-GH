// בדיקת סבב השירים: כל שיר פעם אחת בכל סבב, אותו שיר לא מופיע פעמיים ברצף, והסדר משתנה בין סבבים.
// הרצה: node --experimental-strip-types tests/rotation.test.ts
import { songForDate, shiftKey, dayNumber } from '../src/lib/store.ts';
import type { Song } from '../src/types.ts';

function fakeSongs(n: number): Song[] {
  return Array.from({ length: n }, (_, i) => ({ id: `t-${i}` }) as unknown as Song);
}

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
  if (!ok) failures++;
};

for (const n of [2, 3, 5, 7, 12]) {
  const songs = fakeSongs(n);
  const days = Array.from({ length: 3000 }, (_, i) => shiftKey('2024-01-01', i));
  const seq = days.map((d) => songForDate(d, songs)!.id);

  let noRepeat = true;
  for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) noRepeat = false;
  check(`n=${n}: אותו שיר לא מופיע פעמיים ברצף (3000 ימים)`, noRepeat);

  // קבוצות לפי סבב אמיתי: floor(dayNumber / n). כל סבב מלא מכיל כל שיר פעם אחת.
  const byCycle = new Map<number, string[]>();
  days.forEach((d, i) => {
    const c = Math.floor(dayNumber(d) / n);
    byCycle.set(c, [...(byCycle.get(c) ?? []), seq[i]]);
  });
  const full = [...byCycle.values()].filter((g) => g.length === n);
  const eachOnce = full.every((g) => new Set(g).size === n);
  check(`n=${n}: כל סבב מלא מכיל כל שיר פעם אחת (${full.length} סבבים)`, eachOnce && full.length > 0);

  const orders = [...byCycle.values()].filter((g) => g.length === n).map((g) => g.join(','));
  const distinctOrders = new Set(orders).size;
  // עם שני שירים בלבד, אי אפשר לשנות סדר בלי לחזור על שיר ברצף: הסדר נשאר מתחלף. זה מתועד ולא נבדק כשינוי.
  if (n === 2) check(`n=2: הסדר מתחלף כצפוי (אין מה לשנות עם שני שירים)`, distinctOrders === 1);
  else check(`n=${n}: הסדר משתנה בין סבבים (${distinctOrders} סדרים שונים)`, distinctOrders >= 3);
}

const a = songForDate('2026-11-12', fakeSongs(7));
const b = songForDate('2026-11-12', fakeSongs(7));
check('אותו תאריך תמיד נותן אותו שיר (דטרמיניסטי)', a?.id === b?.id);

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
