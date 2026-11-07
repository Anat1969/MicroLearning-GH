import { useCallback, useEffect, useMemo, useState } from 'react';
import seedSongs from './data/songs.json';
import type { Category, Entry, Song, Store } from './types';
import {
  dateKey,
  emptyEntry,
  formatDate,
  loadStore,
  saveStore,
  shiftKey,
  songForDate,
  streak,
  weekKeys,
} from './lib/store';
import { CATEGORY_MEANING, hueOf } from './lib/tone';
import { matchCategory } from './lib/wish';
import { speechSupported } from './lib/speech';
import { weekInsight } from './lib/insight';
import { buildShareCard } from './lib/shareCard';
import { MicButton } from './components/MicButton';
import { SongArt } from './components/SongArt';
import { Equalizer } from './components/Equalizer';
import { Vision } from './components/Vision';
import { IconAdd, IconJournal, IconToday, IconVision } from './components/icons';

const REQ = (
  <span className="req" aria-label="שדה חובה">
    *
  </span>
);

type View = 'vision' | 'today' | 'practice' | 'journal' | 'add';
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

function appendText(prev: string, add: string): string {
  return prev.trim() ? `${prev.trim()} ${add}` : add;
}

/** First date, from today on, on which the song comes up in the daily rotation. */
function firstDateFor(songId: string, songs: Song[], from: string): string | null {
  for (let i = 0; i < Math.max(songs.length, 1) * 2; i++) {
    const k = shiftKey(from, i);
    if (songForDate(k, songs)?.id === songId) return k;
  }
  return null;
}

export default function App() {
  const [store, setStore] = useState<Store>(() => loadStore());
  const [view, setView] = useState<View>('vision');
  const [activeKey, setActiveKey] = useState<string>(() => dateKey());
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [notice, setNotice] = useState<string>('');
  const [eqLive, setEqLive] = useState(false);
  const [presetCategory, setPresetCategory] = useState<Category | undefined>();

  const today = dateKey();
  const songs: Song[] = useMemo(() => [...(seedSongs as Song[]), ...store.customSongs], [store.customSongs]);

  useEffect(() => {
    const ok = saveStore(store);
    setSaveState(ok ? 'saved' : 'error');
  }, [store]);

  /** The day's song: a song the user picked for that day wins over the rotation. */
  const songOn = useCallback(
    (key: string): Song | undefined => {
      const picked = store.entries[key]?.songId;
      return songs.find((s) => s.id === picked) ?? songForDate(key, songs);
    },
    [songs, store.entries],
  );

  const todaySong = songOn(today);
  const activeSong = songOn(activeKey);
  const stageSong = view === 'practice' ? activeSong : todaySong;
  const hue = hueOf(stageSong?.category);
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

  function pickSongForToday(song: Song) {
    updateEntry(today, song, { songId: song.id });
  }

  function go(next: View) {
    setEqLive(false);
    setView(next);
  }

  function openPractice(key: string) {
    setActiveKey(key);
    go('practice');
  }

  const onEqError = useCallback((msg: string) => {
    setNotice(msg);
    setEqLive(false);
  }, []);

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

  const enter = useCallback(() => setView((v) => (v === 'vision' ? 'today' : v)), []);

  return (
    <div className="app" dir="rtl" style={{ ['--hue' as any]: hue }}>
      <div className="stage" aria-hidden="true">
        <span className="aura a1" />
        <span className="aura a2" />
        <span className="aura a3" />
        <span className="grain" />
      </div>

      <header className="topbar">
            <button className="brand" onClick={() => go('today')} aria-label="חזרה להיום">
              <span className="brand-mark" aria-hidden="true" />
              {APP_NAME}
            </button>
            <nav className="tabs" aria-label="ניווט">
              <button className={view === 'vision' ? 'tab on' : 'tab'} onClick={() => go('vision')} aria-label="החזון">
                <IconVision /> <span>החזון</span>
              </button>
              <button className={view === 'today' ? 'tab on' : 'tab'} onClick={() => go('today')} aria-label="היום">
                <IconToday /> <span>היום</span>
              </button>
              <button className={view === 'journal' ? 'tab on' : 'tab'} onClick={() => go('journal')} aria-label="יומן">
                <IconJournal /> <span>יומן</span>
              </button>
              <button className={view === 'add' ? 'tab on' : 'tab'} onClick={() => { setPresetCategory(undefined); go('add'); }} aria-label="הוספת שיר">
                <IconAdd /> <span>הוספת שיר</span>
              </button>
            </nav>
          </header>

          <main className={view === 'vision' ? 'content vision-wrap' : 'content'} key={view}>
            {view === 'vision' && <Vision onStart={enter} />}

            {view === 'today' && todaySong && (
              <TodayView
                song={todaySong}
                songs={songs}
                entry={todayEntry}
                streak={currentStreak}
                week={week}
                store={store}
                doneThisWeek={doneThisWeek}
                onStart={() => openPractice(today)}
                onRemind={setReminder}
                reminderOn={store.reminder}
                notice={notice}
                today={today}
                hue={hue}
                eqLive={eqLive}
                onEqToggle={() => { setNotice(''); setEqLive((v) => !v); }}
                onEqError={onEqError}
                onPick={pickSongForToday}
                onAddFor={(c) => { setPresetCategory(c); go('add'); }}
              />
            )}

            {view === 'practice' && activeSong && (
              <PracticeView
                key={activeKey}
                song={activeSong}
                entry={store.entries[activeKey]}
                saveState={saveState}
                hue={hue}
                eqLive={eqLive}
                onEqToggle={() => setEqLive((v) => !v)}
                onEqError={onEqError}
                onChange={(patch) => updateEntry(activeKey, activeSong, patch)}
                onBack={() => go('today')}
              />
            )}

            {view === 'journal' && <JournalView store={store} songs={songs} onOpen={openPractice} />}

            {view === 'add' && (
              <AddSongView
                songs={songs}
                today={today}
                presetCategory={presetCategory}
                todayDone={!!todayEntry?.done}
                onAdd={(song) => setStore((prev) => ({ ...prev, customSongs: [...prev.customSongs, song] }))}
                onPractiseNow={(song) => { pickSongForToday(song); openPractice(today); }}
                onDone={() => go('today')}
              />
            )}
          </main>
    </div>
  );
}

function Haiku({ lines, className = '' }: { lines?: string[]; className?: string }) {
  if (!lines || lines.length === 0) return null;
  return (
    <blockquote className={`haiku ${className}`} aria-label="הייקו">
      {lines.map((l, i) => (
        <span key={i} style={{ animationDelay: `${0.25 + i * 0.18}s` }}>
          {l}
        </span>
      ))}
    </blockquote>
  );
}

function EqToggle({ live, onToggle }: { live: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={`ghost small eq-toggle ${live ? 'on' : ''}`} onClick={onToggle} aria-pressed={live}>
      <span className="eq-mini" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {live ? 'עצירת אקולייזר' : 'אקולייזר חי'}
    </button>
  );
}

interface TodayProps {
  song: Song;
  songs: Song[];
  entry: Entry | undefined;
  streak: number;
  week: string[];
  store: Store;
  doneThisWeek: number;
  onStart: () => void;
  onRemind: () => void;
  reminderOn: boolean;
  notice: string;
  today: string;
  hue: number;
  eqLive: boolean;
  onEqToggle: () => void;
  onEqError: (msg: string) => void;
  onPick: (song: Song) => void;
  onAddFor: (c: Category) => void;
}

/** The message, with the key phrase lit (no marker background). */
function Message({ song }: { song: Song }) {
  const idx = song.keyPhrase ? song.message.indexOf(song.keyPhrase) : -1;
  if (idx === -1) return <p className="message">{song.message}</p>;
  return (
    <p className="message">
      {song.message.slice(0, idx)}
      <span className="shine-text key">{song.keyPhrase}</span>
      {song.message.slice(idx + song.keyPhrase.length)}
    </p>
  );
}

function TodayView(p: TodayProps) {
  const done = p.entry?.done ?? false;
  const [y, m, d] = p.today.split('-').map(Number);
  const dayDate = new Date(y, m - 1, d);
  const monthName = dayDate.toLocaleDateString('he-IL', { month: 'long' });
  const weekday = dayDate.toLocaleDateString('he-IL', { weekday: 'long' });
  // Up to three done days in the week before today, newest first: the link between days.
  const thread: { key: string; song: Song }[] = [];
  for (let i = 1; i <= 7 && thread.length < 3; i++) {
    const key = shiftKey(p.today, -i);
    const e = p.store.entries[key];
    const s = e?.done ? p.songs.find((x) => x.id === e.songId) : undefined;
    if (s) thread.push({ key, song: s });
  }
  return (
    <section className="stack today">
      <article className="hero glass rise" style={{ animationDelay: '0.05s' }}>
        <div className="hero-art">
          <SongArt song={p.song} />
          <div className="hero-veil" />
          <div className="hero-head">
            <div className="hero-top">
              <span className="chip">{p.song.category}</span>
              <span className="poster-date" aria-label={`${d} ב${monthName}, ${weekday}`}>
                <span className="poster-day">{d}</span>
                <span className="poster-meta">
                  <strong>{monthName}</strong>
                  <span>{weekday}</span>
                </span>
              </span>
            </div>
            <h1>{p.song.title}</h1>
            <p className="artist">{p.song.artist}</p>
          </div>
          <div className="hero-eq">
            <Equalizer live={p.eqLive} hue={p.hue} onLiveError={p.onEqError} />
          </div>
        </div>
        <div className="hero-body">
          <Message song={p.song} />
          <Haiku lines={p.song.haiku} />
          <p className="legend small">
            <span className="swatch" aria-hidden="true" />
            <span>
              {p.song.category}: {CATEGORY_MEANING[p.song.category]}.
            </span>
          </p>
          <div className="row between">
            <a className="link" href={listenUrl(p.song)} target="_blank" rel="noreferrer">
              האזנה בחיפוש חיצוני
            </a>
            <EqToggle live={p.eqLive} onToggle={p.onEqToggle} />
          </div>
          {p.eqLive && <p className="muted small">האקולייזר מאזין דרך המיקרופון למוזיקה שמתנגנת לידך. שום דבר לא מוקלט ולא נשמר.</p>}
          {!p.song.verified && <p className="muted small">תוכן בטיוטה, לאימות אוצרת.</p>}
        </div>
      </article>

      <button className="primary shine rise" style={{ animationDelay: '0.15s' }} onClick={p.onStart}>
        {done ? 'לתרגול של היום (בוצע)' : 'התחל תרגול, חמש דקות'}
      </button>

      <WishBox songs={p.songs} current={p.song} locked={done} onPick={p.onPick} onAddFor={p.onAddFor} />

      <WeekMeter week={p.week} entries={p.store.entries} today={p.today} streak={p.streak} doneThisWeek={p.doneThisWeek} />

      <p className="insight glass rise" style={{ animationDelay: '0.4s' }}>
        <strong>{weekInsight(p.store.entries, p.week, p.songs)}</strong>
      </p>

      {thread.length > 0 && (
        <section className="thread glass rise" style={{ animationDelay: '0.45s' }}>
          <p className="small muted">הרצף שלך לפני היום</p>
          <ol>
            {thread.map((t) => (
              <li key={t.key}>
                <span className="small muted">{formatDate(t.key)}</span>
                <span>{t.song.practice.declaration}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="row between">
        <button className="ghost small" onClick={p.onRemind} disabled={p.reminderOn}>
          {p.reminderOn ? 'תזכורת פעילה' : 'הפעלת תזכורת'}
        </button>
      </div>
      {p.notice && <p className="muted small">{p.notice}</p>}
    </section>
  );
}

/** "What do you need today?" Spoken or typed, matched to a category, and a song from it is offered. */
function WishBox({
  songs,
  current,
  locked,
  onPick,
  onAddFor,
}: {
  songs: Song[];
  current: Song;
  locked: boolean;
  onPick: (s: Song) => void;
  onAddFor: (c: Category) => void;
}) {
  const [text, setText] = useState('');
  const [asked, setAsked] = useState(false);
  const category = asked ? matchCategory(text) : null;
  const match = category ? songs.find((s) => s.category === category && s.id !== current.id) ?? songs.find((s) => s.category === category) : undefined;

  return (
    <section className="glass wish rise" style={{ animationDelay: '0.25s' }} aria-label="מה את צריכה היום">
      <label className="wish-label" htmlFor="wish">
        <strong>מה את צריכה היום?</strong>
        <span className="muted small">{speechSupported() ? 'אפשר להקליד, או ללחוץ על המיקרופון ולדבר.' : 'כתבי במילים שלך.'}</span>
      </label>
      <form
        className="wish-row"
        onSubmit={(e) => {
          e.preventDefault();
          setAsked(true);
        }}
      >
        <input
          id="wish"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setAsked(false);
          }}
          placeholder="למשל: אומץ לראיון"
        />
        <MicButton
          label="מה את צריכה היום"
          size="lg"
          onText={(t) => {
            setText((prev) => appendText(prev, t));
            setAsked(true);
          }}
        />
        <button className="primary inline" type="submit" disabled={!text.trim()}>
          מצאי שיר
        </button>
      </form>
      {asked && !category && <p className="small muted">לא זיהיתי נושא. נסי מילה כמו אומץ, רוגע, עבודה, משבר או אהבה עצמית.</p>}
      {asked && category && match && (
        <div className="wish-result">
          <span className="small">
            הנושא: <strong>{category}</strong>
          </span>
          {match.id === current.id ? (
            <span className="small">השיר של היום כבר מתאים: {match.title}.</span>
          ) : locked ? (
            <span className="small">מחר אפשר לבחור את "{match.title}". את התרגול של היום כבר סיימת.</span>
          ) : (
            <button className="ghost small" onClick={() => onPick(match)}>
              להחליף להיום: {match.title}
            </button>
          )}
        </div>
      )}
      {asked && category && !match && (
        <div className="wish-result">
          <span className="small">
            עוד אין שיר בנושא <strong>{category}</strong>.
          </span>
          <button className="ghost small" onClick={() => onAddFor(category)}>
            להוסיף שיר בנושא הזה
          </button>
        </div>
      )}
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
    <section className="glass meter rise" style={{ animationDelay: '0.35s' }} aria-label="התקדמות שבועית">
      <div className="meter-head">
        <span>
          <strong className="num">{doneThisWeek}</strong> מתוך 7 השבוע
        </span>
        <span>
          רצף: <strong className="num">{streak}</strong> ימים
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
  hue,
  eqLive,
  onEqToggle,
  onEqError,
  onChange,
  onBack,
}: {
  song: Song;
  entry: Entry | undefined;
  saveState: 'idle' | 'saved' | 'error';
  hue: number;
  eqLive: boolean;
  onEqToggle: () => void;
  onEqError: (msg: string) => void;
  onChange: (patch: Partial<Entry>) => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [seconds, setSeconds] = useState<number>(WRITE_SECONDS);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (seconds <= 0) {
      setRunning(false);
      return;
    }
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [running, seconds]);

  const mm = String(Math.floor(seconds / 60));
  const ss = String(seconds % 60).padStart(2, '0');
  const progress = 1 - seconds / WRITE_SECONDS;

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
        <article className="hero glass rise" key="s1">
          <div className="hero-art short">
            <SongArt song={song} />
            <div className="hero-veil" />
            <div className="hero-head">
              <p className="small step-label">שלב 1 מתוך 3, דקה אחת</p>
              <h2>{song.title}</h2>
            </div>
            <div className="hero-eq">
              <Equalizer live={eqLive} hue={hue} onLiveError={onEqError} />
            </div>
          </div>
          <div className="hero-body">
            <Message song={song} />
            <Haiku lines={song.haiku} />
            <div className="row between">
              <a className="link" href={listenUrl(song)} target="_blank" rel="noreferrer">
                האזנה לשיר
              </a>
              <EqToggle live={eqLive} onToggle={onEqToggle} />
            </div>
            <button className="primary shine" onClick={() => setStep(2)}>
              הבא: כתיבה
            </button>
          </div>
        </article>
      )}

      {step === 2 && (
        <article className="glass card rise" key="s2">
          <p className="small muted">שלב 2 מתוך 3, שלוש דקות</p>
          <p className="prompt">{song.practice.writePrompt}</p>
          <div className="row between">
            <span className="timer" aria-live="off" style={{ ['--p' as any]: progress }}>
              <span className="timer-ring" aria-hidden="true" />
              {mm}:{ss}
            </span>
            <button className="ghost small" onClick={() => setRunning((r) => !r)} disabled={seconds === 0}>
              {running ? 'השהיה' : seconds === WRITE_SECONDS ? 'התחלה' : 'המשך'}
            </button>
          </div>
          <div className="field-wrap">
            <textarea
              className="write"
              value={entry?.writing ?? ''}
              onChange={(e) => onChange({ writing: e.target.value })}
              placeholder="כתבי כאן, או לחצי על המיקרופון ודברי. הטקסט נשמר אוטומטית."
              rows={6}
              aria-label="כתיבה"
            />
            <div className="field-mic">
              <MicButton label="כתיבה" onText={(t) => onChange({ writing: appendText(entry?.writing ?? '', t) })} />
            </div>
          </div>
          <div className="row between">
            <span className="small muted">{speechSupported() ? 'המיקרופון מתמלל לעברית ומוסיף לטקסט.' : 'ההקלטה לא נתמכת בדפדפן הזה. אפשר לכתוב ידנית.'}</span>
            <button className="primary inline" onClick={() => setStep(3)}>
              הבא: הצהרה
            </button>
          </div>
        </article>
      )}

      {step === 3 && (
        <article className="glass card rise" key="s3">
          <p className="small muted">שלב 3 מתוך 3, דקה אחת</p>
          <p className="action">{song.practice.action}</p>
          <p className="declaration shine-text">{song.practice.declaration}</p>
          {!entry?.declared ? (
            <button className="ghost" onClick={() => onChange({ declared: true })}>
              אמרתי את זה לעצמי
            </button>
          ) : (
            <p className="small">ההצהרה נרשמה.</p>
          )}
          <button
            className="primary shine"
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
      <section className="glass card rise">
        <h2>היומן ריק</h2>
        <p>כשתסיימי תרגול, הוא יופיע כאן עם הכתיבה שלך.</p>
      </section>
    );
  }
  return (
    <section className="stack">
      {keys.map((k, i) => {
        const e = store.entries[k];
        const song = songs.find((s) => s.id === e.songId);
        return (
          <button key={k} className="glass journal-item rise" style={{ animationDelay: `${i * 0.05}s` }} onClick={() => onOpen(k)}>
            {song && <SongArt song={song} className="thumb" />}
            <span className="journal-text">
              <span className="small muted">{formatDate(k)}</span>
              <strong>{song?.title ?? 'שיר שהוסר'}</strong>
              <span className={`small ${e.done ? 'ok' : 'muted'}`}>{e.done ? 'בוצע' : 'לא הושלם'}</span>
              {e.writing && <span className="excerpt">{e.writing.slice(0, 120)}</span>}
            </span>
          </button>
        );
      })}
    </section>
  );
}

interface FieldProps {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  required?: boolean;
  placeholder?: string;
}

/** A form field that explains where its text goes, with a record button for dictation. */
function Field({ label, hint, value, onChange, multiline, required, placeholder }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <> {REQ}</>}
      </span>
      <span className="field-hint">{hint}</span>
      <span className="field-wrap">
        {multiline ? (
          <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} />
        ) : (
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} />
        )}
        <span className="field-mic">
          <MicButton label={label} onText={(t) => onChange(appendText(value, t))} />
        </span>
      </span>
    </label>
  );
}

function AddSongView({
  songs,
  today,
  presetCategory,
  todayDone,
  onAdd,
  onPractiseNow,
  onDone,
}: {
  songs: Song[];
  today: string;
  presetCategory?: Category;
  todayDone: boolean;
  onAdd: (song: Song) => void;
  onPractiseNow: (song: Song) => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [category, setCategory] = useState<Category>(presetCategory ?? 'ביטחון עצמי');
  const [message, setMessage] = useState('');
  const [listenQuery, setListenQuery] = useState('');
  const [writePrompt, setWritePrompt] = useState('');
  const [action, setAction] = useState('');
  const [declaration, setDeclaration] = useState('');
  const [haiku, setHaiku] = useState(['', '', '']);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<Song | null>(null);
  const [previewId] = useState(() => `c-${Date.now()}`);

  const draft: Song = {
    id: previewId,
    title: title.trim() || 'שם השיר',
    artist: artist.trim() || 'מבצע',
    category,
    message: message.trim() || 'המסר במשפט אחד יופיע כאן.',
    listenQuery: listenQuery.trim() || `${title.trim()} ${artist.trim()}`.trim(),
    practice: {
      writePrompt: writePrompt.trim(),
      action: action.trim() || 'עמדי מול המראה ואמרי את ההצהרה בקול.',
      declaration: declaration.trim(),
    },
    keyPhrase: message.trim(),
    verified: false,
    haiku: haiku.some((l) => l.trim()) ? haiku.map((l) => l.trim()).filter(Boolean) : undefined,
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim() || !writePrompt.trim() || !declaration.trim()) {
      setError('חסרים שדות חובה: שם השיר, מסר, שאלת כתיבה והצהרה.');
      return;
    }
    setError('');
    const song = { ...draft, title: title.trim(), artist: artist.trim() || 'לא צוין' };
    onAdd(song);
    setSaved(song);
  }

  if (saved) {
    const all = [...songs.filter((s) => s.id !== saved.id), saved];
    const first = firstDateFor(saved.id, all, today);
    return (
      <section className="stack">
        <article className="hero glass rise">
          <div className="hero-art short">
            <SongArt song={saved} />
            <div className="hero-veil" />
            <div className="hero-head">
              <span className="chip">{saved.category}</span>
              <h2>{saved.title}</h2>
            </div>
          </div>
          <div className="hero-body">
            <p className="message">השיר נכנס לסבב הימים.</p>
            <ol className="next-steps">
              <li>
                <strong>מתי הוא יופיע:</strong> {first ? (first === today ? 'כבר היום, במסך "היום".' : `${formatDate(first)}, במסך "היום".`) : 'בסבב הקרוב.'}
              </li>
              <li>
                <strong>מה יקרה ביום שלו:</strong> המסר, ההייקו והתמונה יופיעו למעלה, והשאלה וההצהרה שכתבת יהפכו לתרגול של חמש דקות.
              </li>
              <li>
                <strong>איפה הוא נשמר:</strong> במכשיר הזה בלבד, עם הסימון "לאימות אוצרת".
              </li>
            </ol>
            {!todayDone && (
              <button className="primary shine" onClick={() => onPractiseNow(saved)}>
                לתרגל אותו כבר עכשיו
              </button>
            )}
            <button className="ghost" onClick={onDone}>
              חזרה להיום
            </button>
          </div>
        </article>
      </section>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <section className="glass card rise how">
        <h2>הוספת שיר</h2>
        <p className="lead-line">
          <strong>מכל שיר נבנה תרגול של חמש דקות.</strong>
        </p>
        <ol className="how-steps" aria-label="מה קורה אחרי מילוי השדות">
          <li>
            <span className="how-n">1</span>
            <span>
              <strong>ממלאים</strong> שם, מסר, שאלה והצהרה. אפשר להקליד, או ללחוץ על המיקרופון ולדבר.
            </span>
          </li>
          <li>
            <span className="how-n">2</span>
            <span>
              <strong>שומרים.</strong> השיר נכנס לסבב הימים, ומקבל תמונה משלו בצבע הנושא.
            </span>
          </li>
          <li>
            <span className="how-n">3</span>
            <span>
              <strong>ביום שלו</strong> הוא מופיע במסך "היום": האזנה, כתיבה לפי השאלה, והצהרה בקול.
            </span>
          </li>
        </ol>
        <p className="small muted">{REQ} שדה חובה</p>
      </section>

      <section className="glass card rise preview-card" style={{ animationDelay: '0.08s' }} aria-label="תצוגה מקדימה">
        <p className="small muted">ככה הוא ייראה במסך "היום":</p>
        <div className="preview">
          <SongArt song={draft} className="preview-art" />
          <div className="preview-text">
            <span className="chip">{draft.category}</span>
            <strong>{draft.title}</strong>
            <span className="small">{draft.message}</span>
          </div>
        </div>
      </section>

      <section className="glass card rise" style={{ animationDelay: '0.14s' }}>
        <Field label="שם השיר" hint="הכותרת הגדולה במסך היום." value={title} onChange={setTitle} required />
        <Field label="מבצע" hint="מופיע מתחת לשם השיר." value={artist} onChange={setArtist} />
        <label className="field">
          <span className="field-label">נושא</span>
          <span className="field-hint">קובע את צבע התמונה, ואת ההתאמה לשאלה "מה את צריכה היום".</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <Field label="המסר במשפט אחד" hint="המשפט שמופיע מתחת לתמונה. מה השיר אומר לי." value={message} onChange={setMessage} multiline required />
        <Field label="שאלת כתיבה" hint="שלב 2: על השאלה הזו כותבים שלוש דקות." value={writePrompt} onChange={setWritePrompt} multiline required />
        <Field label="פעולה של דקה" hint="שלב 3: מה עושים לפני שאומרים את ההצהרה." value={action} onChange={setAction} multiline placeholder="עמדי מול המראה ואמרי את ההצהרה בקול." />
        <Field label="משפט הצהרה" hint="שלב 3: המשפט הגדול שאומרים בקול." value={declaration} onChange={setDeclaration} required />
        <Field label="חיפוש להאזנה" hint="מה לחפש ביוטיוב. אם ריק, נחפש לפי שם השיר והמבצע." value={listenQuery} onChange={setListenQuery} />
      </section>

      <section className="glass card rise" style={{ animationDelay: '0.2s' }}>
        <span className="field-label">הייקו לשיר (לא חובה)</span>
        <span className="field-hint">שלוש שורות, 5, 7 ו-5 הברות. כתיבה מקורית, לא מילות השיר.</span>
        {[0, 1, 2].map((i) => (
          <Field
            key={i}
            label={`שורה ${i + 1}`}
            hint={i === 1 ? '7 הברות' : '5 הברות'}
            value={haiku[i]}
            onChange={(v) => setHaiku((h) => h.map((x, j) => (j === i ? v : x)))}
          />
        ))}
      </section>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary shine" type="submit">
        שמירת השיר
      </button>
    </form>
  );
}
