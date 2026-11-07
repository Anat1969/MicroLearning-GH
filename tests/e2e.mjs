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
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
page.on('pageerror', (e) => consoleErrors.push(String(e)));

await page.goto(BASE, { waitUntil: 'networkidle' });
check('html lang=he and dir=rtl', (await page.getAttribute('html', 'dir')) === 'rtl' && (await page.getAttribute('html', 'lang')) === 'he');
check('today song rendered', await page.getByRole('heading', { level: 1 }).isVisible());
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('no horizontal scroll at 390px', overflow <= 0, `overflow=${overflow}`);
await page.screenshot({ path: join(SHOTS, 'today.png'), fullPage: true });

await page.getByRole('button', { name: /התחל תרגול|לתרגול של היום/ }).click();
await page.getByRole('button', { name: 'הבא: כתיבה' }).click();
const writing = 'בדיקה: אני בוחרת צעד קטן היום.';
await page.getByLabel('כתיבה').fill(writing);
await page.waitForTimeout(150);
check('writing field is visible', await page.getByLabel('כתיבה').isVisible());
await page.getByRole('button', { name: 'הבא: הצהרה' }).click();

const done = page.getByRole('button', { name: 'סיימתי היום', exact: true });
check('finish disabled before declaration', await done.isDisabled());
await page.getByRole('button', { name: 'אמרתי את זה לעצמי' }).click();
await done.click();
await page.waitForTimeout(150);
check('finish marks entry as saved', await page.getByRole('button', { name: 'סיימתי היום (נשמר)' }).isVisible());
await page.screenshot({ path: join(SHOTS, 'practice-done.png'), fullPage: true });

await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'יומן' }).click();
check('journal shows saved writing', await page.getByText(writing.slice(0, 20)).isVisible());
await page.getByRole('button', { name: 'היום', exact: true }).click();
check('week meter counts today', await page.getByText('1', { exact: false }).first().isVisible());
check('streak persists after reload', await page.getByText(/רצף:/).isVisible());

await page.getByRole('button', { name: 'הוספת שיר' }).click();
await page.getByRole('button', { name: 'שמירת השיר' }).click();
check('add-song validation shows error', await page.getByRole('alert').isVisible());
await page.screenshot({ path: join(SHOTS, 'add-song.png'), fullPage: true });

const phone = await browser.newPage({ viewport: { width: 320, height: 640 } });
await phone.goto(BASE, { waitUntil: 'networkidle' });
const o320 = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('no horizontal scroll at 320px', o320 <= 0, `overflow=${o320}`);

check('no console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
await browser.close();

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
