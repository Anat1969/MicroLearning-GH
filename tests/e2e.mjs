// End-to-end smoke test. Run `npm run build && npm run preview` first, then `npm run test:e2e`.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const SHOTS = process.env.SHOTS_DIR ?? join(process.cwd(), 'tests', 'shots');
mkdirSync(SHOTS, { recursive: true });

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL' });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && !/fonts\.g/.test(m.text()) && consoleErrors.push(m.text()));
page.on('pageerror', (e) => consoleErrors.push(String(e)));

await page.goto(BASE, { waitUntil: 'networkidle' });
check('html lang=he and dir=rtl', (await page.getAttribute('html', 'dir')) === 'rtl' && (await page.getAttribute('html', 'lang')) === 'he');
check('app opens on the vision page', await page.locator('.eyebrow').isVisible());
check('vision shows the five-minute timeline', (await page.locator('.tl-item').count()) === 3);
await page.waitForTimeout(2200);
await page.screenshot({ path: join(SHOTS, 'vision.png') });
const overflowV = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('vision: no horizontal scroll at 390px', overflowV <= 0, `overflow=${overflowV}`);

await page.getByRole('button', { name: 'לשיר של היום' }).click();
check('after vision comes today', await page.getByRole('heading', { level: 1 }).isVisible());
check('haiku shown for the song', await page.getByLabel('הייקו').first().isVisible());
check('generative image shown', (await page.locator('.hero .song-art').count()) === 1);
check('equalizer canvas running', (await page.locator('.hero canvas.eq.on').count()) === 1);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('no horizontal scroll at 390px', overflow <= 0, `overflow=${overflow}`);
await page.waitForTimeout(900);
await page.screenshot({ path: join(SHOTS, 'today.png'), fullPage: true });

await page.locator('#wish').fill('אני צריכה אומץ לראיון מחר');
await page.getByRole('button', { name: 'מצאי שיר' }).click();
check('date number shown on the hero', (await page.locator('.poster-day').innerText()).trim() === String(new Date().getDate()));
check('no yellow marker left', (await page.locator('mark').count()) === 0);
check('wish matched to a category', await page.getByText('הנושא:').isVisible());

await page.getByRole('button', { name: /התחל תרגול|לתרגול של היום/ }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: join(SHOTS, 'practice-listen.png'), fullPage: true });
await page.getByRole('button', { name: 'הבא: כתיבה' }).click();
const writing = 'בדיקה: אני בוחרת צעד קטן היום.';
await page.getByLabel('כתיבה', { exact: true }).fill(writing);
await page.waitForTimeout(150);
check('writing field is visible', await page.getByLabel('כתיבה', { exact: true }).isVisible());
await page.getByRole('button', { name: 'הבא: הצהרה' }).click();

const done = page.getByRole('button', { name: 'סיימתי היום', exact: true });
check('finish disabled before declaration', await done.isDisabled());
await page.getByRole('button', { name: 'אמרתי את זה לעצמי' }).click();
await done.click();
await page.waitForTimeout(400);
check('finish marks entry as saved', await page.getByRole('button', { name: 'סיימתי היום (נשמר)' }).isVisible());
await page.screenshot({ path: join(SHOTS, 'practice-done.png'), fullPage: true });

await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'לשיר של היום' }).click();
await page.getByRole('button', { name: 'יומן' }).click();
check('journal shows saved writing', await page.getByText(writing.slice(0, 20)).isVisible());
await page.getByRole('button', { name: 'היום', exact: true }).click();
check('streak persists after reload', await page.getByText(/רצף:/).isVisible());

await page.getByRole('button', { name: 'הוספת שיר' }).click();
check('add-song explains what happens next', await page.getByLabel('מה קורה אחרי מילוי השדות').isVisible());
check('add-song shows live preview', await page.getByLabel('תצוגה מקדימה').isVisible());
await page.getByRole('button', { name: 'שמירת השיר' }).click();
check('add-song validation shows error', await page.getByRole('alert').isVisible());
await page.waitForTimeout(500);
await page.screenshot({ path: join(SHOTS, 'add-song.png'), fullPage: true });

await page.getByRole('textbox', { name: 'שם השיר', exact: true }).fill('שיר בדיקה');
await page.getByRole('textbox', { name: 'המסר במשפט אחד', exact: true }).fill('אני יכולה להתחיל מחדש בכל בוקר.');
await page.getByRole('textbox', { name: 'שאלת כתיבה', exact: true }).fill('ממה את מתחילה מחר?');
await page.getByRole('textbox', { name: 'משפט הצהרה', exact: true }).fill('כל בוקר הוא התחלה שלי.');
await page.getByRole('button', { name: 'שמירת השיר' }).click();
await page.waitForTimeout(500);
check('after saving: tells when the song appears', await page.getByText('מתי הוא יופיע:').isVisible());
await page.screenshot({ path: join(SHOTS, 'add-song-saved.png'), fullPage: true });

const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desk.goto(BASE, { waitUntil: 'networkidle' });
await desk.waitForTimeout(2200);
await desk.screenshot({ path: join(SHOTS, 'desktop-vision.png') });
await desk.getByRole('button', { name: 'לשיר של היום' }).click();
await desk.waitForTimeout(900);
await desk.screenshot({ path: join(SHOTS, 'desktop-today.png') });

const phone = await browser.newPage({ viewport: { width: 320, height: 640 } });
await phone.goto(BASE, { waitUntil: 'networkidle' });
const o320v = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
await phone.getByRole('button', { name: 'לשיר של היום' }).click();
await phone.waitForTimeout(700);
const o320 = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('no horizontal scroll at 320px', o320 <= 0 && o320v <= 0, `overflow=${o320v}/${o320}`);
await phone.screenshot({ path: join(SHOTS, 'phone320-today.png'), fullPage: true });

check('no console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
await browser.close();

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
