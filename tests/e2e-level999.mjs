// בדיקות רמה 999: כרטיס שיתוף, תובנה שבועית, מקרא, PWA. להרצה מול vite preview או הכתובת החיה.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const SHOTS = process.env.SHOTS_DIR ?? join(process.cwd(), 'tests', 'shots');
mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'היום', exact: true }).click();

const manifest = await page.evaluate(async () => {
  const r = await fetch('/manifest.webmanifest');
  return { status: r.status, json: await r.json() };
});
check('manifest is served and in Hebrew RTL', manifest.status === 200 && manifest.json.lang === 'he' && manifest.json.dir === 'rtl');

const icon = await page.evaluate(async () => (await fetch('/icon.svg')).status);
check('icon is served', icon === 200);

const dayText = await page.locator('.poster-day').innerText();
const expectedDay = String(new Date().getDate());
check('hero shows today day number', dayText.trim() === expectedDay, `got ${dayText}, want ${expectedDay}`);

const insight = await page.locator('.insight').innerText();
check('weekly insight is computed', insight.includes('השבוע') || insight.includes('בוצעו'), insight);

const legend = await page.locator('.legend').innerText();
check('legend explains the category color', legend.includes(':'), legend);

await page.getByRole('button', { name: /התחל תרגול|לתרגול של היום/ }).click();
await page.getByRole('button', { name: 'הבא: כתיבה' }).click();
await page.getByLabel('כתיבה', { exact: true }).fill('טיוטה פרטית שלא תשותף בכרטיס.');
await page.getByRole('button', { name: 'הבא: הצהרה' }).click();
await page.getByRole('button', { name: 'אמרתי את זה לעצמי' }).click();
await page.getByRole('button', { name: 'סיימתי היום', exact: true }).click();

const img = page.locator('img.card-preview');
await img.waitFor({ timeout: 10000 });
const natural = await img.evaluate((el) => ({ w: el.naturalWidth, h: el.naturalHeight }));
check('share card renders as a 4:5 PNG', natural.w === 1080 && natural.h === 1350, JSON.stringify(natural));
check('share card button is present', await page.getByRole('button', { name: 'שיתוף כרטיס' }).isVisible());

await page.locator('.share').screenshot({ path: join(SHOTS, 'share-card.png') });
await page.getByRole('button', { name: 'היום', exact: true }).click();
await page.screenshot({ path: join(SHOTS, 'today-999.png'), fullPage: true });

const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('no horizontal scroll after changes', overflow <= 0, `overflow=${overflow}`);
check('no console or page errors', errors.length === 0, errors.join(' | '));

await browser.close();
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
