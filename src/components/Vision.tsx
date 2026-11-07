import { useEffect, useState, type CSSProperties } from 'react';
import { IconListen, IconSay, IconWrite } from './icons';

const STAGES = [
  { name: 'האזנה', min: 1, text: 'שיר אחד ומסר אחד', Icon: IconListen },
  { name: 'כתיבה', min: 3, text: 'לכתוב או להקליט, מה המסר אומר לי', Icon: IconWrite },
  { name: 'הצהרה', min: 1, text: 'משפט אחד, בקול', Icon: IconSay },
];

const AUTO_MS = 12000;

/**
 * דף החזון: הדף הראשון בכל פתיחה, ואחריו "היום".
 * החזון בשורה אחת, חמש הדקות כציר זמן באורכים אמיתיים (1, 3, 1), והייקו.
 * מעבר אוטומטי להיום, שנעצר ברגע שהמשתמשת נוגעת או גוללת.
 */
export function Vision({ onStart }: { onStart: () => void }) {
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    const t = window.setTimeout(onStart, AUTO_MS);
    const stop = () => setAuto(false);
    window.addEventListener('wheel', stop, { once: true });
    window.addEventListener('touchmove', stop, { once: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchmove', stop);
    };
  }, [auto, onStart]);

  return (
    <section className="vision" aria-labelledby="vision-title">
      <p className="eyebrow rise">החזון</p>
      <h1 id="vision-title" className="vision-title rise" style={{ animationDelay: '0.15s' }}>
        שיר אחד ביום
        <br />
        <span className="shine-text">הופך לצעד אחד</span>
      </h1>
      <p className="vision-lead rise" style={{ animationDelay: '0.35s' }}>
        נשים שבוחרות לעצמן, <strong>בצעד קטן ויומיומי.</strong>
        <br />
        <strong>חמש דקות</strong> שמחברות את המסר של השיר לפעולה אחת בחיים.
      </p>

      <ol className="timeline rise" style={{ animationDelay: '0.55s' }} aria-label="איך משתמשים: חמש הדקות, לפי זמן">
        {STAGES.map(({ name, min, text, Icon }, i) => (
          <li key={name} className="tl-item" style={{ flexGrow: min, animationDelay: `${0.75 + i * 0.2}s` }}>
            <span className="tl-bar" />
            <span className="tl-head">
              <Icon />
              <strong>{name}</strong>
            </span>
            <span className="tl-min">{min === 1 ? 'דקה' : `${min} דקות`}</span>
            <span className="tl-text">{text}</span>
          </li>
        ))}
      </ol>

      <blockquote className="haiku vision-haiku rise" style={{ animationDelay: '1.2s' }} aria-label="הייקו">
        <span>צְלִיל בַּבֹּקֶר</span>
        <span>מִלָּה אַחַת עַל הַדַּף</span>
        <span>וְהַיּוֹם מַתְחִיל</span>
      </blockquote>

      <p className="small muted rise" style={{ animationDelay: '1.35s' }}>
        בלי מילות שירים מלאות (זכויות יוצרים), והכתיבה נשמרת רק במכשיר שלך.
      </p>

      <button
        className={`primary enter rise ${auto ? 'auto' : ''}`}
        style={{ animationDelay: '1.45s', '--auto': `${AUTO_MS}ms` } as CSSProperties}
        onClick={onStart}
      >
        <span className="enter-fill" aria-hidden="true" />
        <span className="enter-label">לשיר של היום</span>
      </button>
    </section>
  );
}
