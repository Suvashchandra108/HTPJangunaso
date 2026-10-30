import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Layout';
import { changePassword, currentUser, logout, stats } from '../../lib/api';
import type { StaffRole, StaffUser, WorkflowState } from '../../lib/types';

export const ROLE_LABEL: Record<StaffRole, string> = { admin_head: 'Admin Head', admin: 'Admin', reporter: 'Reporter', viewer: 'Viewer' };

export const STATE_LABEL: Record<WorkflowState, string> = {
  received: 'Received', screening: 'Screening', verification: 'Verification', assigned: 'Assigned', follow_up: 'Follow-up',
  editorial_decision: 'Editorial decision', insufficient_info: 'Needs info', rejected: 'Rejected', duplicate: 'Duplicate',
  outside_scope: 'Outside scope', closed: 'Closed',
};
export const STATE_DOT: Record<WorkflowState, string> = {
  received: '#A8A29E', screening: '#CA8A04', verification: '#7C3AED', assigned: '#1C1917', follow_up: '#1C1917',
  editorial_decision: '#E4010B', insufficient_info: '#CA8A04', rejected: '#D6D3D1', duplicate: '#D6D3D1', outside_scope: '#D6D3D1', closed: '#15803D',
};
export const CAT_LABEL: Record<string, string> = { road: 'Road', water: 'Water', electricity: 'Electricity', health: 'Health', education: 'Education', corruption: 'Corruption', disaster: 'Disaster', other: 'Other' };

interface Ctx { user: StaffUser; version: number; refresh: () => void; toast: (s: string) => void }
const StaffCtx = createContext<Ctx | null>(null);
export const useStaff = () => { const c = useContext(StaffCtx); if (!c) throw new Error('outside staff'); return c; };

export function StateTag({ s }: { s: WorkflowState }) {
  return <span className="state"><span className="dot" style={{ background: STATE_DOT[s] }} />{STATE_LABEL[s]}</span>;
}

function ChangePassword({ user, onDone }: { user: StaffUser; onDone: () => void }) {
  const [a, setA] = useState(''); const [b, setB] = useState(''); const [err, setErr] = useState('');
  return (
    <div className="modal-back">
      <form className="modal" onSubmit={(e) => {
        e.preventDefault();
        if (a.length < 8) return setErr('Use at least 8 characters.');
        if (a !== b) return setErr('The two passwords do not match.');
        changePassword(user, a); onDone();
      }}>
        <h2>Set your own password</h2>
        <p className="small muted" style={{ margin: 0 }}>You signed in with a temporary password. Choose a new one to continue.</p>
        <label className="field small" style={{ fontWeight: 700 }}>New password<input className="input" type="password" value={a} onChange={(e) => setA(e.target.value)} autoComplete="new-password" /></label>
        <label className="field small" style={{ fontWeight: 700 }}>Repeat password<input className="input" type="password" value={b} onChange={(e) => setB(e.target.value)} autoComplete="new-password" /></label>
        {err && <span className="error">{err}</span>}
        <button className="sbtn primary" type="submit">Save password</button>
      </form>
    </div>
  );
}

export default function StaffShell() {
  const [user, setUser] = useState(() => currentUser());
  const [version, setVersion] = useState(0);
  const [msg, setMsg] = useState('');
  const nav = useNavigate();
  const loc = useLocation();
  const refresh = useCallback(() => { setVersion((v) => v + 1); setUser(currentUser()); }, []);
  const toast = useCallback((s: string) => { setMsg(s); window.setTimeout(() => setMsg(''), 2600); }, []);
  useEffect(() => { document.documentElement.lang = 'en'; return () => { document.documentElement.lang = localStorage.getItem('htp-janagunaso-lang') ?? 'ne'; }; }, []);

  if (!user) return <Navigate to="/staff" replace state={{ from: loc.pathname }} />;
  const s = stats(user);
  const view = new URLSearchParams(loc.search).get('view') ?? 'inbox';
  const isInbox = loc.pathname === '/staff/inbox';
  const navItem = (v: string, label: string, n?: number) => (
    <Link to={`/staff/inbox?view=${v}`} className={isInbox && view === v ? 'active' : ''}>{label}{n != null && <span style={{ opacity: 0.85 }}>{n}</span>}</Link>
  );
  return (
    <StaffCtx.Provider value={{ user, version, refresh, toast }}>
      <div className="staff">
        <aside className="staff-side">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 8px' }}>
            <Link to="/staff/inbox"><Logo height={32} /></Link>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Janagunaso Newsroom</span>
          </div>
          {user.role !== 'viewer' && (
            <nav aria-label="Reports">
              {user.role === 'reporter' ? navItem('inbox', 'My assignments', s.total) : <>
                {navItem('inbox', 'Inbox', s.new)}
                {navItem('verification', 'In verification', s.verification)}
                {navItem('assigned', 'Assigned', s.assigned)}
                {navItem('approval', 'Awaiting approval', s.approval)}
                {navItem('published', 'Published')}
                {navItem('closed', 'Closed')}
                {navItem('all', 'All reports', s.total)}
              </>}
            </nav>
          )}
          {(user.role === 'admin_head' || user.role === 'admin') && (
            <nav aria-label="Admin">
              <span className="group">ADMIN</span>
              <NavLink to="/staff/accounts" className={({ isActive }) => (isActive ? 'active' : '')}>Staff accounts</NavLink>
            </nav>
          )}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, fontSize: 13, background: 'var(--surface)', borderRadius: 12 }}>
              <span className="avatar">{user.loginId.slice(0, 2).toUpperCase()}</span>
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><strong style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.loginId}</strong><span className="muted">{ROLE_LABEL[user.role]}</span></span>
            </div>
            <button className="sbtn" onClick={() => { logout(); nav('/staff'); }}>Sign out</button>
            <Link to="/" className="tiny" style={{ textAlign: 'center', color: 'var(--muted)' }}>Public site</Link>
          </div>
        </aside>
        <main className="staff-main"><Outlet /></main>
      </div>
      {user.mustChangePassword && <ChangePassword user={user} onDone={refresh} />}
      {msg && <div className="toast" role="status">{msg}</div>}
    </StaffCtx.Provider>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}><h2>{title}</h2>{children}</div>
    </div>
  );
}
