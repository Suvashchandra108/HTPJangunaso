import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ne from './locales/ne.json';
import en from './locales/en.json';
import mai from './locales/mai.json';
import type { Lang } from './lib/types';

const STORE = 'htp-janagunaso-lang';
const saved = (() => { try { return localStorage.getItem(STORE) as Lang | null; } catch { return null; } })();

i18n.use(initReactI18next).init({
  resources: { ne: { translation: ne }, en: { translation: en }, mai: { translation: mai } },
  lng: saved ?? 'ne',
  // Maithili strings that are not translated yet fall back to Nepali, never to a blank.
  fallbackLng: { mai: ['ne'], en: ['ne'], default: ['ne'] },
  interpolation: { escapeValue: false },
  returnNull: false,
});

const setHtmlLang = (l: string) => { document.documentElement.lang = l; };
setHtmlLang(i18n.language);

/** Switching language only swaps labels: form state lives outside i18n, so nothing typed is lost. */
export function setLanguage(l: Lang) {
  i18n.changeLanguage(l);
  setHtmlLang(l);
  try { localStorage.setItem(STORE, l); } catch { /* ignore */ }
}

export default i18n;
