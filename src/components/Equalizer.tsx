import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../lib/theme';

interface Props {
  live: boolean;
  hue: number;
  onLiveError?: (msg: string) => void;
  bars?: number;
}

/**
 * Equalizer bars. Idle: a slow synthetic breath. Live: reacts to sound the microphone hears
 * (the music playing in the room). Nothing is recorded or stored.
 * The overall level is written to the --level CSS variable, so the whole stage moves with the music.
 */
export function Equalizer({ live, hue, onLiveError, bars = 32 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let stopped = false;
    let analyser: AnalyserNode | null = null;
    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let data = new Uint8Array(0);
    const smooth = new Float32Array(bars);
    const reduced = prefersReducedMotion();
    const root = document.documentElement;

    function size() {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;
      canvas!.width = Math.max(1, Math.round(w * dpr));
      canvas!.height = Math.max(1, Math.round(h * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(size) : null;
    ro?.observe(canvas);

    async function startLive() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AC();
        const src = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.78;
        src.connect(analyser);
        data = new Uint8Array(analyser.frequencyBinCount);
        if (reduced) raf = requestAnimationFrame(frame);
      } catch {
        onLiveError?.('אין גישה למיקרופון. האקולייזר ממשיך בתנועת נשימה.');
      }
    }
    if (live) startLive();

    function frame(tms: number) {
      const t = tms / 1000;
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;
      ctx!.clearRect(0, 0, w, h);
      let sum = 0;
      if (analyser) analyser.getByteFrequencyData(data);
      for (let i = 0; i < bars; i++) {
        let v: number;
        if (analyser && data.length) {
          // Log spread: more bars for low and mid frequencies, where music lives.
          const idx = Math.min(data.length - 1, Math.floor(Math.pow(i / bars, 1.6) * data.length * 0.85));
          v = data[idx] / 255;
        } else {
          v = reduced ? 0.22 : 0.18 + 0.12 * Math.sin(t * 1.2 + i * 0.45) + 0.06 * Math.sin(t * 2.3 + i * 1.3);
        }
        smooth[i] += (v - smooth[i]) * 0.35;
        sum += smooth[i];
      }
      const level = sum / bars;
      root.style.setProperty('--level', level.toFixed(3));

      const gap = 3;
      const bw = (w - gap * (bars - 1)) / bars;
      const grad = ctx!.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, `hsla(${hue}, 85%, 60%, 0.9)`);
      grad.addColorStop(0.7, `hsla(${(hue + 30) % 360}, 90%, 75%, 0.95)`);
      grad.addColorStop(1, 'rgba(255,255,255,1)');
      ctx!.fillStyle = grad;
      ctx!.shadowColor = `hsla(${hue}, 90%, 65%, 0.7)`;
      ctx!.shadowBlur = 12;
      // Mirrored from the center, so the music spreads outward.
      for (let i = 0; i < bars; i++) {
        const k = Math.abs(i - (bars - 1) / 2) / (bars / 2);
        const src = Math.floor(k * (bars - 1));
        const bh = Math.max(3, smooth[src] * h);
        const x = i * (bw + gap);
        const y = h - bh;
        const rr = Math.min(bw / 2, 4);
        ctx!.beginPath();
        if ((ctx as any).roundRect) (ctx as any).roundRect(x, y, bw, bh, [rr, rr, 1, 1]);
        else ctx!.rect(x, y, bw, bh);
        ctx!.fill();
      }
      if (!stopped && (!reduced || analyser)) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    setReady(true);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      stream?.getTracks().forEach((tr) => tr.stop());
      audioCtx?.close().catch(() => undefined);
      root.style.setProperty('--level', '0');
    };
  }, [live, hue, bars, onLiveError]);

  return <canvas ref={canvasRef} className={`eq ${ready ? 'on' : ''} ${live ? 'live' : ''}`} aria-hidden="true" />;
}
