import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { listReports } from '../../lib/api';
import { COLUMNS, columnOf } from '../../lib/workflow';
import { useStaff } from './ctx';
import { ReportCard } from './parts';

export default function Board() {
  const { t } = useTranslation();
  const { user, version } = useStaff();
  const reports = useMemo(() => listReports(user), [user, version]);
  return (
    <>
      <div><h1>{t('staff.board.title')}</h1><span className="small muted">{t('staff.board.hint')}</span></div>
      <div className="board">
        {COLUMNS.map((c) => {
          const items = reports.filter((r) => columnOf(r) === c)
            .sort((a, b) => (b.urgency === 'urgent' ? 1 : 0) - (a.urgency === 'urgent' ? 1 : 0) || b.submittedAt.localeCompare(a.submittedAt));
          return (
            <section key={c} className={`col col-${c}`}>
              <header><h2>{t(`staff.st.${c}`)}</h2><span className="lane-n">{items.length}</span></header>
              {items.map((r) => <ReportCard key={r.id} r={r} showNext={c !== 'closed'} />)}
            </section>
          );
        })}
      </div>
    </>
  );
}
