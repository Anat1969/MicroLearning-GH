import { useMemo, type CSSProperties } from 'react';

interface Props {
  tone: string;
  day: number;
  monthName: string;
  weekday: string;
  message: string;
  keyPhrase: string;
  title: string;
  /** מספר הימים שבוצעו בשבוע. כל יום שבוצע מוסיף קשת צבעונית לטבעת שלו. */
  doneCount: number;
}

const SIZE = 320;
const C = SIZE / 2;
const SWEEP = (Math.PI * 5) / 3; // 300 מעלות: קשת שנפתחת, לא עיגול סגור

/** מסמן את הביטוי המרכזי של המסר במרקר. אם הביטוי לא נמצא, מסומן המשפט כולו. */
function renderQuote(message: string, keyPhrase: string) {
  const idx = keyPhrase ? message.indexOf(keyPhrase) : -1;
  if (idx === -1) return <mark>{message}</mark>;
  return (
    <>
      {message.slice(0, idx)}
      <mark>{keyPhrase}</mark>
      {message.slice(idx + keyPhrase.length)}
    </>
  );
}

/**
 * פוסטר היום: שבע טבעות על גריד אחד, ברקע, בצבע התחום. כל יום שבוצע הופך את הטבעת שלו לקשת.
 * הציטוט והטקסט נשארים בחזית, והטבעות לא מסתירות אותם.
 */
export function DailyPoster({ tone, day, monthName, weekday, message, keyPhrase, title, doneCount }: Props) {
  const rings = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const r = 40 + i * 18; // 40 עד 148: טבעת פנימית שנראית גם כשיום אחד בלבד בוצע
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
      <svg className="poster-rings" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <line x1="0" y1={C} x2={SIZE} y2={C} className="grid-line" />
        <line x1={C} y1="0" x2={C} y2={SIZE} className="grid-line" />
        {rings.map((ring, i) =>
          ring.done ? (
            <path
              key={i}
              d={ring.d}
              fill="none"
              stroke={tone}
              strokeWidth={4}
              strokeLinecap="round"
              className="arc"
              style={{ '--len': ring.len } as CSSProperties}
            />
          ) : (
            <circle key={i} cx={C} cy={C} r={ring.r} fill="none" className="ring-empty" />
          ),
        )}
      </svg>

      <div className="poster-body">
        <div className="poster-top">
          <span className="poster-day">{day}</span>
          <span className="poster-meta">
            <strong>{monthName}</strong>
            <span className="muted">{weekday}</span>
          </span>
        </div>
        <span className="poster-rule" style={{ background: tone }} aria-hidden="true" />
        <p className="poster-quote">{renderQuote(message, keyPhrase)}</p>
        <p className="poster-source muted small">מתוך השיר "{title}"</p>
      </div>
    </section>
  );
}
