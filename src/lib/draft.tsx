import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CategorySlug, MediaItem, ReportLocation, Urgency } from './types';

// The report form's state lives here, outside the translated screens, and is
// saved to the device on every change. Switching language, going to the
// location screen and back, or reloading the page never loses what was entered.
// Files themselves are kept in IndexedDB; only their ids are stored here.

export interface Draft {
  description: string;
  title: string;
  category?: CategorySlug;
  urgency: Urgency;
  incidentDate: string;
  institution: string;
  location: ReportLocation;
  media: MediaItem[];
  isAnonymous: boolean;
  name: string;
  phone: string;
  email: string;
  wantsVideoContact: boolean;
  consent: boolean;
}

const EMPTY: Draft = {
  description: '', title: '', urgency: 'normal', incidentDate: '', institution: '',
  location: { method: 'none' }, media: [], isAnonymous: true, name: '', phone: '', email: '',
  wantsVideoContact: false, consent: false,
};

const KEY = 'htp-janagunaso-draft';

interface Ctx { draft: Draft; update: (p: Partial<Draft>) => void; clear: () => void; touched: boolean }
const DraftCtx = createContext<Ctx | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) return { ...EMPTY, ...JSON.parse(raw) }; } catch { /* ignore */ }
    return EMPTY;
  });
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(draft)); } catch { /* ignore */ } }, [draft]);
  const update = useCallback((p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p })), []);
  const clear = useCallback(() => setDraft(EMPTY), []);
  const touched = useMemo(() => JSON.stringify(draft) !== JSON.stringify(EMPTY), [draft]);
  return <DraftCtx.Provider value={{ draft, update, clear, touched }}>{children}</DraftCtx.Provider>;
}

export function useDraft() {
  const c = useContext(DraftCtx);
  if (!c) throw new Error('useDraft outside provider');
  return c;
}
