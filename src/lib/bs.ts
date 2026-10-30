import NepaliDate from 'nepali-date-converter';
import type { Lang } from './types';

// All Bikram Sambat conversion goes through this file. If the calendar data
// in the library disagrees with the official Nepal calendar for a year
// (seen: library gives Kartik 13 for 30 Oct 2026, htpkhabar.com shows Kartik 14),
// fix it here once rather than across the app.

const fmtLang = (lang: Lang) => (lang === 'en' ? 'en' : 'np');

export function bsYear(d = new Date()): number {
  return new NepaliDate(d).getYear();
}

/** e.g. "२०८३ कार्तिक १३" / "2083 Kartik 13" */
export function bsDate(iso: string | Date, lang: Lang): string {
  return new NepaliDate(new Date(iso)).format('YYYY MMMM DD', fmtLang(lang));
}

/** e.g. "कार्तिक १३" */
export function bsShort(iso: string | Date, lang: Lang): string {
  return new NepaliDate(new Date(iso)).format('MMMM D', fmtLang(lang));
}

/** e.g. "२०८३ कार्तिक १३, शुक्रबार" */
export function bsLong(iso: string | Date, lang: Lang): string {
  return new NepaliDate(new Date(iso)).format('YYYY MMMM DD, ddd', fmtLang(lang));
}

/** Nepal Time clock, e.g. "18:42" */
export function nptTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kathmandu' }).format(new Date(iso));
}

const NE_DIGITS = '०१२३४५६७८९';
export function toNeDigits(s: string | number, lang: Lang): string {
  const str = String(s);
  return lang === 'en' ? str : str.replace(/[0-9]/g, (c) => NE_DIGITS[Number(c)]);
}

export function timeAgo(iso: string, lang: Lang): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return lang === 'en' ? `${mins} min ago` : `${toNeDigits(mins, lang)} मिनेटअघि`;
  const h = Math.round(mins / 60);
  if (h < 24) return lang === 'en' ? `${h} h ago` : `${toNeDigits(h, lang)} घण्टाअघि`;
  return bsShort(iso, lang);
}
