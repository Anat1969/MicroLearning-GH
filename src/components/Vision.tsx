import { IconListen, IconSay, IconWrite } from './icons';

interface Props {
  onStart: () => void;
}

/**
 * מסך החזון: מה האפליקציה מבקשת לעשות, למה, ואיך משתמשים בה.
 * הגרפיקה היא שרטוט מופשט של אריחים וטבעות, בלי תמונות סטוק.
 */
export function Vision({ onStart }: Props) {
  return (
    <section className="vision stack">
      <div className="vision-hero">
        <svg className="vision-art" viewBox="0 0 320 320" aria-hidden="true">
          {[40, 58, 76, 94, 112, 130, 148].map((r, i) => (
            <circle
              key={r}
              cx="160"
              cy="160"
              r={r}
              fill="none"
              className={i < 3 ? 'vision-ring lit' : 'vision-ring'}
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
          <rect x="136" y="136" width="48" height="48" rx="14" className="vision-tile" />
        </svg>
        <h1>שיר אחד ביום. חמש דקות לעצמך.</h1>
      </div>

      <article className="card">
        <h2>החזון</h2>
        <p>נשים שבוחרות לעצמן, בצעד קטן ויומיומי, כל יום.</p>
      </article>

      <article className="card">
        <h2>המטרה</h2>
        <p>להפוך השראה להרגל. כל יום שיר אחד, ותרגול קצר שמחבר את המסר לפעולה אחת בחיים.</p>
      </article>

      <article className="card how">
        <h2>איך משתמשים</h2>
        <ol className="how-steps">
          <li>
            <span className="how-icon"><IconListen /></span>
            <div>
              <strong>האזנה</strong>
              <span className="muted small">פותחים את השיר בקישור החיצוני, ומקשיבים לו.</span>
            </div>
          </li>
          <li>
            <span className="how-icon"><IconWrite /></span>
            <div>
              <strong>כתיבה</strong>
              <span className="muted small">שלוש דקות עם טיימר. אפשר לכתוב או להקליט, והטקסט נשמר אוטומטית.</span>
            </div>
          </li>
          <li>
            <span className="how-icon"><IconSay /></span>
            <div>
              <strong>הצהרה</strong>
              <span className="muted small">אומרים לעצמך את משפט המפתח בקול, וסוגרים את היום.</span>
            </div>
          </li>
        </ol>
      </article>

      <article className="card">
        <h2>מה האפליקציה לא עושה</h2>
        <p className="muted small">היא לא מציגה מילות שירים מלאות, כי הן מוגנות זכויות יוצרים. היא לא שולחת את הכתיבה שלך לשרת: הכול נשמר במכשיר.</p>
      </article>

      <button className="primary" onClick={onStart}>
        להתחיל את היום
      </button>
    </section>
  );
}
