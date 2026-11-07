import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import seedSongs from './data/songs.json';
import type { Category, Entry, Song, Store } from './types';
import {
  dateKey,
  emptyEntry,
  formatDate,
  loadStore,
  saveStore,
  songForDate,
  shiftKey,
  streak,
  weekKeys,
} from './lib/store';
import { CATEGORY_MEANING, CATEGORY_TONE } from './lib/tone';
import { weekInsight } from './lib/insight';
import { buildShareCard } from './lib/shareCard';
import { DailyPoster } from './components/DailyPoster';

type View = 'today' | 'practice' | 'journal' | 'add';
type Step = 1 | 2 | 3;

const CATEGORIES: Category[] = ['ביטחון עצמי', 'התגברות על משבר', 'אהבה עצמית', 'קריירה', 'רוגע'];
const WEEK_LABELS = ['ב', 'ג', 'ד', 'ה', 'ו', 'ש', 'א'];
const WRITE_SECONDS = 180;
const APP_NAME = 'שיר היום';

function listenUrl(song: Song): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(song.listenQuery)}`;
}

function shareText(song: Song): string {
  return `היום עשיתי חמש דקות של העצמה עם השיר "${song.title}". ${song.practice.declaration}`;
}

export default function App() {
  const [store, setStore] = useState<Store>(() => loadStore());
  const [view, setView] = useState<View>('today');
  const [activeKey, setActiveKey] = useState<string>(() => dateKey());
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [notice, setNotice] = useState<string>('');

  const today = dateKey();
  const songs: Song[] = useMemo(
    () => [...(seedSongs as Song[]), ...store.customSongs],
    [store.customSongs],
  );

  useEffect(() => {
    const ok = saveStore(store);
    setSaveState(ok ? 'saved' : 'error');
  }, [store]);

  const todaySong = songForDate(today, songs);
  const activeSong = songForDate(activeKey, songs);
  const todayEntry = store.entries[today];
  const currentStreak = streak(store.entries, today);
  const week = weekKeys(today);
  const doneThisWeek = week.filter((k) => store.entries[k]?.done).length;

  function updateEntry(key: string, song: Song, patch: Partial<Entry>) {
    setStore((prev) => {
      const base = prev.entries[key] ?? emptyEntry(key, song.id);
      return { ...prev, entries: { ...prev.entries, [key]: { ...base, ...patch } } };
    });
  }

  function openPractice(key: string) {
    setActiveKey(key);
    setView('practice');
  }

  function setReminder() {
    if (typeof Notification === 'undefined') {
      setNotice('הדפדפן הזה לא תומך בתזכורות.');
      return;
    }
    Notification.requestPermission().then((perm) => {
      if (perm !== 'granted') {
        setNotice('ההתראות חסומות. אפשר לאשר אותן בהגדרות הדפדפן.');
        return;
      }
      setStore((prev) => ({ ...prev, reminder: true }));
      setNotice('התזכורת פעילה, אבל רק כשהלשונית פתוחה. התזכורת של 07:00 כ-push דורשת שירות נפרד.');
    });
  }

  return (
    <div className="app" dir="rtl">
      <header className="topbar">
        <button className="brand" onClick={() => setView('today')} aria-label="חזרה להיום">
          {APP_NAME}
        </button>
        <nav className="tabs" aria-label="ניווט">
          <button className={view === 'today' ? 'tab on' : 'tab'} onClick={() => setView('today')}>
            היום
          </button>
          <button className={view === 'journal' ? 'tab on' : 'tab'} onClick={() => setView('journal')}>
            יומן
          </button>
          <button className={view === 'add' ? 'tab on' : 'tab'} onClick={() => setView('add')}>
            הוספת שיר
          </button>
        </nav>
      </header>

      <main className="content">
        {view === 'today' && todaySong && (
          <TodayView
            song={todaySong}
            entry={todayEntry}
            streak={currentStreak}
            week={week}
            store={store}
            songs={songs}
            doneThisWeek={doneThisWeek}
            onStart={() => openPractice(today)}
            onRemind={setReminder}
            reminderOn={store.reminder}
            notice={notice}
            today={today}
          />
        )}

        {view === 'practice' && activeSong && (
          <PracticeView
            key={activeKey}
            song={activeSong}
            entry={store.entries[activeKey]}
            saveState={saveState}
            onChange={(patch) => updateEntry(activeKey, activeSong, patch)}
            onBack={() => setView('today')}
          />
        )}

        {view === 'journal' && <JournalView store={store} songs={songs} onOpen={openPractice} />}

        {view === 'add' && (
          <AddSongView
            onAdd={(song) => {
              setStore((prev) => ({ ...prev, customSongs: [...prev.customSongs, song] }));
              setView('today');
            }}
          />
        )}
      </main>
    </div>
  );
}

interface TodayProps {
  song: Song;
  entry: Entry | undefined;
  streak: number;
  week: string[];
  store: Store;
  songs: Song[];
  doneThisWeek: number;
  onStart: () => void;
  onRemind: () => void;
  reminderOn: boolean;
  notice: string;
  today: string;
}

function TodayView(p: TodayProps) {
  const done = p.entry?.done ?? false;
  const tone = CATEGORY_TONE[p.song.category];
  const [y, m, d] = p.today.split('-').map(Number);
  const dayDate = new Date(y, m - 1, d);
  // עד שלושה ימים שבוצעו בשבעת הימים שלפני היום, מהחדש לישן: הקשר בין הימים (עיקרון 8).
  const thread: { key: string; song: Song }[] = [];
  for (let i = 1; i <= 7 && thread.length < 3; i++) {
    const key = shiftKey(p.today, -i);
    const entry = p.store.entries[key];
    const song = entry?.done ? p.songs.find((x) => x.id === entry.songId) : undefined;
    if (song) thread.push({ key, song });
  }
  const monthName = dayDate.toLocaleDateString('he-IL', { month: 'long' });
  const weekday = dayDate.toLocaleDateString('he-IL', { weekday: 'long' });

  return (
    <section className="stack">
      <DailyPoster
        tone={tone}
        day={d}
        monthName={monthName}
        weekday={weekday}
        message={p.song.message}
        keyPhrase={p.song.keyPhrase}
        title={p.song.title}
      />
      {thread.length > 0 && (
        <div className="thread">
          <p className="small muted">הרצף שלך לפני היום</p>
          <ol>
            {thread.map((t) => (
              <li key={t.key}>
                <span className="small muted">{formatDate(t.key)}</span>
                <span>{t.song.practice.declaration}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <article className="card song" style={{ '--tone': tone } as CSSProperties}>
        <span className="chip">{p.song.category}</span>
        <h1>{p.song.title}</h1>
        <p className="artist">{p.song.artist}</p>
        <a className="link" href={listenUrl(p.song)} target="_blank" rel="noreferrer">
          האזנה בחיפוש חיצוני
        </a>
        {!p.song.verified && <p className="muted small">תוכן בטיוטה, לאימות אוצרת.</p>}
      </article>

      <p className="legend small">
        <span className="swatch" style={{ background: tone }} aria-hidden="true" />
        <span>
          {p.song.category}: {CATEGORY_MEANING[p.song.category]}.
        </span>
      </p>

      <button className="primary" onClick={p.onStart}>
        {done ? 'לתרגול של היום (בוצע)' : 'התחל תרגול, חמש דקות'}
      </button>

      <WeekMeter week={p.week} entries={p.store.entries} today={p.today} streak={p.streak} doneThisWeek={p.doneThisWeek} />

      <p className="insight">
        <mark>{weekInsight(p.store.entries, p.week, p.songs)}</mark>
      </p>

      <div className="row">
        <button className="ghost" onClick={p.onRemind} disabled={p.reminderOn}>
          {p.reminderOn ? 'תזכורת פעילה' : 'הפעלת תזכורת'}
        </button>
      </div>
      {p.notice && <p className="muted small">{p.notice}</p>}
    </section>
  );
}

function WeekMeter({
  week,
  entries,
  today,
  streak,
  doneThisWeek,
}: {
  week: string[];
  entries: Record<string, Entry>;
  today: string;
  streak: number;
  doneThisWeek: number;
}) {
  return (
    <section className="card" aria-label="התקדמות שבועית">
      <div className="meter-head">
        <span>
          <strong>{doneThisWeek}</strong> מתוך 7 השבוע
        </span>
        <span>
          רצף: <strong>{streak}</strong> ימים
        </span>
      </div>
      <div className="grid7" role="list">
        {week.map((k, i) => {
          const isDone = entries[k]?.done;
          const cls = ['dot', isDone ? 'on' : '', k === today ? 'now' : ''].join(' ').trim();
          return (
            <div key={k} className="dotcol" role="listitem" aria-label={`${WEEK_LABELS[i]} ${isDone ? 'בוצע' : 'לא בוצע'}`}>
              <span className={cls} />
              <span className="small muted">{WEEK_LABELS[i]}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PracticeView({
  song,
  entry,
  saveState,
  onChange,
  onBack,
}: {
  song: Song;
  entry: Entry | undefined;
  saveState: 'idle' | 'saved' | 'error';
  onChange: (patch: Partial<Entry>) => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [seconds, setSeconds] = useState<number>(WRITE_SECONDS);
  const [running, setRunning] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const recognitionRef = useRef<any>(null);
  const supportsVoice = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    if (!running) return;
    if (seconds <= 0) {
      setRunning(false);
      return;
    }
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [running, seconds]);

  useEffect(() => () => recognitionRef.current?.stop?.(), []);

  function toggleVoice() {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) return;
    if (voiceOn) {
      recognitionRef.current?.stop?.();
      setVoiceOn(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = 'he-IL';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (ev: any) => {
      let added = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) added += ev.results[i][0].transcript;
      }
      if (added) onChange({ writing: `${entry?.writing ? entry.writing + ' ' : ''}${added.trim()}` });
    };
    rec.onend = () => setVoiceOn(false);
    rec.start();
    recognitionRef.current = rec;
    setVoiceOn(true);
  }

  const mm = String(Math.floor(seconds / 60)).padStart(1, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <section className="stack">
      <div className="row between">
        <button className="ghost small" onClick={onBack}>
          חזרה להיום
        </button>
        <span className={`saved ${saveState}`} aria-live="polite">
          {saveState === 'error' ? 'השמירה נכשלה, בדקי שאחסון הדפדפן פעיל' : 'נשמר'}
        </span>
      </div>

      <ol className="steps" aria-label="שלבי התרגול">
        {([1, 2, 3] as Step[]).map((s) => (
          <li key={s} className={s === step ? 'step on' : s < step ? 'step past' : 'step'}>
            <button onClick={() => setStep(s)} aria-current={s === step ? 'step' : undefined}>
              {s === 1 ? 'האזנה' : s === 2 ? 'כתיבה' : 'הצהרה'}
            </button>
          </li>
        ))}
      </ol>

      {step === 1 && (
        <article className="card">
          <p className="small muted">שלב 1 מתוך 3, דקה אחת</p>
          <h2>{song.title}</h2>
          <p className="message">
            <mark>{song.message}</mark>
          </p>
          <a className="link" href={listenUrl(song)} target="_blank" rel="noreferrer">
            האזנה לשיר
          </a>
          <button className="primary" onClick={() => setStep(2)}>
            הבא: כתיבה
          </button>
        </article>
      )}

      {step === 2 && (
        <article className="card">
          <p className="small muted">שלב 2 מתוך 3, שלוש דקות</p>
          <p className="prompt">{song.practice.writePrompt}</p>
          <div className="row between">
            <span className="timer" aria-live="off">
              {mm}:{ss}
            </span>
            <button className="ghost small" onClick={() => setRunning((r) => !r)} disabled={seconds === 0}>
              {running ? 'השהיה' : seconds === WRITE_SECONDS ? 'התחלה' : 'המשך'}
            </button>
          </div>
          <textarea
            className="write"
            value={entry?.writing ?? ''}
            onChange={(e) => onChange({ writing: e.target.value })}
            placeholder="כתבי כאן. הטקסט נשמר אוטומטית."
            rows={6}
            aria-label="כתיבה"
          />
          <div className="row between">
            {supportsVoice ? (
              <button className="ghost small" onClick={toggleVoice}>
                {voiceOn ? 'עצירת הקלטה' : 'הקלטה ותמלול'}
              </button>
            ) : (
              <span className="small muted">ההקלטה לא נתמכת בדפדפן הזה. אפשר לכתוב ידנית.</span>
            )}
            <button className="primary inline" onClick={() => setStep(3)}>
              הבא: הצהרה
            </button>
          </div>
        </article>
      )}

      {step === 3 && (
        <article className="card">
          <p className="small muted">שלב 3 מתוך 3, דקה אחת</p>
          <p className="action">{song.practice.action}</p>
          <p className="declaration">{song.practice.declaration}</p>
          {!entry?.declared ? (
            <button className="ghost" onClick={() => onChange({ declared: true })}>
              אמרתי את זה לעצמי
            </button>
          ) : (
            <p className="small">ההצהרה נרשמה.</p>
          )}
          <button
            className="primary"
            disabled={!entry?.declared || entry?.done}
            onClick={() => onChange({ done: true, doneAt: new Date().toISOString() })}
          >
            {entry?.done ? 'סיימתי היום (נשמר)' : 'סיימתי היום'}
          </button>
          {entry?.done && <ShareBox song={song} />}
        </article>
      )}
    </section>
  );
}

function ShareBox({ song }: { song: Song }) {
  const text = shareText(song);
  const [msg, setMsg] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);

  useEffect(() => {
    let alive = true;
    const label = formatDate(dateKey());
    buildShareCard(song, label)
      .then((blob) => {
        if (!alive) return;
        setCardBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
      })
      .catch(() => alive && setMsg('לא הצלחנו לבנות את הכרטיס. אפשר לשתף טקסט.'));
    return () => {
      alive = false;
    };
  }, [song]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function shareCard() {
    if (!cardBlob) return;
    const file = new File([cardBlob], 'shir-hayom.png', { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: APP_NAME, text, files: [file] });
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(cardBlob);
      a.download = 'shir-hayom.png';
      a.click();
      setMsg('הכרטיס ירד למכשיר. אפשר להעלות אותו לסטורי.');
    } catch {
      setMsg('השיתוף בוטל או נכשל.');
    }
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: APP_NAME, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setMsg('הטקסט הועתק. אפשר להדביק בסטורי או בוואטסאפ.');
    } catch {
      setMsg('השיתוף בוטל או נכשל.');
    }
  }

  return (
    <div className="share">
      <p className="small muted">שיתוף של מה שאת בוחרת לשתף (לא הכתיבה שלך):</p>
      {previewUrl && <img className="card-preview" src={previewUrl} alt="כרטיס שיתוף של היום" />}
      <blockquote>{text}</blockquote>
      <div className="row">
        <button className="primary inline" onClick={shareCard} disabled={!cardBlob}>
          שיתוף כרטיס
        </button>
        <button className="ghost small" onClick={share}>
          שיתוף טקסט
        </button>
        <a
          className="ghost small link-btn"
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer"
        >
          וואטסאפ
        </a>
      </div>
      {msg && <p className="small">{msg}</p>}
    </div>
  );
}

function JournalView({ store, songs, onOpen }: { store: Store; songs: Song[]; onOpen: (key: string) => void }) {
  const keys = Object.keys(store.entries).sort().reverse();
  if (keys.length === 0) {
    return (
      <section className="card">
        <h2>היומן ריק</h2>
        <p>כשתסיימי תרגול, הוא יופיע כאן עם הכתיבה שלך.</p>
      </section>
    );
  }
  return (
    <section className="stack">
      {keys.map((k) => {
        const e = store.entries[k];
        const song = songs.find((s) => s.id === e.songId);
        return (
          <button key={k} className="card journal-item" onClick={() => onOpen(k)}>
            <span className="small muted">{formatDate(k)}</span>
            <strong>{song?.title ?? 'שיר שהוסר'}</strong>
            <span className="small">{e.done ? 'בוצע' : 'לא הושלם'}</span>
            {e.writing && <span className="excerpt">{e.writing.slice(0, 120)}</span>}
          </button>
        );
      })}
    </section>
  );
}

function AddSongView({ onAdd }: { onAdd: (song: Song) => void }) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [category, setCategory] = useState<Category>('ביטחון עצמי');
  const [message, setMessage] = useState('');
  const [listenQuery, setListenQuery] = useState('');
  const [writePrompt, setWritePrompt] = useState('');
  const [action, setAction] = useState('');
  const [declaration, setDeclaration] = useState('');
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim() || !writePrompt.trim() || !declaration.trim()) {
      setError('חסרים שדות חובה: כותרת, מסר, שאלת כתיבה והצהרה.');
      return;
    }
    onAdd({
      id: `c-${Date.now()}`,
      title: title.trim(),
      artist: artist.trim() || 'לא צוין',
      category,
      message: message.trim(),
      listenQuery: listenQuery.trim() || `${title.trim()} ${artist.trim()}`.trim(),
      practice: { writePrompt: writePrompt.trim(), action: action.trim() || 'עמדי מול המראה ואמרי את ההצהרה בקול.', declaration: declaration.trim() },
      keyPhrase: message.trim(),
      verified: false,
    });
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <h2>הוספת שיר</h2>
      <p className="small muted">השיר נשמר במכשיר הזה. כדי להפוך אותו לתוכן מאושר, יש לאמת אותו מול אוצרת.</p>
      <label>
        שם השיר
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        מבצע
        <input value={artist} onChange={(e) => setArtist(e.target.value)} />
      </label>
      <label>
        קטגוריה
        <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label>
        המסר במשפט אחד
        <textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      <label>
        שאלת כתיבה
        <textarea rows={2} value={writePrompt} onChange={(e) => setWritePrompt(e.target.value)} />
      </label>
      <label>
        פעולה של שלוש דקות
        <textarea rows={2} value={action} onChange={(e) => setAction(e.target.value)} />
      </label>
      <label>
        משפט הצהרה
        <input value={declaration} onChange={(e) => setDeclaration(e.target.value)} />
      </label>
      <label>
        חיפוש להאזנה (אופציונלי)
        <input value={listenQuery} onChange={(e) => setListenQuery(e.target.value)} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" type="submit">
        שמירת השיר
      </button>
    </form>
  );
}
