import type { Song } from '../types';
import { CATEGORY_TONE } from './tone';

const W = 1080;
const H = 1350;
const FONT = '"Segoe UI", Heebo, Arial, sans-serif';
const MARKER = '#fff1a8';

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
  const right = W - 110;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  // פס צבע של התחום בקצה הימני: הצבע מסמן משמעות, לא קישוט.
  ctx.fillStyle = tone;
  ctx.fillRect(W - 28, 0, 28, H);

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';

  ctx.fillStyle = '#6b6b6b';
  ctx.font = `500 42px ${FONT}`;
  ctx.fillText('שיר היום', right, 110);

  ctx.fillStyle = tone;
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText(song.category, right, 176);

  ctx.fillStyle = '#111111';
  ctx.font = `800 104px ${FONT}`;
  const titleLines = wrapLines(ctx, song.title, W - 260);
  let y = 300;
  for (const line of titleLines) {
    ctx.fillText(line, right, y);
    y += 120;
  }

  // ההצהרה מקבלת מרקר צהוב, בדיוק כמו התובנה במסך.
  ctx.font = `700 58px ${FONT}`;
  const declLines = wrapLines(ctx, song.practice.declaration, W - 260);
  let dy = y + 110;
  const lineH = 84;
  for (const line of declLines) {
    const w = ctx.measureText(line).width;
    ctx.fillStyle = MARKER;
    ctx.fillRect(right - w - 10, dy + 14, w + 20, lineH - 20);
    ctx.fillStyle = '#111111';
    ctx.fillText(line, right, dy);
    dy += lineH;
  }

  ctx.fillStyle = '#6b6b6b';
  ctx.font = `500 38px ${FONT}`;
  ctx.fillText(dateLabel, right, H - 220);

  ctx.fillStyle = '#111111';
  ctx.font = `600 36px ${FONT}`;
  ctx.fillText("אד' ענת שטיבלמן A&I", right, H - 130);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}
