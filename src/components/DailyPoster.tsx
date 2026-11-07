interface Props {
  tone: string;
  day: number;
  monthName: string;
  weekday: string;
  message: string;
  keyPhrase: string;
  title: string;
}

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
 * פוסטר היום: טיפוגרפיה בלבד. תאריך כפירוש, קו צבע התחום, ציטוט גדול עם מרקר על הביטוי המרכזי.
 * בלי איורים: המסר הוא המוקד, והצבע מסמן רק את התחום.
 */
export function DailyPoster({ tone, day, monthName, weekday, message, keyPhrase, title }: Props) {
  return (
    <section className="poster" aria-label={`${day} ב${monthName}, ${weekday}`}>
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
    </section>
  );
}
