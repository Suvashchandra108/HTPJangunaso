import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addNote, allowedTransitions, assign, getContact, getReport, hasContact, listStaff, markDuplicate,
  publish, requestInfo, savePublicDraft, setPriority, staffName, transition, withdraw,
} from '../../lib/api';
import { bsDate, nptTime } from '../../lib/bs';
import { findDistrict, findLocalLevel, findProvince } from '../../lib/geo';
import type { Contact, NoteKind, Priority, WorkflowState } from '../../lib/types';
import { citizenStatus } from '../../lib/types';
import { AudioPlayer, DocLink, MediaThumb } from '../../components/Media';
import { Check, Lock } from '../../components/Icons';
import { CAT_LABEL, Modal, STATE_LABEL, StateTag, useStaff } from './StaffShell';

const NOTE_LABEL: Record<NoteKind, string> = { note: 'Note', verification: 'Verification', contact_attempt: 'Contact', finding: 'Finding' };
const CITIZEN_LABEL = { received: 'Received', under_review: 'Under review', closed: 'Closed' };

export default function ReportDetail() {
  const { id = '' } = useParams();
  const { user, version, refresh, toast } = useStaff();
  const r = useMemo(() => getReport(user, id), [user, id, version]);
  const [modal, setModal] = useState<'' | 'assign' | 'info' | 'public' | 'dup' | 'reason' | 'withdraw'>('');
  const [pendingState, setPendingState] = useState<WorkflowState>();
  const [contact, setContact] = useState<Contact | null>();
  const [noteKind, setNoteKind] = useState<NoteKind>('note');
  const [note, setNote] = useState('');

  if (!r) {
    return <div className="box"><h2>Report not available</h2><p className="small muted" style={{ margin: 0 }}>It doesn't exist, or your role can't open it. Reporters only see reports assigned to them.</p><Link to="/staff/inbox">← Inbox</Link></div>;
  }

  const head = user.role === 'admin_head';
  const adminish = head || user.role === 'admin';
  const run = (fn: () => void, ok: string) => { try { fn(); refresh(); toast(ok); setModal(''); } catch (e) { toast(`Not allowed: ${(e as Error).message.replace('_', ' ')}`); } };
  const moves = allowedTransitions(user, r);
  const ll = findLocalLevel(r.location.localLevel);
  const voice = r.media.filter((m) => m.kind === 'voice_description' || m.kind === 'audio');
  const photos = r.media.filter((m) => m.kind === 'photo');
  const docs = r.media.filter((m) => m.kind === 'document');
  const reporters = listStaff().filter((s) => s.isActive && (s.role === 'reporter' || s.role === 'admin'));

  return (
    <>
      <div style={{ height: 4, background: 'var(--red)', margin: '-26px -30px 0', borderRadius: 0 }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Link to="/staff/inbox" className="small" style={{ fontWeight: 600, textDecoration: 'none' }}>← Inbox</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="mono" style={{ fontSize: 24 }}>{r.referenceCode}</h1>
            {r.urgency === 'urgent' && <span className="tag-urgent">URGENT</span>}
            <span className="tag-cat" style={{ fontSize: 13 }}>{CAT_LABEL[r.category]}</span>
            <span style={{ padding: '4px 10px', borderRadius: 999, background: '#fff', border: '1px solid var(--line)' }}><StateTag s={r.workflowState} /></span>
            <span className="tiny muted">Citizen sees: {CITIZEN_LABEL[citizenStatus(r.workflowState)]}</span>
            {r.sample && <span className="badge">Sample</span>}
          </div>
        </div>
        <div className="toolbar">
          {moves.length > 0 && (
            <label className="sr-only" htmlFor="mv">Move to state</label>
          )}
          {moves.length > 0 && (
            <select id="mv" className="sbtn" value="" onChange={(e) => {
              const to = e.target.value as WorkflowState; if (!to) return;
              if (to === 'rejected' || to === 'outside_scope') { setPendingState(to); setModal('reason'); }
              else run(() => transition(user, r.id, to), `Moved to ${STATE_LABEL[to]}`);
            }}>
              <option value="">Move to…</option>
              {moves.map((m) => <option key={m} value={m}>{STATE_LABEL[m]}</option>)}
            </select>
          )}
          {user.role !== 'viewer' && <button className="sbtn" onClick={() => setModal('info')}>Request info from citizen</button>}
          {adminish && r.visibility !== 'public' && <button className="sbtn primary" onClick={() => setModal('public')}>{r.publicInfo ? 'Edit public summary' : 'Draft public summary'}</button>}
        </div>
      </div>

      <div className="split">
        <div className="main-col">
          <section className="box" style={{ gap: 14, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }} className="tiny muted">
              <span>Citizen report · written in {({ ne: 'Nepali', en: 'English', mai: 'Maithili' })[r.originalLanguage]} · {r.type === 'detailed' ? 'Detailed' : 'Quick'} report</span>
              <span>{bsDate(r.submittedAt, 'en')} · {nptTime(r.submittedAt)} NPT</span>
            </div>
            {r.title && <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{r.title}</h2>}
            {r.description ? <p lang={r.originalLanguage === 'en' ? 'en' : 'ne'} style={{ margin: 0, fontSize: 20, lineHeight: 1.55 }}>{r.description}</p> : <p className="muted" style={{ margin: 0 }}>No text — the citizen recorded a voice description.</p>}
            {voice.map((m) => (
              <div key={m.id} className="panel-red" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="tiny" style={{ fontWeight: 700 }}>{m.kind === 'voice_description' ? 'Voice description' : `Audio file · ${m.name ?? ''}`}</span>
                <AudioPlayer item={m} />
              </div>
            ))}
            {photos.length > 0 && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{photos.map((m) => <MediaThumb key={m.id} item={m} />)}</div>}
            {docs.length > 0 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{docs.map((m) => <DocLink key={m.id} item={m} />)}</div>}
            <div className="tiny muted" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span>Anonymous: {r.isAnonymous ? 'yes' : 'no'}</span>
              <span>Video evidence offered: {r.wantsVideoContact ? <strong style={{ color: 'var(--red-dark)' }}>yes — contact citizen</strong> : 'no'}</span>
              {r.institution && <span>Institution: {r.institution}</span>}
              {r.incidentAt && <span>Incident: {r.incidentAt.replace('T', ' ')}</span>}
              {r.duplicateOf && <span>Duplicate of another report</span>}
            </div>
          </section>

          {r.infoRequests.length > 0 && (
            <section className="box">
              <h2>Questions to the citizen</h2>
              {r.infoRequests.map((q) => (
                <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
                  <span className="small"><strong>{q.requestedBy}</strong> asked: {q.message}</span>
                  {q.answeredAt ? <span className="small" style={{ color: 'var(--green)' }}>Citizen answered: <span style={{ color: 'var(--ink)' }}>{q.answer || '(files only)'}</span></span> : <span className="tiny" style={{ color: 'var(--amber)' }}>Waiting for the citizen's answer</span>}
                </div>
              ))}
            </section>
          )}

          <section className="box" style={{ padding: 20, gap: 14 }}>
            <h2 style={{ fontSize: 16 }}>Internal notes and activity</h2>
            {user.role !== 'viewer' && (
              <form style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onSubmit={(e) => { e.preventDefault(); run(() => addNote(user, r.id, noteKind, note), 'Note added'); setNote(''); }}>
                <label htmlFor="note" className="tiny muted">Add a note — staff only, never public</label>
                <textarea id="note" className="textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Verification step, contact attempt, finding…" style={{ fontSize: 14, background: 'var(--surface)', border: '1px solid var(--line)' }} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <label className="sr-only" htmlFor="nk">Note type</label>
                  <select id="nk" className="sbtn" value={noteKind} onChange={(e) => setNoteKind(e.target.value as NoteKind)}>
                    {(Object.keys(NOTE_LABEL) as NoteKind[]).map((k) => <option key={k} value={k}>{NOTE_LABEL[k]}</option>)}
                  </select>
                  <button className="sbtn primary" type="submit" disabled={!note.trim()}>Add note</button>
                </div>
              </form>
            )}
            <ol className="timeline">
              {[...r.notes.map((n) => ({ at: n.at, el: <><span className={`pill${n.kind === 'finding' ? ' dark' : ''}`}>{NOTE_LABEL[n.kind]}</span><span><strong>{n.authorId}</strong> · {bsDate(n.at, 'en')}, {nptTime(n.at)} — {n.body}</span></> })),
                ...r.audit.map((a) => ({ at: a.at, el: <><span className="pill">System</span><span className="muted"><strong style={{ color: 'var(--text)' }}>{a.actor}</strong> · {a.action}{a.details ? ` (${a.details})` : ''} · {bsDate(a.at, 'en')}, {nptTime(a.at)}</span></> }))]
                .sort((a, b) => b.at.localeCompare(a.at))
                .map((x, i) => <li key={i}>{x.el}</li>)}
            </ol>
          </section>
        </div>

        <aside className="side-col">
          <section className="box">
            <h2>Location</h2>
            {r.location.method === 'none' && !r.location.districtId ? <span className="small muted">Citizen gave no location.</span> : <>
              <span className="small" style={{ fontWeight: 600 }}>{[ll?.en ?? r.location.localLevel, r.location.ward ? `ward ${r.location.ward}` : '', r.location.locality].filter(Boolean).join(' · ')}</span>
              <span className="tiny muted">{[findDistrict(r.location.districtId)?.en, findProvince(r.location.provinceId)?.en].filter(Boolean).join(' · ')}</span>
              {r.location.lat != null && <span className="tiny mono muted">{r.location.lat.toFixed(5)}, {r.location.lng!.toFixed(5)}</span>}
              {r.location.method === 'gps'
                ? <span className="tiny" style={{ color: 'var(--green)', fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}><Check size={14} />GPS confirmed{r.location.accuracyM ? ` ±${r.location.accuracyM} m` : ''}{r.location.ward ? ' · ward chosen by citizen' : ''}</span>
                : <span className="tiny muted" style={{ fontWeight: 700 }}>{r.location.method === 'map' ? 'Pin placed on map by citizen' : 'Chosen manually — not GPS-confirmed'}</span>}
              {r.location.lat != null && <a className="tiny" href={`https://www.openstreetmap.org/?mlat=${r.location.lat}&mlon=${r.location.lng}#map=17/${r.location.lat}/${r.location.lng}`} target="_blank" rel="noreferrer">Open in map ↗</a>}
            </>}
          </section>

          <section className="box">
            <h2>Assignment</h2>
            {r.assignments.length ? r.assignments.map((a) => (
              <div key={a.staffId} className="kv"><span style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--ink)' }}><span className="avatar" style={{ width: 28, height: 28 }}>{staffName(a.staffId).slice(0, 2).toUpperCase()}</span>{staffName(a.staffId)}</span><span>{a.isLead ? 'Lead' : 'Support'}</span></div>
            )) : <span className="small muted">Not assigned yet.</span>}
            {r.assignments[0]?.dueAt && <div className="kv"><span>Due</span><span style={{ fontWeight: 600 }}>{bsDate(r.assignments[0].dueAt, 'en')}</span></div>}
            {r.assignments[0]?.instructions && <div className="small" style={{ background: 'var(--surface)', padding: 10, borderRadius: 8 }} lang="ne">{r.assignments[0].instructions}</div>}
            <div className="kv"><span>Priority</span>
              {adminish ? (
                <select className="sbtn" style={{ minHeight: 32, padding: '4px 8px' }} value={r.priority} onChange={(e) => run(() => setPriority(user, r.id, e.target.value as Priority), 'Priority updated')}>
                  <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
                </select>
              ) : <span style={{ fontWeight: 700, color: r.priority === 'high' ? 'var(--red-dark)' : undefined }}>{r.priority}</span>}
            </div>
            {head ? <button className="sbtn" onClick={() => setModal('assign')}>{r.assignments.length ? 'Reassign or add reporter' : 'Assign reporter'}</button>
              : <span className="tiny muted">Only the Admin Head can assign.</span>}
            {adminish && <button className="sbtn" onClick={() => setModal('dup')}>Mark as duplicate…</button>}
          </section>

          <section className="box">
            <h2>Citizen contact</h2>
            {r.isAnonymous || !hasContact(r.id) ? <span className="small">The citizen chose to stay anonymous. No contact details exist.</span>
              : head ? (contact ? (
                <div className="small" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {contact.name && <span>{contact.name}</span>}{contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}{contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
                  <span className="tiny muted">This view was recorded in the audit log.</span>
                </div>
              ) : <button className="sbtn" onClick={() => { setContact(getContact(user, r.id)); refresh(); }}>Show contact details (logged)</button>)
              : <span className="small">The citizen shared contact details. Only the Admin Head can view them.</span>}
            <span className="tiny muted">Every view of contact details is logged.</span>
          </section>

          <section className="box box-ink">
            <h2>Public visibility</h2>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14 }}>
              {r.visibility === 'public' ? <><Check size={14} />Public</> : <><span style={{ color: '#FFB4B7' }}><Lock size={14} /></span>{({ private: 'Private', pending_approval: 'Awaiting Admin Head approval', withdrawn: 'Withdrawn' } as Record<string, string>)[r.visibility]}</>}
            </span>
            {r.publicInfo && <div style={{ background: '#292524', borderRadius: 8, padding: 10, fontSize: 14 }} lang="ne"><strong>{r.publicInfo.title}</strong><p style={{ margin: '4px 0 0', color: '#D6D3D1' }}>{r.publicInfo.summary}</p></div>}
            {head && r.visibility === 'pending_approval' && <button className="sbtn primary" onClick={() => run(() => publish(user, r.id), 'Published to the public archive')}>Approve and publish</button>}
            {head && r.visibility === 'public' && <button className="sbtn" onClick={() => setModal('withdraw')}>Withdraw from public</button>}
            <span className="tiny" style={{ color: '#D6D3D1' }}>Admins draft the public title and summary. Only the Admin Head can publish. Citizen text, photos and contact are never shown publicly.</span>
          </section>
        </aside>
      </div>

      {modal === 'assign' && <AssignModal reporters={reporters} current={r.assignments.map((a) => a.staffId)} onClose={() => setModal('')}
        onSave={(ids, lead, due, ins) => run(() => assign(user, r.id, ids, lead, due, ins), 'Assignment saved')} />}
      {modal === 'info' && <TextModal title="Request more information" label="Question shown to the citizen on their tracking page" cta="Send request" onClose={() => setModal('')} onSave={(v) => run(() => requestInfo(user, r.id, v), 'Request sent to citizen')} />}
      {modal === 'reason' && pendingState && <TextModal title={`Move to ${STATE_LABEL[pendingState]}`} label="Reason (required, kept internally)" cta="Confirm" onClose={() => setModal('')} onSave={(v) => run(() => transition(user, r.id, pendingState, v), `Moved to ${STATE_LABEL[pendingState]}`)} />}
      {modal === 'withdraw' && <TextModal title="Withdraw from public archive" label="Reason (required)" cta="Withdraw" onClose={() => setModal('')} onSave={(v) => run(() => withdraw(user, r.id, v), 'Withdrawn')} />}
      {modal === 'dup' && <TextModal title="Mark as duplicate" label="Reference number of the original report (e.g. HTP-2083-000124)" cta="Mark duplicate" mono onClose={() => setModal('')} onSave={(v) => run(() => markDuplicate(user, r.id, v), 'Marked as duplicate')} />}
      {modal === 'public' && <PublicModal initial={r.publicInfo} onClose={() => setModal('')} onSave={(t, s, u) => run(() => savePublicDraft(user, r.id, t, s, u), head ? 'Draft saved — approve it to publish' : 'Sent to Admin Head for approval')} />}
    </>
  );
}

function TextModal({ title, label, cta, mono, onClose, onSave }: { title: string; label: string; cta: string; mono?: boolean; onClose: () => void; onSave: (v: string) => void }) {
  const [v, setV] = useState('');
  return (
    <Modal title={title} onClose={onClose}>
      <label className="field small" style={{ fontWeight: 700 }}>{label}
        {mono ? <input className="input mono" value={v} onChange={(e) => setV(e.target.value)} autoFocus /> : <textarea className="textarea" rows={3} value={v} onChange={(e) => setV(e.target.value)} autoFocus />}
      </label>
      <div className="toolbar" style={{ justifyContent: 'flex-end' }}><button className="sbtn" onClick={onClose}>Cancel</button><button className="sbtn primary" disabled={!v.trim()} onClick={() => onSave(v)}>{cta}</button></div>
    </Modal>
  );
}

function AssignModal({ reporters, current, onClose, onSave }: { reporters: { id: string; loginId: string; fullName: string }[]; current: string[]; onClose: () => void; onSave: (ids: string[], lead: string, due: string | undefined, ins: string) => void }) {
  const [ids, setIds] = useState<string[]>(current);
  const [lead, setLead] = useState(current[0] ?? '');
  const [due, setDue] = useState('');
  const [ins, setIns] = useState('');
  const toggle = (id: string) => setIds((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  return (
    <Modal title="Assign reporters" onClose={onClose}>
      <fieldset style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <legend className="small" style={{ fontWeight: 700 }}>Reporters (any reporter can take any case)</legend>
        {reporters.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 10 }}>
            <input type="checkbox" id={`a-${s.id}`} checked={ids.includes(s.id)} onChange={() => toggle(s.id)} style={{ width: 18, height: 18, accentColor: 'var(--red)' }} />
            <label htmlFor={`a-${s.id}`} style={{ flex: 1 }} className="small"><strong>{s.loginId}</strong> <span className="muted">{s.fullName}</span></label>
            {ids.includes(s.id) && <label className="tiny" style={{ display: 'flex', gap: 4, alignItems: 'center' }}><input type="radio" name="lead" checked={lead === s.id} onChange={() => setLead(s.id)} />Lead</label>}
          </div>
        ))}
      </fieldset>
      <label className="field small" style={{ fontWeight: 700 }}>Internal deadline<input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
      <label className="field small" style={{ fontWeight: 700 }}>Instructions<textarea className="textarea" rows={2} value={ins} onChange={(e) => setIns(e.target.value)} /></label>
      <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
        <button className="sbtn" onClick={onClose}>Cancel</button>
        <button className="sbtn primary" disabled={!ids.length} onClick={() => onSave(ids, ids.includes(lead) ? lead : ids[0], due ? new Date(due).toISOString() : undefined, ins)}>Save assignment</button>
      </div>
    </Modal>
  );
}

function PublicModal({ initial, onClose, onSave }: { initial?: { title: string; summary: string; storyUrl?: string }; onClose: () => void; onSave: (t: string, s: string, u?: string) => void }) {
  const [t, setT] = useState(initial?.title ?? '');
  const [s, setS] = useState(initial?.summary ?? '');
  const [u, setU] = useState(initial?.storyUrl ?? '');
  return (
    <Modal title="Public summary" onClose={onClose}>
      <p className="small muted" style={{ margin: 0 }}>Write it as HTP Khabar, not the citizen. Avoid naming individuals unless verified. The Admin Head must approve before it appears.</p>
      <label className="field small" style={{ fontWeight: 700 }}>Public title<input className="input" value={t} onChange={(e) => setT(e.target.value)} lang="ne" /></label>
      <label className="field small" style={{ fontWeight: 700 }}>Summary<textarea className="textarea" rows={4} value={s} onChange={(e) => setS(e.target.value)} lang="ne" /></label>
      <label className="field small" style={{ fontWeight: 700 }}>Link to published story (optional)<input className="input" type="url" value={u} onChange={(e) => setU(e.target.value)} placeholder="https://htpkhabar.com/…" /></label>
      <div className="toolbar" style={{ justifyContent: 'flex-end' }}><button className="sbtn" onClick={onClose}>Cancel</button><button className="sbtn primary" disabled={!t.trim() || !s.trim()} onClick={() => onSave(t, s, u)}>Save draft</button></div>
    </Modal>
  );
}
