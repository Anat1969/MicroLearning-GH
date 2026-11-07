import type { Category } from '../types';

const KEYWORDS: Record<Category, string[]> = {
  'ביטחון עצמי': ['ביטחון', 'אומץ', 'להאמין', 'פחד', 'חזקה', 'כוח', 'בחירה', 'לבחור', 'מסוגלת', 'להעז'],
  'התגברות על משבר': ['משבר', 'קשה', 'כאב', 'פרידה', 'אובדן', 'לחכות', 'מחכה', 'תקועה', 'עצב', 'עצובה', 'נשבר'],
  'אהבה עצמית': ['לאהוב', 'אהבה', 'עצמי', 'גוף', 'מראה', 'לסלוח', 'חמלה', 'יפה', 'ראויה'],
  קריירה: ['עבודה', 'קריירה', 'ראיון', 'בוס', 'כסף', 'פרויקט', 'הצלחה', 'לימודים', 'מבחן', 'מקצוע'],
  רוגע: ['רוגע', 'לחץ', 'חרדה', 'לנשום', 'נשימה', 'שקט', 'עייפה', 'מנוחה', 'שינה', 'לנוח'],
};

/** Keyword match of a free-text wish to a category. Returns null when nothing matches. */
export function matchCategory(text: string): Category | null {
  const t = text.replace(/[֑-ׇ]/g, '');
  let best: Category | null = null;
  let bestScore = 0;
  (Object.keys(KEYWORDS) as Category[]).forEach((c) => {
    const score = KEYWORDS[c].filter((k) => t.includes(k)).length;
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  });
  return best;
}
