import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { StaffUser } from '../../lib/types';

export interface StaffCtxValue {
  user: StaffUser;
  version: number;
  refresh: () => void;
  toast: (s: string) => void;
}
export const StaffCtx = createContext<StaffCtxValue | null>(null);
export const useStaff = () => { const c = useContext(StaffCtx); if (!c) throw new Error('outside staff'); return c; };

/** Opening a report in the side panel is just ?open=<id> on the current screen. */
export function useDrawer() {
  const [params, setParams] = useSearchParams();
  const openId = params.get('open');
  const open = (id: string) => { const p = new URLSearchParams(params); p.set('open', id); setParams(p); };
  const close = () => { const p = new URLSearchParams(params); p.delete('open'); setParams(p); };
  return { openId, open, close };
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}><h2>{title}</h2>{children}</div>
    </div>
  );
}
