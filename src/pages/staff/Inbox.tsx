import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { listReports, staffName, stats } from '../../lib/api';
import { bsDate, bsShort, timeAgo } from '../../lib/bs';
import { findDistrict, findLocalLevel } from '../../lib/geo';
import type { Report } from '../../lib/types';
import { citizenStatus } from '../../lib/types';
import { CAT_LABEL, StateTag, useStaff } from './StaffShell';

const VIEWS: Record<string, { title: string; match: (r: Report) => boolean }> = {
  inbox: { title: 'Inbox', match: (r) => r.workflowState === 'received' || r.workflowState === 'screening' || r.workflowState === 'insufficient_info' },
  verification: { title: 'In verification', match: (r) => r.workflowState === 'verification' || r.workflowState === 'screening' },
  assigned: { title: 'Assigned', match: (r) => r.workflowState === 'assigned' || r.workflowState === 'follow_up' || r.workflowState === 'editorial_decision' },
  approval: { title: 'Awaiting approval', match: (r) => r.visibility === 'pending_approval' },
  published: { title: 'Published', match: (r) => r.visibility === 'public' },
  closed: { title: 'Closed', match: (r) => citizenStatus(r.workflowState) === 'closed' },
  all: { title: 'All reports', match: () => true },
};

export function area(r: Report) {
  const ll = findLocalLevel(r.location.localLevel);
  const district = findDistrict(r.location.districtId)?.en;
  const local = ll ? ll.en.replace(/ (Municipality|Sub-Metropolitan City|Metropolitan City)$/, '') : r.location.localLevel;
  return [district, local].filter(Boolean).join(' · ') || '—';
}

function mediaSummary(r: Report) {
  const v = r.media.filter((m) => m.kind === 'voice_description').length;
  const p = r.media.filter((m) => m.kind === 'photo').length;
  const d = r.media.filter((m) => m.kind === 'document').length;
  return [v && 'Voice', p && `${p} photo${p > 1 ? 's' : ''}`, d && 'PDF', r.isAnonymous ? 'Anonymous' : ''].filter(Boolean).join(' · ');
}

export default function Inbox() {
  const { user, version } = useStaff();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const view = user.role === 'reporter' ? 'all' : params.get('view') ?? 'inbox';
  const [q, setQ] = useState('');
  const reports = useMemo(() => listReports(user), [user, version]);
  const s = useMemo(() => stats(user), [user, version, reports]);
  const v = VIEWS[view] ?? VIEWS.inbox;
  const rows = reports
    .filter(v.match)
    .filter((r) => !q.trim() || `${r.referenceCode} ${r.description} ${area(r)} ${CAT_LABEL[r.category]}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (a.urgency === 'urgent' ? -1 : 0) - (b.urgency === 'urgent' ? -1 : 0) || b.submittedAt.localeCompare(a.submittedAt));

  if (user.role === 'viewer') {
    return (
      <>
        <h1>Statistics</h1>
        <div className="stats">
          {[['New', s.new], ['In verification', s.verification], ['Assigned', s.assigned], ['Awaiting approval', s.approval], ['Closed this week', s.closedWeek], ['Total', s.total]].map(([l, n]) => (
            <div key={l} className="stat"><span>{l}</span><b>{n}</b></div>
          ))}
        </div>
        <p className="small muted">Viewers see counts only, never report contents.</p>
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <span className="tiny muted">{bsDate(new Date(), 'en')} · Demo data in this browser</span>
          <h1>{user.role === 'reporter' ? 'My assignments' : v.title}</h1>
        </div>
        <label className="sr-only" htmlFor="sq">Search reports</label>
        <input id="sq" className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reference, text, place" style={{ maxWidth: 300, minHeight: 42, fontSize: 14, border: '1px solid var(--line)' }} />
      </div>

      {user.role !== 'reporter' && (
        <div className="stats">
          <button className={`stat${s.urgent ? ' hot' : ''}`} onClick={() => nav('/staff/inbox?view=inbox')}><span>Urgent, unscreened</span><b>{s.urgent}</b></button>
          <button className="stat" onClick={() => nav('/staff/inbox?view=inbox')}><span>New</span><b>{s.new}</b></button>
          <button className="stat" onClick={() => nav('/staff/inbox?view=verification')}><span>In verification</span><b>{s.verification}</b></button>
          <button className="stat" onClick={() => nav('/staff/inbox?view=assigned')}><span>Assigned</span><b>{s.assigned}</b></button>
          <button className="stat" onClick={() => nav('/staff/inbox?view=approval')}><span style={{ color: s.approval ? 'var(--red-dark)' : undefined }}>Awaiting approval</span><b>{s.approval}</b></button>
          <button className="stat" onClick={() => nav('/staff/inbox?view=assigned')}><span style={{ color: s.overdue ? 'var(--amber)' : undefined }}>Overdue</span><b>{s.overdue}</b></button>
        </div>
      )}

      <div className="table-wrap">
        <table className="inbox">
          <thead><tr><th>Reference</th><th>Report</th><th>Area</th><th>State</th><th>Assigned</th><th>Received</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="muted" style={{ padding: 28, textAlign: 'center' }}>Nothing here right now.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/staff/report/${r.id}`)}>
                <td style={{ whiteSpace: 'nowrap' }}><Link to={`/staff/report/${r.id}`} className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }} onClick={(e) => e.stopPropagation()}>{r.referenceCode}</Link></td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {r.urgency === 'urgent' && <span className="tag-urgent">URGENT</span>}
                      <span className="tag-cat">{CAT_LABEL[r.category]}</span>
                      <span className="tiny muted">{mediaSummary(r)}{r.originalLanguage === 'mai' ? ' · Maithili' : ''}</span>
                    </span>
                    <span lang={r.originalLanguage === 'en' ? 'en' : 'ne'} style={{ fontSize: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {r.description || <em className="muted">Voice description only</em>}
                    </span>
                  </div>
                </td>
                <td className="muted" style={{ whiteSpace: 'nowrap' }}>{area(r)}</td>
                <td><StateTag s={r.workflowState} /></td>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--text-2)' }}>{r.assignments.length ? r.assignments.map((a) => staffName(a.staffId)).join(', ') : '—'}</td>
                <td className="muted" style={{ whiteSpace: 'nowrap' }} title={bsShort(r.submittedAt, 'en')}>{timeAgo(r.submittedAt, 'en')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
