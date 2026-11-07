import { useCallback, useEffect, useRef, useState } from 'react';

function ctor(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function speechSupported(): boolean {
  return !!ctor();
}

/** Hebrew speech-to-text. Final phrases are passed to onText. */
export function useSpeech(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const cb = useRef(onText);
  cb.current = onText;

  useEffect(() => () => recRef.current?.stop?.(), []);

  const toggle = useCallback(() => {
    const C = ctor();
    if (!C) return;
    if (recRef.current) {
      recRef.current.stop();
      return;
    }
    const rec = new C();
    rec.lang = 'he-IL';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (ev: any) => {
      let added = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) added += ev.results[i][0].transcript;
      }
      if (added.trim()) cb.current(added.trim());
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
    };
    rec.onerror = () => {
      recRef.current = null;
      setListening(false);
    };
    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      recRef.current = null;
    }
  }, []);

  return { supported: speechSupported(), listening, toggle };
}
