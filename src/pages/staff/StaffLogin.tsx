import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Layout';
import { DEMO_PASSWORD, currentUser, login, resetDemo } from '../../lib/api';

export default function StaffLogin() {
  const nav = useNavigate();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  if (currentUser()) return <Navigate to="/staff/inbox" replace />;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (login(id, pw)) nav('/staff/today'); else setErr('Login ID or password is wrong, or the account is deactivated.');
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ height: 5, background: 'var(--red)', borderRadius: 3 }} />
        <form onSubmit={submit} style={{ background: '#fff', borderRadius: 16, padding: 26, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: 'var(--shadow-lg)' }}>
          <Logo />
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Newsroom sign in</h1>
            <p className="small muted" style={{ margin: '4px 0 0' }}>For HTP Khabar staff. Accounts are created by the Admin Head.</p>
          </div>
          <label className="field small" style={{ fontWeight: 700 }}>Login ID
            <input className="input" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" placeholder="ram.reporter" autoCapitalize="none" spellCheck={false} />
          </label>
          <label className="field small" style={{ fontWeight: 700 }}>Password
            <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
          </label>
          {err && <span className="error" role="alert">{err}</span>}
          <button className="btn btn-primary" type="submit">Sign in</button>
        </form>

        <div className="small" style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px dashed var(--line-strong)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <strong>Demo accounts</strong>
          <span className="muted">Password for all: <code>{DEMO_PASSWORD}</code></span>
          {[['admin.head', 'Admin Head — assigns, publishes, sees contacts'], ['admin', 'Admin — runs the queue'], ['ram.reporter', 'Reporter — sees only assigned cases']].map(([l, d]) => (
            <button key={l} type="button" className="sbtn" style={{ textAlign: 'left' }} onClick={() => { setId(l); setPw(DEMO_PASSWORD); }}><code>{l}</code> <span className="muted">· {d}</span></button>
          ))}
          <button type="button" className="link-btn" style={{ alignSelf: 'flex-start', fontSize: 13 }} onClick={() => { resetDemo(); location.reload(); }}>Reset demo data</button>
        </div>
        <Link to="/" className="tiny" style={{ textAlign: 'center', color: 'var(--muted)' }}>← Public site</Link>
      </div>
    </div>
  );
}
