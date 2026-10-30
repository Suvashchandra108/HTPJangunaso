import type { CategorySlug } from '../lib/types';

type P = { size?: number; className?: string };
const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true });

export const ArrowRight = ({ size = 20 }: P) => <svg {...base(size)} strokeWidth={2.4}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const Back = ({ size = 22 }: P) => <svg {...base(size)}><path d="M15 6l-6 6 6 6" /></svg>;
export const Mic = ({ size = 22 }: P) => <svg {...base(size)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
export const Play = ({ size = 18 }: P) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7z" /></svg>;
export const Pause = ({ size = 18 }: P) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>;
export const Stop = ({ size = 18 }: P) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>;
export const Pin = ({ size = 20 }: P) => <svg {...base(size)}><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>;
export const Search = ({ size = 20 }: P) => <svg {...base(size)}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>;
export const List = ({ size = 20 }: P) => <svg {...base(size)}><path d="M4 5h16M4 12h16M4 19h10" /></svg>;
export const Plus = ({ size = 24 }: P) => <svg {...base(size)} strokeWidth={2.2}><path d="M12 5v14M5 12h14" /></svg>;
export const X = ({ size = 14 }: P) => <svg {...base(size)} strokeWidth={2.6}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const Check = ({ size = 18 }: P) => <svg {...base(size)} strokeWidth={2.6}><path d="M5 12l5 5 9-10" /></svg>;
export const Lock = ({ size = 18 }: P) => <svg {...base(size)}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
export const Camera = ({ size = 18 }: P) => <svg {...base(size)}><rect x="3" y="6" width="18" height="14" rx="2" /><circle cx="12" cy="13" r="3.5" /><path d="M9 6l1.5-2h3L15 6" /></svg>;
export const File = ({ size = 18 }: P) => <svg {...base(size)}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>;
export const Home = ({ size = 20 }: P) => <svg {...base(size)}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></svg>;
export const Gps = ({ size = 20 }: P) => <svg {...base(size)}><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>;
export const Alert = ({ size = 20 }: P) => <svg {...base(size)}><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17v.5" /></svg>;

export function CategoryIcon({ cat, size = 20 }: { cat: CategorySlug; size?: number }) {
  const b = base(size);
  switch (cat) {
    case 'road': return <svg {...b}><path d="M8 3 5 21M16 3l3 18M12 5v2M12 11v2M12 17v2" /></svg>;
    case 'water': return <svg {...b}><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" /></svg>;
    case 'electricity': return <svg {...b}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>;
    case 'health': return <svg {...b} strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></svg>;
    case 'education': return <svg {...b}><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c3 2 9 2 12 0v-5" /></svg>;
    case 'corruption': return <svg {...b}><circle cx="12" cy="12" r="8" /><path d="M6.5 6.5l11 11" /></svg>;
    case 'disaster': return <svg {...b}><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17v.5" /></svg>;
    default: return <svg {...b} strokeWidth={2.6}><circle cx="6" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="18" cy="12" r="1" /></svg>;
  }
}
