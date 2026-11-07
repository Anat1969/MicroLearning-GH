import { useMemo } from 'react';
import type { Song } from '../types';
import { seeded } from '../lib/theme';
import { hueOf } from '../lib/tone';

/**
 * Generative cover for a song. Built from the song id (shape) and its category (hue),
 * so every song, including one a user adds, gets its own image with no external service.
 * Motif: sound waves over a horizon, a light source, and drifting color fields.
 */
export function SongArt({ song, className = '' }: { song: Song; className?: string }) {
  const art = useMemo(() => {
    const r = seeded(song.id + song.title);
    const h = hueOf(song.category);
    const blobs = Array.from({ length: 4 }, (_, i) => ({
      cx: 40 + r() * 320,
      cy: 30 + r() * 150,
      rad: 60 + r() * 90,
      hue: (h + [0, 38, -34, 70][i] + 360) % 360,
      dur: 14 + r() * 12,
    }));
    const sun = { cx: 70 + r() * 260, cy: 70 + r() * 50, rad: 18 + r() * 16 };
    const waves = Array.from({ length: 6 }, (_, i) => {
      const y = 150 + i * 13;
      const amp = 6 + r() * 14 - i;
      const freq = 1.5 + r() * 2.5;
      const phase = r() * Math.PI * 2;
      let d = `M0 ${y}`;
      for (let x = 0; x <= 400; x += 10) {
        d += ` L${x} ${(y + Math.sin((x / 400) * Math.PI * 2 * freq + phase) * amp).toFixed(1)}`;
      }
      return { d, op: 0.75 - i * 0.1 };
    });
    return { h, blobs, sun, waves };
  }, [song.id, song.title, song.category]);

  const gid = `g-${song.id}`;
  return (
    <svg className={`song-art ${className}`} viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`תמונה גנרטיבית לשיר ${song.title}`}>
      <defs>
        <linearGradient id={`${gid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`hsl(${art.h} 55% 10%)`} />
          <stop offset="1" stopColor={`hsl(${(art.h + 40) % 360} 60% 20%)`} />
        </linearGradient>
        <radialGradient id={`${gid}-sun`}>
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor={`hsl(${art.h} 90% 80%)`} stopOpacity="0.7" />
          <stop offset="1" stopColor={`hsl(${art.h} 90% 70%)`} stopOpacity="0" />
        </radialGradient>
        <filter id={`${gid}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="28" />
        </filter>
      </defs>
      <rect width="400" height="240" fill={`url(#${gid}-bg)`} />
      <g filter={`url(#${gid}-blur)`}>
        {art.blobs.map((b, i) => (
          <circle
            key={i}
            className="drift"
            style={{ animationDuration: `${b.dur}s`, animationDelay: `${-i * 3}s` }}
            cx={b.cx}
            cy={b.cy}
            r={b.rad}
            fill={`hsl(${b.hue} 80% 55%)`}
            opacity="0.55"
          />
        ))}
      </g>
      <circle cx={art.sun.cx} cy={art.sun.cy} r={art.sun.rad * 3} fill={`url(#${gid}-sun)`} />
      {art.waves.map((w, i) => (
        <path key={i} d={w.d} fill="none" stroke={`hsl(${art.h} 90% 85%)`} strokeOpacity={w.op} strokeWidth={1.4} />
      ))}
    </svg>
  );
}
