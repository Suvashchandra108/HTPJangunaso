import { useMemo, useState } from 'react';
import { createStaff, listStaff, resetPassword, setActive } from '../../lib/api';
import type { StaffRole } from '../../lib/types';
import { useTranslation } from 'react-i18next';
import { Modal, useStaff } from './ctx';

export default function Accounts() {
  const { t } = useTranslation();
  const ROLE_LABEL = (r: StaffRole) => t(`staff.role.${r}`);
  const { user, version, refresh, toast } = useStaff();
  const staff = useMemo(() => listStaff(), [version]);
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<{ loginId: string; password: string } | null>(null);
  const roles: StaffRole[] = user.role === 'admin_head' ? ['admin', 'reporter', 'viewer'] : ['reporter', 'viewer'];
  const canManage = (r: StaffRole) => roles.includes(r);

  if (user.role !== 'admin_head' && user.role !== 'admin') return <p>Not available for your role.</p>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div><h1>{t('staff.nav.accounts')}</h1><span className="small muted">No self-signup. {user.role === 'admin_head' ? 'You can create Admins, Reporters and Viewers.' : 'You can create Reporters and Viewers.'}</span></div>
        <button className="sbtn primary" onClick={() => setCreating(true)}>+ New account</button>
      </div>
      <div className="table-wrap">
        <table className="inbox" style={{ minWidth: 640 }}>
          <thead><tr><th>Login ID</th><th>Name</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td className="mono" style={{ fontWeight: 600 }}>{s.loginId}</td>
                <td>{s.fullName}</td>
                <td>{ROLE_LABEL(s.role)}</td>
                <td>{s.isActive ? <span className="state"><span className="dot" style={{ background: 'var(--green)' }} />Active{s.mustChangePassword ? ' · temp password' : ''}</span> : <span className="state muted"><span className="dot" style={{ background: 'var(--line-strong)' }} />Deactivated</span>}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {canManage(s.role) && s.id !== user.id && <>
                    <button className="sbtn" onClick={() => { const p = resetPassword(user, s.id); setSecret({ loginId: s.loginId, password: p }); refresh(); }}>Reset password</button>{' '}
                    <button className="sbtn" onClick={() => { setActive(user, s.id, !s.isActive); refresh(); toast(s.isActive ? 'Account deactivated' : 'Account reactivated'); }}>{s.isActive ? 'Deactivate' : 'Reactivate'}</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tiny muted">Demo: phone OTP sign-in will be added once an SMS provider is chosen. Deactivating ends that person's active assignments immediately.</p>

      {creating && <CreateModal roles={roles} onClose={() => setCreating(false)} onCreate={(id, name, role) => {
        try { const p = createStaff(user, id, name, role); setCreating(false); setSecret({ loginId: id.trim().toLowerCase(), password: p }); refresh(); }
        catch (e) { toast((e as Error).message === 'login_taken' ? 'That login ID is taken' : 'Login ID: 3–31 letters, numbers, dots or dashes'); }
      }} />}
      {secret && (
        <Modal title="Temporary password" onClose={() => setSecret(null)}>
          <p className="small" style={{ margin: 0 }}>Give these to <strong>{secret.loginId}</strong> privately. They must set their own password at first sign-in. This password is shown only once.</p>
          <div className="mono" style={{ fontSize: 20, padding: 14, background: 'var(--surface)', borderRadius: 10, textAlign: 'center', letterSpacing: 1 }}>{secret.password}</div>
          <button className="sbtn primary" onClick={() => setSecret(null)}>Done</button>
        </Modal>
      )}
    </>
  );
}

function CreateModal({ roles, onClose, onCreate }: { roles: StaffRole[]; onClose: () => void; onCreate: (id: string, name: string, role: StaffRole) => void }) {
  const { t } = useTranslation();
  const [id, setId] = useState(''); const [name, setName] = useState(''); const [role, setRole] = useState<StaffRole>('reporter');
  return (
    <Modal title="New staff account" onClose={onClose}>
      <label className="field small" style={{ fontWeight: 700 }}>Login ID<input className="input mono" value={id} onChange={(e) => setId(e.target.value)} placeholder="ram.reporter" autoCapitalize="none" spellCheck={false} /></label>
      <label className="field small" style={{ fontWeight: 700 }}>Full name<input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="field small" style={{ fontWeight: 700 }}>Role
        <select className="select" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>{roles.map((r) => <option key={r} value={r}>{t(`staff.role.${r}`)}</option>)}</select>
      </label>
      <div className="toolbar" style={{ justifyContent: 'flex-end' }}><button className="sbtn" onClick={onClose}>Cancel</button><button className="sbtn primary" disabled={!id.trim() || !name.trim()} onClick={() => onCreate(id, name, role)}>Create account</button></div>
    </Modal>
  );
}
