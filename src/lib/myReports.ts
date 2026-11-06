import type { CategorySlug } from './types';

// "My reports": reports sent from this phone, so people never have to type a
// code. The private token is kept only on this device. On a shared phone the
// person can remove an entry from the tracking page.

export interface SavedReport { ref: string; token: string; submittedAt: string; category: CategorySlug }
const KEY = 'htp-janagunaso-my-reports';

export function listMine(): SavedReport[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as SavedReport[]; } catch { return []; }
}
export function saveMine(r: SavedReport) {
  const list = [r, ...listMine().filter((x) => x.ref !== r.ref)].slice(0, 30);
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage full or blocked */ }
}
export function forgetMine(ref: string) {
  try { localStorage.setItem(KEY, JSON.stringify(listMine().filter((x) => x.ref !== ref))); } catch { /* ignore */ }
}
