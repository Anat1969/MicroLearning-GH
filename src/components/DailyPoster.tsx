import { useMemo, type CSSProperties } from 'react';

interface Props {
  tone: string;
  day: number;
  monthName: string;
  weekday: string;
  message: string;
  /** מספר הימים שבוצעו בשבוע. כל יום שבוצע מוסיף קשת צבעונית, לפי סדר הימים. */
  doneCount: number;
}

const SIZE = 320;
const C = SIZE / 2;
const STEP = 20;
const SWEEP = (Math.PI * 5) / 3; // 300 מעלות: קשת שנפתחת, לא עיגול סגור

/**
 * פוסטר היום: קשתות קונצנטריות על גריד אחד, בצבע התחום.
 * שבעה טבעות, כמספר ימי השבוע. כל יום שבוצע הופך את הטבעת שלו לקשת צבעונית.
 * טבעות שלא בוצעו נשארות דקות ומנוקדות, כך שהשבוע נראה לעין עוד לפני שמתחילים.
 */
export function DailyPoster({ tone, day, monthName, weekday, message, doneCount }: Props) {
  const rings = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const r = STEP * (i + 1);
        const done = i < doneCount;
        const len = 2 * Math.PI * r * (SWEEP / (2 * Math.PI));
        const start = -Math.PI / 2;
        const end = start + SWEEP;
        const d = `M ${C + r * Math.cos(start)} ${C + r * Math.sin(start)} A ${r} ${r} 0 1 1 ${C + r * Math.cos(end)} ${C + r * Math.sin(end)}`;
        return { r, done, len, d };
      }),
    [doneCount],
  );

  return (
    <section className="poster" aria-label={`${day} ב${monthName}, ${weekday}`}>
      <div className="poster-top">
        <span className="poster-day">{day}</span>
        <span className="poster-meta">
          <strong>{monthName}</strong>
          <span className="muted">{weekday}</span>
        </span>
      </div>

      <svg className="poster-art" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-hidden="true">
        <line x1="0" y1={C} x2={SIZE} y2={C} className="grid-line" />
        <line x1={C} y1="0" x2={C} y2={SIZE} className="grid-line" />
        {rings.map((ring, i) =>
          ring.done ? (
            <path
              key={i}
              d={ring.d}
              fill="none"
              stroke={tone}
              strokeWidth={3.5}
              strokeLinecap="round"
              className="arc"
              style={{ '--len': ring.len } as CSSProperties}
            />
          ) : (
            <circle key={i} cx={C} cy={C} r={ring.r} fill="none" className="ring-empty" />
          ),
        )}
      </svg>

      <p className="poster-message">
        <mark>{message}</mark>
      </p>
    </section>
  );
}
