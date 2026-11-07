import type { Category } from '../types';

/**
 * גוון לכל תחום. לכל צבע משמעות אחת: מה התחום מבקש מהמשתמשת.
 * הגוון מופיע בכל מקום שבו מופיע התחום: הבמה, התמונה, השבב, המקרא, האקולייזר וכרטיס השיתוף.
 * בלי צהוב ובלי אדום (בקשת ענת, 07.11.2026).
 */
export const CATEGORY_HUE: Record<Category, number> = {
  'ביטחון עצמי': 262,
  'התגברות על משבר': 174,
  'אהבה עצמית': 328,
  קריירה: 140,
  רוגע: 205,
};

export const CATEGORY_TONE: Record<Category, string> = Object.fromEntries(
  Object.entries(CATEGORY_HUE).map(([c, h]) => [c, `hsl(${h} 85% 72%)`]),
) as Record<Category, string>;

export const CATEGORY_MEANING: Record<Category, string> = {
  'ביטחון עצמי': 'לעמוד מול עצמך בלי לחפש אישור',
  'התגברות על משבר': 'לעבור קושי צעד אחרי צעד',
  'אהבה עצמית': 'לדבר אל עצמך בחמימות',
  קריירה: 'להזיז דבר מקצועי אחד קדימה',
  רוגע: 'להוריד קצב ולהקשיב פנימה',
};

export function hueOf(category: Category | undefined): number {
  return category ? CATEGORY_HUE[category] ?? 262 : 262;
}
