// בדיקת הרצף בין הימים: ימים שבוצעו קודם מוצגים מתחת לפוסטר, מהחדש לישן.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const SHOTS = process.env.SHOTS_DIR ?? join(process.cwd(), 'tests', 'shots');
mkdirSync(SHOTS, { recursive: true });

const pad = (n) => String(n).padStart(2, '0');
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return key(d); };

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL' })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(BASE, { waitUntil: 'networkidle' });

const entries = {
  [daysAgo(1)]: { date: daysAgo(1), songId: 's-001', done: true, writing: '', declared: true, doneAt: new Date().toISOString() },
  [daysAgo(3)]: { date: daysAgo(3), songId: 's-002', done: true, writing: '', declared: true, doneAt: new Date().toISOString() },
};
await page.evaluate((e) => localStorage.setItem('mdk.v1', JSON.stringify({ entries: e, customSongs: [], reminder: false })), entries);
await page.reload({ waitUntil: 'networkidle' });

const items = await page.locator('.thread li').allInnerTexts();
const pass = items.length === 2 && errors.length === 0;
console.log(`${pass ? 'PASS' : 'FAIL'}  day thread shows 2 past done days :: ${JSON.stringify(items)}`);
await page.screenshot({ path: join(SHOTS, 'thread.png'), fullPage: true });
await browser.close();
process.exit(pass ? 0 : 1);
