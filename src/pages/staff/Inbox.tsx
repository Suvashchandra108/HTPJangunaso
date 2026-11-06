import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listReports, staffName } from '../../lib/api';
import { CATEGORIES } from '../../lib/types';
import { plainState, type Plain } from '../../lib/workflow';
import { useDrawer, useStaff } from './ctx';
import { Age, areaText, DueBadge, NextButton, StatusTag } from './parts';

const STATUS_FILTERS: Plain[] = ['new', 'checking', 'needs_info', 'with_reporter', 'decision', 'closed'];

/** All reports: one searchable table with simple filters. Rows open in the side panel. */
export default function Inbox() {
  const { t, i18n } = useTranslation();
  const { user, version } = useStaff();
  const { open } = useDrawer();
  const [q, setQ] = useState('');
  const [st, setSt] = useState<Plain | ''>('');
  const [cat, setCat] = useState('');
  const reports = useMemo(() => listReports(user), [user, version]);
  const rows = reports
    .filter((r) => !st || plainState(r.workflowState) === st || (st === 'closed' && ['rejected', 'duplicate', 'outside'].includes(plainState(r.workflowState))))
    .filter((r) => !cat || r.category === cat)
    .filter((r) => !q.trim() || `${r.referenceCode} ${r.description} ${areaText(r, 'en')} ${areaText(r, 'ne')}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (b.urgency === 'urgent' ? 1 : 0) - (a.urgency === 'urgent' ? 1 : 0) || b.submittedAt.localeCompare(a.submittedAt));

  return (
    <>
      <h1>{t('staff.all.title')}</h1>
      <div className="toolbar" style={{ alignItems: 'center' }}>
        <label className="sr-only" htmlFor="sq">{t('staff.all.search')}</label>
        <input id="sq" className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('staff.all.search')} style={{ maxWidth: 300, minHeight: 42, fontSize: 14, border: '1px solid var(--line)' }} />
        <select className="sbtn" value={st} onChange={(e) => setSt(e.target.value as Plain | '')} aria-label={t('staff.all.status')}>
          <option value="">{t('staff.all.status')}: —</option>
          {STATUS_FILTERS.map((p) => <option key={p} value={p}>{t(`staff.st.${p}`)}</option>)}
        </select>
        <select className="sbtn" value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t('report.topic')}>
          <option value="">{t('report.topic')}: —</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{t(`cat.${c}`)}</option>)}
        </select>
      </div>
      <div className="table-wrap">
        <table className="inbox">
          <thead><tr><th>{t('staff.all.ref')}</th><th>{t('staff.all.report')}</th><th>{t('staff.all.area')}</th><th>{t('staff.all.status')}</th><th>{t('staff.all.who')}</th><th>{t('staff.all.when')}</th><th /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="muted" style={{ padding: 28, textAlign: 'center' }}>{t('staff.all.empty')}</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => open(r.id)}>
                <td style={{ whiteSpace: 'nowrap' }}><button type="button" className="mono link-btn" style={{ padding: 0, minHeight: 0, color: 'var(--ink)', fontSize: 13 }} onClick={(e) => { e.stopPropagation(); open(r.id); }}>{r.referenceCode}</button></td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {r.urgency === 'urgent' && <span className="tag-urgent">{t('staff.urgentTag')}</span>}
                      <span className="tag-cat">{t(`cat.${r.category}`)}</span>
                      <DueBadge r={r} />
                    </span>
                    <span lang={r.originalLanguage === 'en' ? 'en' : 'ne'} style={{ fontSize: 15, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description || <em className="muted">{t('staff.d.noText')}</em>}</span>
                  </div>
                </td>
                <td className="muted" style={{ whiteSpace: 'nowrap' }}>{areaText(r, i18n.language)}</td>
                <td><StatusTag r={r} /></td>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--text-2)' }}>{r.assignments.length ? r.assignments.map((a) => staffName(a.staffId)).join(', ') : '—'}</td>
                <td><Age iso={r.submittedAt} /></td>
                <td onClick={(e) => e.stopPropagation()}><NextButton r={r} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
