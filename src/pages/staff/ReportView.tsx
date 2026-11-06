import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  addNote, allowedTransitions, assign, getContact, getReport, hasContact, listStaff, markDuplicate,
  publish, requestInfo, savePublicDraft, setPriority, staffName, transition, withdraw,
} from '../../lib/api';
import { bsDate, nptTime } from '../../lib/bs';
import { findDistrict, findLocalLevel, findProvince, placeName } from '../../lib/geo';
import { telLink, toWhatsappNumber } from '../../lib/contact';
import type { Contact, NoteKind, Priority, Report, WorkflowState } from '../../lib/types';
import { citizenStatus } from '../../lib/types';
import { COLUMNS, columnOf, nextStep, plainState } from '../../lib/workflow';
import { AudioPlayer, DocLink, MediaThumb } from '../../components/Media';
import { Check, Lock, X } from '../../components/Icons';
import { WhatsAppIcon } from '../../components/Help';
import { Modal, useStaff } from './ctx';
import { DueBadge } from './parts';

const NOTE_KINDS: NoteKind[] = ['note', 'verification', 'contact_attempt', 'finding'];
type ModalKind = '' | 'assign' | 'ask' | 'summary' | 'dup' | 'reject' | 'outside' | 'withdraw';

export default function ReportView({ id, variant, initialModal, onClose }: { id: string; variant: 'page' | 'drawer'; initialModal?: string; onClose?: () => void }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { user, version, refresh, toast } = useStaff();
  const r = useMemo(() => getReport(user, id), [user, id, version]);
  const [modal, setModal] = useState<ModalKind>('');
  const [contact, setContact] = useState<Contact | null>();
  const [noteKind, setNoteKind] = useState<NoteKind>('note');
  const [note, setNote] = useState('');
  useEffect(() => { setModal((initialModal as ModalKind) || ''); setContact(undefined); }, [id, initialModal]);

  if (!r) {
    return <div className="box"><h2>—</h2><p className="small muted" style={{ margin: 0 }}>This report doesn't exist, or your role can't open it. Reporters only see reports assigned to them.</p></div>;
  }

  const head = user.role === 'admin_head';
  const adminish = head || user.role === 'admin';
  const run = (fn: () => void, ok: string) => { try { fn(); refresh(); toast(ok); setModal(''); } catch (e) { toast(`Not allowed: ${(e as Error).message.replace(/_/g, ' ')}`); } };
  const moves = allowedTransitions(user, r);
  const n = nextStep(user, r);
  const col = columnOf(r);
  const ll = findLocalLevel(r.location.localLevel);
  const voice = r.media.filter((m) => m.kind === 'voice_description' || m.kind === 'audio');
  const photos = r.media.filter((m) => m.kind === 'photo');
  const docs = r.media.filter((m) => m.kind === 'document');
  const reporters = listStaff().filter((s) => s.isActive && (s.role === 'reporter' || s.role === 'admin'));
  const move = (to: WorkflowState) => run(() => transition(user, r.id, to), `${r.referenceCode}: ${t(`staff.st.${plainState(to)}`)}`);

  const doNext = () => {
    if (!n) return;
    if (n.kind === 'move') move(n.to);
    else if (n.kind === 'assign') setModal('assign');
    else if (n.kind === 'summary') setModal('summary');
    else if (n.kind === 'publish') run(() => publish(user, r.id), t('staff.d.public'));
  };

  const other: { label: string; act: () => void; danger?: boolean }[] = [];
  if (user.role !== 'viewer') other.push({ label: t('staff.more.ask'), act: () => setModal('ask') });
  if (head && n?.kind !== 'assign' && citizenStatus(r.workflowState) !== 'closed') other.push({ label: t('staff.next.assign'), act: () => setModal('assign') });
  if (adminish && r.visibility !== 'public' && n?.kind !== 'summary' && citizenStatus(r.workflowState) !== 'closed') other.push({ label: t('staff.next.writeSummary'), act: () => setModal('summary') });
  if (moves.includes('closed') && n?.kind !== 'move') other.push({ label: t('staff.next.close'), act: () => move('closed') });
  if (adminish && citizenStatus(r.workflowState) !== 'closed') other.push({ label: t('staff.more.duplicate'), act: () => setModal('dup') });
  if (moves.includes('rejected')) other.push({ label: t('staff.more.reject'), act: () => setModal('reject'), danger: true });
  if (moves.includes('outside_scope')) other.push({ label: t('staff.more.outside'), act: () => setModal('outside'), danger: true });
  if (head && r.visibility === 'public') other.push({ label: t('staff.more.withdraw'), act: () => setModal('withdraw'), danger: true });

  const header = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {variant === 'page' && <Link to="/staff/today" className="small" style={{ fontWeight: 600, textDecoration: 'none', width: '100%' }}>← {t('staff.nav.today')}</Link>}
        <h1 className="mono" style={{ fontSize: variant === 'page' ? 24 : 19, margin: 0 }}>{r.referenceCode}</h1>
        {r.urgency === 'urgent' && <span className="tag-urgent">{t('staff.urgentTag')}</span>}
        <span className="tag-cat" style={{ fontSize: 13 }}>{t(`cat.${r.category}`)}</span>
        <DueBadge r={r} />
        {r.sample && <span className="badge">{t('staff.sample')}</span>}
        {variant === 'drawer' && (
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <Link to={`/staff/report/${r.id}`} className="sbtn" style={{ textDecoration: 'none', minHeight: 36, padding: '6px 10px' }}>{t('staff.more.openFull')}</Link>
            <button className="icon-btn" aria-label={t('common.close')} onClick={onClose}><X size={18} /></button>
          </span>
        )}
      </div>
      <ol className="stepper" aria-label="Progress">
        {COLUMNS.map((c, i) => {
          const at = COLUMNS.indexOf(col);
          return <li key={c} className={i < at ? 'done' : i === at ? 'current' : ''}>{t(`staff.st.${c === 'closed' && col === 'closed' ? plainState(r.workflowState) : c}`)}</li>;
        })}
      </ol>
      <div className="next-bar">
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span className="tiny" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--muted)' }}>{t('staff.next.label')}</span>
          <span className="tiny muted">{t('staff.d.citizenSees')}: {t(`track.${citizenStatus(r.workflowState)}`)}</span>
        </span>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {n ? (n.kind === 'wait' ? <span className="next-btn lg wait">{t(`staff.next.${n.key}`)}</span>
            : <button className="next-btn lg" onClick={doNext}>{t(`staff.next.${n.key}`)} →</button>)
            : <span className="next-btn lg wait">{t('staff.next.none')}</span>}
          {other.length > 0 && (
            <details className="menu">
              <summary className="sbtn">{t('staff.more.title')} ▾</summary>
              <div className="menu-list">
                {other.map((o) => <button key={o.label} type="button" className={o.danger ? 'danger' : ''} onClick={(e) => { (e.currentTarget.closest('details') as HTMLDetailsElement).open = false; o.act(); }}>{o.label}</button>)}
              </div>
            </details>
          )}
        </span>
      </div>
    </div>
  );

  const citizen = (
    <section className="box" style={{ gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }} className="tiny muted">
        <span>{t('staff.d.citizenReport')} · {({ ne: 'नेपाली', en: 'English', mai: 'मैथिली' })[r.originalLanguage]}</span>
        <span>{bsDate(r.submittedAt, lang === 'en' ? 'en' : 'ne')} · {nptTime(r.submittedAt)} NPT</span>
      </div>
      {r.title && <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{r.title}</h2>}
      {r.description ? <p lang={r.originalLanguage === 'en' ? 'en' : 'ne'} style={{ margin: 0, fontSize: 19, lineHeight: 1.55 }}>{r.description}</p> : <p className="muted" style={{ margin: 0 }}>{t('staff.d.noText')}</p>}
      {voice.map((m) => (
        <div key={m.id} className="panel-red" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="tiny" style={{ fontWeight: 700 }}>{m.kind === 'voice_description' ? t('staff.d.voice') : m.name}</span>
          <AudioPlayer item={m} />
        </div>
      ))}
      {photos.length > 0 && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{photos.map((m) => <MediaThumb key={m.id} item={m} />)}</div>}
      {docs.length > 0 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{docs.map((m) => <DocLink key={m.id} item={m} />)}</div>}
      <div className="tiny" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {r.isAnonymous && <span className="badge">{t('staff.d.anon')}</span>}
        {r.wantsVideoContact && <span className="badge" style={{ color: 'var(--red-dark)', background: 'var(--red-tint)' }}>{t('staff.d.video')}</span>}
        {r.institution && <span className="muted">{r.institution}</span>}
        {r.incidentAt && <span className="muted">{r.incidentAt.replace('T', ' ')}</span>}
      </div>
    </section>
  );

  const questions = r.infoRequests.length > 0 && (
    <section className="box">
      <h2>{t('staff.d.questions')}</h2>
      {r.infoRequests.map((q) => (
        <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
          <span className="small"><strong>{q.requestedBy}:</strong> {q.message}</span>
          {q.answeredAt ? <span className="small" style={{ color: 'var(--green)' }}>{t('staff.d.answered')}: <span style={{ color: 'var(--ink)' }}>{q.answer || '—'}</span></span>
            : <span className="tiny" style={{ color: 'var(--amber)', fontWeight: 700 }}>{t('staff.d.waiting')}</span>}
        </div>
      ))}
    </section>
  );

  const location = (
    <section className="box">
      <h2>{t('staff.d.location')}</h2>
      {r.location.method === 'none' && !r.location.districtId ? <span className="small muted">{t('staff.d.noLocation')}</span> : <>
        <span className="small" style={{ fontWeight: 600 }}>{[ll ? placeName(ll, lang) : r.location.localLevel, r.location.ward ? `${t('location.ward')} ${r.location.ward}` : '', r.location.locality].filter(Boolean).join(' · ')}</span>
        <span className="tiny muted">{[placeName(findDistrict(r.location.districtId), lang), placeName(findProvince(r.location.provinceId), lang)].filter(Boolean).join(' · ')}</span>
        {r.location.method === 'gps'
          ? <span className="tiny" style={{ color: 'var(--green)', fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}><Check size={14} />{t('staff.d.gps')}{r.location.accuracyM ? ` ±${r.location.accuracyM} m` : ''}</span>
          : <span className="tiny muted" style={{ fontWeight: 700 }}>{r.location.method === 'map' ? t('staff.d.pin') : t('staff.d.manual')}</span>}
        {r.location.lat != null && <a className="tiny" href={`https://www.openstreetmap.org/?mlat=${r.location.lat}&mlon=${r.location.lng}#map=17/${r.location.lat}/${r.location.lng}`} target="_blank" rel="noreferrer">{t('staff.d.openMap')} ↗</a>}
      </>}
    </section>
  );

  const assignment = (
    <section className="box">
      <h2>{t('staff.d.assignment')}</h2>
      {r.assignments.length ? r.assignments.map((a) => (
        <div key={a.staffId} className="kv"><span style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--ink)' }}><span className="avatar" style={{ width: 28, height: 28 }}>{staffName(a.staffId).slice(0, 2).toUpperCase()}</span>{staffName(a.staffId)}</span><span>{a.isLead ? t('staff.d.lead') : t('staff.d.support')}</span></div>
      )) : <span className="small muted">{t('staff.d.notAssigned')}</span>}
      {r.assignments[0]?.dueAt && <div className="kv"><span>{t('staff.d.due')}</span><span style={{ fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>{bsDate(r.assignments[0].dueAt, lang === 'en' ? 'en' : 'ne')}</span></div>}
      {r.assignments[0]?.instructions && <div className="small" style={{ background: 'var(--surface)', padding: 10, borderRadius: 8 }} lang="ne">{r.assignments[0].instructions}</div>}
      <div className="kv"><span>{t('staff.d.priority')}</span>
        {adminish ? (
          <select className="sbtn" style={{ minHeight: 32, padding: '4px 8px' }} value={r.priority} onChange={(e) => run(() => setPriority(user, r.id, e.target.value as Priority), t('staff.d.priority'))} aria-label={t('staff.d.priority')}>
            <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
          </select>
        ) : <span style={{ fontWeight: 700, color: r.priority === 'high' ? 'var(--red-dark)' : undefined }}>{r.priority}</span>}
      </div>
      {!head && <span className="tiny muted">{t('staff.d.onlyHead')}</span>}
    </section>
  );

  const wa = contact?.phone ? toWhatsappNumber(contact.phone) : null;
  const contactBox = (
    <section className="box">
      <h2>{t('staff.d.contact')}</h2>
      {r.isAnonymous || !hasContact(r.id) ? <span className="small">{t('staff.d.contactNone')}</span>
        : head ? (contact ? (
          <div className="small" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {contact.name && <strong>{contact.name}</strong>}
            {contact.phone && <span className="mono">{contact.phone}</span>}
            {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
            <div className="toolbar">
              {contact.phone && <a className="sbtn" href={telLink(contact.phone)} style={{ textDecoration: 'none' }}>{t('staff.d.call')}</a>}
              {wa && <a className="sbtn" href={`https://wa.me/${wa}?text=${encodeURIComponent(`HTP Khabar — ${r.referenceCode}`)}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', background: '#128C4A', color: '#fff', borderColor: '#128C4A', display: 'inline-flex', gap: 6, alignItems: 'center' }}><WhatsAppIcon size={16} />{t('staff.d.whatsapp')}</a>}
            </div>
          </div>
        ) : <button className="sbtn" onClick={() => { setContact(getContact(user, r.id)); refresh(); }}>{t('staff.d.showContact')}</button>)
        : <span className="small">{t('staff.d.contactHidden')}</span>}
      <span className="tiny muted">{t('staff.d.logged')}</span>
    </section>
  );

  const visibility = (
    <section className="box box-ink">
      <h2>{t('staff.d.public')}</h2>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14 }}>
        {r.visibility === 'public' ? <><Check size={14} />{t('staff.d.public')}</> : <><span style={{ color: '#FFB4B7' }}><Lock size={14} /></span>{t(`staff.d.${({ private: 'private', pending_approval: 'pending', withdrawn: 'withdrawn' } as Record<string, string>)[r.visibility]}`)}</>}
      </span>
      {r.publicInfo && <div style={{ background: '#292524', borderRadius: 8, padding: 10, fontSize: 14 }} lang="ne"><strong>{r.publicInfo.title}</strong><p style={{ margin: '4px 0 0', color: '#D6D3D1' }}>{r.publicInfo.summary}</p></div>}
      <span className="tiny" style={{ color: '#D6D3D1' }}>{t('staff.d.publicNote')}</span>
    </section>
  );

  const notes = (
    <section className="box" style={{ gap: 14 }}>
      <h2>{t('staff.d.notes')}</h2>
      {user.role !== 'viewer' && (
        <form style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onSubmit={(e) => { e.preventDefault(); run(() => addNote(user, r.id, noteKind, note), t('staff.d.addNote')); setNote(''); }}>
          <label htmlFor={`note-${variant}`} className="tiny muted">{t('staff.d.noteLabel')}</label>
          <textarea id={`note-${variant}`} className="textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('staff.d.notePh')} style={{ fontSize: 14, background: 'var(--surface)', border: '1px solid var(--line)' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <select className="sbtn" value={noteKind} onChange={(e) => setNoteKind(e.target.value as NoteKind)} aria-label="Note type">
              {NOTE_KINDS.map((k) => <option key={k} value={k}>{t(`staff.nk.${k}`)}</option>)}
            </select>
            <button className="sbtn primary" type="submit" disabled={!note.trim()}>{t('staff.d.addNote')}</button>
          </div>
        </form>
      )}
      <ol className="timeline">
        {[...r.notes.map((x) => ({ at: x.at, el: <><span className={`pill${x.kind === 'finding' ? ' dark' : ''}`}>{t(`staff.nk.${x.kind}`)}</span><span><strong>{x.authorId}</strong> · {bsDate(x.at, 'en')}, {nptTime(x.at)} — {x.body}</span></> })),
          ...r.audit.map((a) => ({ at: a.at, el: <><span className="pill">{t('staff.d.system')}</span><span className="muted"><strong style={{ color: 'var(--text)' }}>{a.actor}</strong> · {a.action}{a.details ? ` (${a.details})` : ''} · {bsDate(a.at, 'en')}, {nptTime(a.at)}</span></> }))]
          .sort((a, b) => b.at.localeCompare(a.at))
          .map((x, i) => <li key={i}>{x.el}</li>)}
      </ol>
    </section>
  );

  const body = variant === 'page' ? (
    <div className="split">
      <div className="main-col">{citizen}{questions}{notes}</div>
      <aside className="side-col">{location}{assignment}{contactBox}{visibility}</aside>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{citizen}{questions}{assignment}{location}{contactBox}{visibility}{notes}</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {header}
      {body}
      {modal === 'assign' && <AssignModal reporters={reporters} current={r.assignments.map((a) => a.staffId)} onClose={() => setModal('')}
        onSave={(ids, lead, due, ins) => run(() => assign(user, r.id, ids, lead, due, ins), t('staff.m.saved'))} />}
      {modal === 'ask' && <TextModal title={t('staff.m.askTitle')} label={t('staff.m.askLabel')} cta={t('staff.m.send')} onClose={() => setModal('')} onSave={(v) => run(() => requestInfo(user, r.id, v), t('staff.m.sent'))} />}
      {(modal === 'reject' || modal === 'outside') && <TextModal title={t(modal === 'reject' ? 'staff.more.reject' : 'staff.more.outside')} label={t('staff.m.reason')} cta={t('staff.m.confirm')} onClose={() => setModal('')}
        onSave={(v) => run(() => transition(user, r.id, modal === 'reject' ? 'rejected' : 'outside_scope', v), t(modal === 'reject' ? 'staff.st.rejected' : 'staff.st.outside'))} />}
      {modal === 'withdraw' && <TextModal title={t('staff.more.withdraw')} label={t('staff.m.reason')} cta={t('staff.m.confirm')} onClose={() => setModal('')} onSave={(v) => run(() => withdraw(user, r.id, v), t('staff.d.withdrawn'))} />}
      {modal === 'dup' && <TextModal title={t('staff.more.duplicate')} label={t('staff.m.dupLabel')} cta={t('staff.m.confirm')} mono onClose={() => setModal('')} onSave={(v) => run(() => markDuplicate(user, r.id, v), t('staff.st.duplicate'))} />}
      {modal === 'summary' && <PublicModal initial={r.publicInfo} onClose={() => setModal('')} onSave={(a, b, c) => run(() => savePublicDraft(user, r.id, a, b, c), t('staff.d.pending'))} />}
    </div>
  );
}

function TextModal({ title, label, cta, mono, onClose, onSave }: { title: string; label: string; cta: string; mono?: boolean; onClose: () => void; onSave: (v: string) => void }) {
  const { t } = useTranslation();
  const [v, setV] = useState('');
  return (
    <Modal title={title} onClose={onClose}>
      <label className="field small" style={{ fontWeight: 700 }}>{label}
        {mono ? <input className="input mono" value={v} onChange={(e) => setV(e.target.value)} autoFocus /> : <textarea className="textarea" rows={3} value={v} onChange={(e) => setV(e.target.value)} autoFocus />}
      </label>
      <div className="toolbar" style={{ justifyContent: 'flex-end' }}><button className="sbtn" onClick={onClose}>{t('common.cancel')}</button><button className="sbtn primary" disabled={!v.trim()} onClick={() => onSave(v)}>{cta}</button></div>
    </Modal>
  );
}

function AssignModal({ reporters, current, onClose, onSave }: { reporters: { id: string; loginId: string; fullName: string }[]; current: string[]; onClose: () => void; onSave: (ids: string[], lead: string, due: string | undefined, ins: string) => void }) {
  const { t } = useTranslation();
  const [ids, setIds] = useState<string[]>(current);
  const [lead, setLead] = useState(current[0] ?? '');
  const [due, setDue] = useState('');
  const [ins, setIns] = useState('');
  const toggle = (id: string) => setIds((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  return (
    <Modal title={t('staff.next.assign')} onClose={onClose}>
      <fieldset style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <legend className="small" style={{ fontWeight: 700 }}>{t('staff.m.reporters')}</legend>
        {reporters.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 10 }}>
            <input type="checkbox" id={`a-${s.id}`} checked={ids.includes(s.id)} onChange={() => toggle(s.id)} style={{ width: 18, height: 18, accentColor: 'var(--red)' }} />
            <label htmlFor={`a-${s.id}`} style={{ flex: 1 }} className="small"><strong>{s.loginId}</strong> <span className="muted">{s.fullName}</span></label>
            {ids.includes(s.id) && <label className="tiny" style={{ display: 'flex', gap: 4, alignItems: 'center' }}><input type="radio" name="lead" checked={lead === s.id} onChange={() => setLead(s.id)} />{t('staff.d.lead')}</label>}
          </div>
        ))}
      </fieldset>
      <label className="field small" style={{ fontWeight: 700 }}>{t('staff.d.due')}<input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
      <label className="field small" style={{ fontWeight: 700 }}>{t('staff.m.instructions')}<textarea className="textarea" rows={2} value={ins} onChange={(e) => setIns(e.target.value)} /></label>
      <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
        <button className="sbtn" onClick={onClose}>{t('common.cancel')}</button>
        <button className="sbtn primary" disabled={!ids.length} onClick={() => onSave(ids, ids.includes(lead) ? lead : ids[0], due ? new Date(due).toISOString() : undefined, ins)}>{t('staff.m.save')}</button>
      </div>
    </Modal>
  );
}

function PublicModal({ initial, onClose, onSave }: { initial?: Report['publicInfo']; onClose: () => void; onSave: (t: string, s: string, u?: string) => void }) {
  const { t } = useTranslation();
  const [a, setA] = useState(initial?.title ?? '');
  const [b, setB] = useState(initial?.summary ?? '');
  const [c, setC] = useState(initial?.storyUrl ?? '');
  return (
    <Modal title={t('staff.next.writeSummary')} onClose={onClose}>
      <p className="small muted" style={{ margin: 0 }}>{t('staff.m.summaryHint')}</p>
      <label className="field small" style={{ fontWeight: 700 }}>{t('staff.m.pubTitle')}<input className="input" value={a} onChange={(e) => setA(e.target.value)} lang="ne" /></label>
      <label className="field small" style={{ fontWeight: 700 }}>{t('staff.m.pubSummary')}<textarea className="textarea" rows={4} value={b} onChange={(e) => setB(e.target.value)} lang="ne" /></label>
      <label className="field small" style={{ fontWeight: 700 }}>{t('staff.m.storyLink')}<input className="input" type="url" value={c} onChange={(e) => setC(e.target.value)} placeholder="https://htpkhabar.com/…" /></label>
      <div className="toolbar" style={{ justifyContent: 'flex-end' }}><button className="sbtn" onClick={onClose}>{t('common.cancel')}</button><button className="sbtn primary" disabled={!a.trim() || !b.trim()} onClick={() => onSave(a, b, c)}>{t('staff.m.save')}</button></div>
    </Modal>
  );
}
