import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listReports, stats } from '../../lib/api';
import { bsLong } from '../../lib/bs';
import type { Lang, Report } from '../../lib/types';
import { dueDays, laneOf, type Lane } from '../../lib/workflow';
import { Alert } from '../../components/Icons';
import { useDrawer, useStaff } from './ctx';
import { ReportCard } from './parts';

const byUrgency = (a: Report, b: Report) =>
  (b.urgency === 'urgent' ? 1 : 0) - (a.urgency === 'urgent' ? 1 : 0) || (dueDays(a) ?? 99) - (dueDays(b) ?? 99) || a.submittedAt.localeCompare(b.submittedAt);

export default function Today() {
  const { t, i18n } = useTranslation();
  const { user, version } = useStaff();
  const { open } = useDrawer();
  const reports = useMemo(() => listReports(user), [user, version]);
  const s = useMemo(() => stats(user), [user, version]);
  const lang = (i18n.language === 'en' ? 'en' : 'ne') as Lang;

  if (user.role === 'viewer') {
    return (
      <>
        <h1>{t('staff.today.title')}</h1>
        <div className="stats">
          {[[t('staff.st.new'), s.new], [t('staff.st.checking'), s.verification], [t('staff.st.with_reporter'), s.assigned], [t('staff.d.pending'), s.approval], [t('staff.st.closed'), s.closedWeek], ['Total', s.total]].map(([l, n]) => (
            <div key={String(l)} className="stat"><span>{l}</span><b>{n}</b></div>
          ))}
        </div>
      </>
    );
  }

  const urgent = reports.filter((r) => r.urgency === 'urgent' && (r.workflowState === 'received' || r.workflowState === 'screening'));
  const late = reports.filter((r) => (dueDays(r) ?? 0) < 0);

  if (user.role === 'reporter') {
    const mine = reports.filter((r) => laneOf(r) !== null).sort(byUrgency);
    return (
      <>
        <div><span className="tiny muted">{bsLong(new Date(), lang)}</span><h1>{t('staff.today.mine')}</h1></div>
        {mine.length === 0 ? <p className="notice">{t('staff.today.mineEmpty')}</p> : <div className="card-grid">{mine.map((r) => <ReportCard key={r.id} r={r} />)}</div>}
      </>
    );
  }

  const lanes: Lane[] = ['new', 'reporters', 'decide'];
  const laneTo: Record<Lane, string> = { new: '/staff/board', reporters: '/staff/board', decide: '/staff/board' };
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div><span className="tiny muted">{bsLong(new Date(), lang)} · Demo</span><h1>{t('staff.today.title')}</h1></div>
      </div>

      {urgent.length > 0 ? (
        <button type="button" className="urgent-banner" onClick={() => open(urgent[0].id)}>
          <Alert size={22} /><strong>{t('staff.today.urgent', { n: urgent.length })}</strong><span style={{ marginLeft: 'auto' }}>→</span>
        </button>
      ) : <p className="tiny muted" style={{ margin: 0 }}>{t('staff.today.urgentNone')}</p>}

      {late.length > 0 && (
        <div className="late-strip">
          <strong>{t('staff.today.overdueTitle')}:</strong>
          {late.map((r) => <button key={r.id} type="button" className="late-chip" onClick={() => open(r.id)}>{r.referenceCode}</button>)}
        </div>
      )}

      <div className="lanes">
        {lanes.map((l) => {
          const items = reports.filter((r) => laneOf(r) === l).sort(byUrgency);
          return (
            <section key={l} className="lane">
              <header><h2>{t(`staff.lane.${l}`)}</h2><span className="lane-n">{items.length}</span></header>
              {items.length === 0 ? <p className="tiny muted" style={{ margin: 0 }}>{t('staff.today.empty')}</p>
                : items.slice(0, 4).map((r) => <ReportCard key={r.id} r={r} />)}
              {items.length > 4 && <Link to={laneTo[l]} className="small" style={{ fontWeight: 700 }}>{t('staff.today.seeAll')} ({items.length}) →</Link>}
            </section>
          );
        })}
      </div>
    </>
  );
}
