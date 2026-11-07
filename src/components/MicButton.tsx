import { useSpeech } from '../lib/speech';

interface Props {
  onText: (text: string) => void;
  label: string;
  size?: 'md' | 'lg';
}

/** Square record button with a microphone mark. Listens in Hebrew and passes final phrases to onText. */
export function MicButton({ onText, label, size = 'md' }: Props) {
  const { supported, listening, toggle } = useSpeech(onText);
  if (!supported) return null;
  return (
    <button
      type="button"
      className={`mic ${size} ${listening ? 'rec' : ''}`}
      onClick={toggle}
      aria-pressed={listening}
      aria-label={listening ? `עצירת הקלטה: ${label}` : `הקלטה ותמלול: ${label}`}
      title={listening ? 'עצירת הקלטה' : 'הקלטה ותמלול'}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" fill="none" />
      </svg>
      {listening && <span className="mic-ring" aria-hidden="true" />}
    </button>
  );
}
