import { useTranslation } from 'react-i18next';
import { staffName, transition } from '../../lib/api';
import { findDistrict, findLocalLevel, placeName } from '../../lib/geo';
import type { Report } from '../../lib/types';
import { PLAIN_COLOR, ageParts, dueDays, nextStep, plainState } from '../../lib/workflow';
import { CategoryIcon } from '../../components/Icons';
import { useDrawer, useStaff } from './ctx';

export function StatusTag({ r }: { r: Report }) {
  const { t } = useTranslation();
  const p = plainState(r.workflowState);
  return <span className="state"><span className="dot" style={{ background: PLAIN_COLOR[p] }} />{t(`staff.st.${p}`)}</span>;
}

export function DueBadge({ r }: { r: Report }) {
  const { t } = useTranslation();
  const d = dueDays(r);
  if (d == null) return null;
  if (d < 0) return <span className="due late">{t('staff.due.late', { n: -d })}</span>;
  if (d === 0) return <span className="due soon">{t('staff.due.today')}</span>;
  return <span className="due">{t('staff.due.in', { n: d })}</span>;
}

export function Age({ iso }: { iso: string }) {
  const { t } = useTranslation();
  const a = ageParts(iso);
  return <span className="tiny muted" style={{ whiteSpace: 'nowrap' }}>{t(`staff.ago.${a.unit}`, { n: a.n })}</span>;
}

export function areaText(r: Report, lang: string) {
  const ll = findLocalLevel(r.location.localLevel);
  const local = ll ? placeName(ll, lang).replace(/ (Municipality|Sub-Metropolitan City|Metropolitan City|नगरपालिका|उपमहानगरपालिका|महानगरपालिका)$/, '') : r.location.localLevel;
  return [placeName(findDistrict(r.location.districtId), lang), local].filter(Boolean).join(' · ') || '—';
}

/**
 * The single most useful button for a report. Simple moves happen right here;
 * steps that need input (assign, write summary, approve) open the side panel.
 */
export function NextButton({ r, size = 'sm' }: { r: Report; size?: 'sm' | 'lg' }) {
  const { t } = useTranslation();
  const { user, refresh, toast } = useStaff();
  const { open } = useDrawer();
  const n = nextStep(user, r);
  if (!n) return null;
  const cls = `next-btn${size === 'lg' ? ' lg' : ''}`;
  if (n.kind === 'wait') return <span className={`${cls} wait`}>{t(`staff.next.${n.key}`)}</span>;
  const go = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (n.kind === 'move') {
      try { transition(user, r.id, n.to); refresh(); toast(`${r.referenceCode}: ${t(`staff.st.${plainState(n.to)}`)}`); } catch { toast('Not allowed'); }
    } else open(`${r.id}${n.kind === 'assign' ? ':assign' : n.kind === 'summary' ? ':summary' : ''}`);
  };
  return <button type="button" className={cls} onClick={go}>{t(`staff.next.${n.key}`)} →</button>;
}

export function ReportCard({ r, showNext = true }: { r: Report; showNext?: boolean }) {
  const { t, i18n } = useTranslation();
  const { open } = useDrawer();
  const who = r.assignments.map((a) => staffName(a.staffId));
  return (
    <article className={`rcard${r.urgency === 'urgent' ? ' urgent' : ''}`} onClick={() => open(r.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && open(r.id)} aria-label={r.referenceCode}>
      <div className="rcard-top">
        {r.urgency === 'urgent' && <span className="tag-urgent">{t('staff.urgentTag')}</span>}
        <span className="tag-cat" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><CategoryIcon cat={r.category} size={14} />{t(`cat.${r.category}`)}</span>
        <span style={{ marginLeft: 'auto' }}><Age iso={r.submittedAt} /></span>
      </div>
      <p className="rcard-text" lang={r.originalLanguage === 'en' ? 'en' : 'ne'}>{r.description || <em className="muted">{t('staff.d.noText')}</em>}</p>
      <div className="rcard-meta">
        <span className="tiny muted">{areaText(r, i18n.language)}</span>
        <DueBadge r={r} />
        {who.length > 0 && <span className="tiny" style={{ marginLeft: 'auto', fontWeight: 600 }}>{who.join(', ')}</span>}
      </div>
      {showNext && <NextButton r={r} />}
    </article>
  );
}
