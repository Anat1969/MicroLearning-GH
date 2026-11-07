import type { Song } from '../types';
import { CATEGORY_HUE, CATEGORY_TONE } from './tone';

const W = 1080;
const H = 1350;
const FONT = '"Segoe UI", Heebo, Arial, sans-serif';

/** מחלק טקסט לשורות לפי רוחב מקסימלי, בעברית מימין לשמאל. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * כרטיס שיתוף 4:5. מציג רק את שם השיר, התחום והצהרה, ולא את הכתיבה הפרטית.
 * הטקסט בתמונה נשען על גופנים מערכתיים, כך שאין תלות ברשת.
 */
export async function buildShareCard(song: Song, dateLabel: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas not supported');

  const tone = CATEGORY_TONE[song.category];
  const hue = CATEGORY_HUE[song.category];
  const right = W - 110;

  // במה כהה בגוון התחום, עם שדות אור רכים: אותה שפה כמו המסך.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, `hsl(${hue} 55% 9%)`);
  bg.addColorStop(1, `hsl(${(hue + 40) % 360} 60% 18%)`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glows: [number, number, number, number][] = [
    [W * 0.8, H * 0.12, 520, hue],
    [W * 0.15, H * 0.85, 460, (hue + 45) % 360],
  ];
  for (const [x, y, r, h] of glows) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `hsla(${h}, 85%, 55%, 0.55)`);
    g.addColorStop(1, `hsla(${h}, 85%, 55%, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `500 42px ${FONT}`;
  ctx.fillText('שיר היום', right, 110);

  ctx.fillStyle = tone;
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText(song.category, right, 176);

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 104px ${FONT}`;
  const titleLines = wrapLines(ctx, song.title, W - 260);
  let y = 300;
  for (const line of titleLines) {
    ctx.fillText(line, right, y);
    y += 120;
  }

  // ההצהרה בלבן מודגש, בלי מרקר.
  ctx.font = `700 58px ${FONT}`;
  const declLines = wrapLines(ctx, song.practice.declaration, W - 260);
  let dy = y + 90;
  for (const line of declLines) {
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, right, dy);
    dy += 84;
  }

  if (song.haiku?.length) {
    ctx.font = `300 46px ${FONT}`;
    let hy = dy + 70;
    song.haiku.forEach((line, i) => {
      ctx.fillStyle = i === 2 ? tone : 'rgba(255,255,255,0.78)';
      ctx.fillText(line, right - i * 40, hy);
      hy += 66;
    });
  }

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `500 38px ${FONT}`;
  ctx.fillText(dateLabel, right, H - 220);

  ctx.fillStyle = '#ffffff';
  ctx.font = `600 36px ${FONT}`;
  ctx.fillText("אד' ענת שטיבלמן A&I", right, H - 130);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}
