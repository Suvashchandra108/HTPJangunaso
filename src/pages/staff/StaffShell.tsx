import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '../../components/Layout';
import { setLanguage } from '../../i18n';
import { changePassword, currentUser, logout, stats } from '../../lib/api';
import type { StaffUser } from '../../lib/types';
import { StaffCtx, useDrawer } from './ctx';
import ReportView from './ReportView';

function ChangePassword({ user, onDone }: { user: StaffUser; onDone: () => void }) {
  const [a, setA] = useState(''); const [b, setB] = useState(''); const [err, setErr] = useState('');
  return (
    <div className="modal-back">
      <form className="modal" onSubmit={(e) => {
        e.preventDefault();
        if (a.length < 8) return setErr('Use at least 8 characters. / कम्तीमा ८ अक्षर।');
        if (a !== b) return setErr('The two passwords do not match. / दुवै पासवर्ड मिलेनन्।');
        changePassword(user, a); onDone();
      }}>
        <h2>Set your own password · आफ्नो पासवर्ड राख्नुहोस्</h2>
        <p className="small muted" style={{ margin: 0 }}>You signed in with a temporary password. Choose a new one to continue.</p>
        <label className="field small" style={{ fontWeight: 700 }}>New password<input className="input" type="password" value={a} onChange={(e) => setA(e.target.value)} autoComplete="new-password" /></label>
        <label className="field small" style={{ fontWeight: 700 }}>Repeat password<input className="input" type="password" value={b} onChange={(e) => setB(e.target.value)} autoComplete="new-password" /></label>
        {err && <span className="error">{err}</span>}
        <button className="sbtn primary" type="submit">Save password</button>
      </form>
    </div>
  );
}

function Drawer() {
  const { openId, close } = useDrawer();
  useEffect(() => { if (!openId) return; const k = (e: KeyboardEvent) => e.key === 'Escape' && close(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!openId) return null;
  const [id, modal] = openId.split(':');
  return (
    <div className="drawer-back" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Report">
        <ReportView id={id} variant="drawer" initialModal={modal} onClose={close} />
      </aside>
    </div>
  );
}

export default function StaffShell() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState(() => currentUser());
  const [version, setVersion] = useState(0);
  const [msg, setMsg] = useState('');
  const nav = useNavigate();
  const loc = useLocation();
  const refresh = useCallback(() => { setVersion((v) => v + 1); setUser(currentUser()); }, []);
  const toast = useCallback((s: string) => { setMsg(s); window.setTimeout(() => setMsg(''), 2600); }, []);
  // Staff screens are English or Nepali (Maithili staff use Nepali).
  useEffect(() => { if (i18n.language === 'mai') setLanguage('ne'); }, [i18n.language]);

  if (!user) return <Navigate to="/staff" replace state={{ from: loc.pathname }} />;
  const s = stats(user);
  const items: [string, string, number | undefined][] = user.role === 'viewer'
    ? [['/staff/today', t('staff.nav.today'), undefined]]
    : user.role === 'reporter'
      ? [['/staff/today', t('staff.nav.myWork'), s.total], ['/staff/board', t('staff.nav.board'), undefined]]
      : [['/staff/today', t('staff.nav.today'), s.urgent || undefined], ['/staff/board', t('staff.nav.board'), undefined], ['/staff/all', t('staff.nav.all'), s.total]];
  if (user.role === 'admin_head' || user.role === 'admin') items.push(['/staff/accounts', t('staff.nav.accounts'), undefined]);

  return (
    <StaffCtx.Provider value={{ user, version, refresh, toast }}>
      <div className="staff">
        <aside className="staff-side">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 8px' }}>
            <Link to="/staff/today"><Logo height={32} /></Link>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>{t('staff.brand')}</span>
          </div>
          <nav aria-label="Newsroom" className="staff-nav">
            {items.map(([to, label, n]) => (
              <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>{label}{n != null && <span className="count">{n}</span>}</NavLink>
            ))}
          </nav>
          <div className="staff-foot">
            <div role="group" aria-label="Language" className="lang" style={{ alignSelf: 'flex-start' }}>
              <button type="button" aria-pressed={i18n.language !== 'en'} onClick={() => setLanguage('ne')}>नेपाली</button>
              <button type="button" aria-pressed={i18n.language === 'en'} onClick={() => setLanguage('en')}>EN</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, fontSize: 13, background: 'var(--surface)', borderRadius: 12 }}>
              <span className="avatar">{user.loginId.slice(0, 2).toUpperCase()}</span>
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><strong style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.loginId}</strong><span className="muted">{t(`staff.role.${user.role}`)}</span></span>
            </div>
            <button className="sbtn" onClick={() => { logout(); nav('/staff'); }}>{t('staff.nav.signOut')}</button>
            <Link to="/" className="tiny" style={{ textAlign: 'center', color: 'var(--muted)' }}>{t('staff.nav.publicSite')}</Link>
          </div>
        </aside>
        <main className="staff-main"><Outlet /></main>
      </div>
      <Drawer />
      {user.mustChangePassword && <ChangePassword user={user} onDone={refresh} />}
      {msg && <div className="toast" role="status">{msg}</div>}
    </StaffCtx.Provider>
  );
}
