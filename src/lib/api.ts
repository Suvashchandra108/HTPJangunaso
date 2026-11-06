// Demo backend.
// Every function here matches an endpoint or RPC in the Phase 2 API
// specification, and enforces the same role rules as the planned
// row-level-security policies. Data lives in this browser's localStorage
// (files in IndexedDB), so the demo works on GitHub Pages with no server.
// Phase 4 replaces the bodies of these functions with Supabase calls;
// screens do not change.

import type {
  CategorySlug, Contact, MediaItem, Note, NoteKind, Priority, Report, ReportLocation,
  StaffRole, StaffUser, Urgency, WorkflowState, Lang,
} from './types';
import { citizenStatus } from './types';
import { bsYear } from './bs';

const KEY = 'htp-janagunaso-demo-v2';
const SESSION = 'htp-janagunaso-staff-session';
export const DEMO_PASSWORD = 'demo1234';

interface Db { counters: Record<string, number>; reports: Report[]; staff: (StaffUser & { password: string })[] }

// ───────── helpers ─────────
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const ago = (mins: number) => new Date(Date.now() - mins * 60000).toISOString();

export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 128-bit random tracking token in an easy-to-copy alphabet (no 0/O/1/l). */
function newToken(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(26));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}

function load(): Db {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch { /* storage unavailable or corrupt: reseed */ }
  const db = seed();
  save(db);
  return db;
}
function save(db: Db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* quota or private mode: keep working in memory */ }
}
function audit(r: Report, actor: string, action: string, details?: string) {
  r.audit.unshift({ id: uid(), at: now(), actor, action, details });
}

export function resetDemo() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(SESSION);
}

// ───────── public: submit, track, add info, archive ─────────
export interface SubmitInput {
  type: 'quick' | 'detailed';
  category: CategorySlug;
  title?: string;
  description: string;
  originalLanguage: Lang;
  urgency: Urgency;
  incidentAt?: string;
  institution?: string;
  isAnonymous: boolean;
  wantsVideoContact: boolean;
  location: ReportLocation;
  contact?: Contact;
  media: MediaItem[];
}

/** POST /submit-report (+ /finalize-report). Returns the reference and the one-time token. */
export async function submitReport(input: SubmitInput): Promise<{ referenceCode: string; trackingToken: string; submittedAt: string }> {
  if (!input.description.trim() && !input.media.some((m) => m.kind === 'voice_description')) throw new Error('description_required');
  const db = load();
  const year = bsYear();
  const seq = (db.counters[year] ?? 0) + 1;
  db.counters[year] = seq;
  const referenceCode = `HTP-${year}-${String(seq).padStart(6, '0')}`;
  const trackingToken = newToken();
  const r: Report = {
    id: uid(), referenceCode, type: input.type, category: input.category, title: input.title,
    description: input.description.trim(), originalLanguage: input.originalLanguage, urgency: input.urgency,
    incidentAt: input.incidentAt, institution: input.institution, isAnonymous: input.isAnonymous,
    wantsVideoContact: input.wantsVideoContact, workflowState: 'received', visibility: 'private',
    priority: input.urgency === 'urgent' ? 'high' : 'normal', trackingTokenHash: await sha256(trackingToken),
    submittedAt: now(), location: input.location, contact: input.isAnonymous ? undefined : input.contact,
    media: input.media, assignments: [], notes: [], infoRequests: [], audit: [],
    citizenEvents: [{ status: 'received', at: now() }],
  };
  audit(r, 'citizen', 'Report received from citizen');
  db.reports.unshift(r);
  save(db);
  return { referenceCode, trackingToken, submittedAt: r.submittedAt };
}

export interface TrackResult {
  referenceCode: string; status: ReturnType<typeof citizenStatus>; submittedAt: string; category: CategorySlug;
  events: { status: ReturnType<typeof citizenStatus>; at: string }[];
  openRequest?: { id: string; message: string };
  /** Only what the Admin Head approved for the public: never internal notes or staff names. */
  published?: { title: string; storyUrl?: string };
}

/** POST /track. Reference alone opens nothing: the token must match. */
export async function track(referenceCode: string, token: string): Promise<TrackResult | null> {
  const db = load();
  const r = db.reports.find((x) => x.referenceCode === referenceCode.trim().toUpperCase());
  if (!r || r.trackingTokenHash !== (await sha256(token.trim()))) return null;
  const open = r.infoRequests.find((q) => !q.answeredAt);
  const events = r.citizenEvents?.length ? r.citizenEvents : [{ status: 'received' as const, at: r.submittedAt }];
  return {
    referenceCode: r.referenceCode, status: citizenStatus(r.workflowState), submittedAt: r.submittedAt, category: r.category, events,
    openRequest: open && { id: open.id, message: open.message },
    published: r.visibility === 'public' && r.publicInfo ? { title: r.publicInfo.title, storyUrl: r.publicInfo.storyUrl } : undefined,
  };
}

/** POST /add-info. Only while an info request is open. */
export async function addInfo(referenceCode: string, token: string, requestId: string, text: string, media: MediaItem[]) {
  const db = load();
  const r = db.reports.find((x) => x.referenceCode === referenceCode);
  if (!r || r.trackingTokenHash !== (await sha256(token))) throw new Error('not_found');
  const q = r.infoRequests.find((x) => x.id === requestId && !x.answeredAt);
  if (!q) throw new Error('no_open_request');
  q.answer = text; q.answeredAt = now();
  r.media.push(...media);
  if (r.workflowState === 'insufficient_info') r.workflowState = 'screening';
  audit(r, 'citizen', 'Citizen answered the information request', media.length ? `${media.length} file(s) added` : undefined);
  save(db);
}

export interface PublicReport { id: string; referenceCode: string; category: CategorySlug; title: string; summary: string; storyUrl?: string; location: ReportLocation; approvedAt?: string; status: ReturnType<typeof citizenStatus>; sample?: boolean }

/** GET public_reports_view: only what the Admin Head approved, area-level location only. */
export function listPublic(): PublicReport[] {
  return load().reports
    .filter((r) => r.visibility === 'public' && r.publicInfo)
    .map((r) => ({
      id: r.id, referenceCode: r.referenceCode, category: r.category, title: r.publicInfo!.title, summary: r.publicInfo!.summary,
      storyUrl: r.publicInfo!.storyUrl, approvedAt: r.publicInfo!.approvedAt, status: citizenStatus(r.workflowState), sample: r.sample,
      location: { method: 'none' as const, provinceId: r.location.provinceId, districtId: r.location.districtId, localLevel: r.location.localLevel },
    }))
    .sort((a, b) => (b.approvedAt ?? '').localeCompare(a.approvedAt ?? ''));
}

// ───────── staff: session ─────────
export function currentUser(): StaffUser | null {
  const id = sessionStorage.getItem(SESSION);
  const u = id ? load().staff.find((s) => s.id === id && s.isActive) : undefined;
  return u ? strip(u) : null;
}
const strip = ({ password: _p, ...u }: StaffUser & { password: string }): StaffUser => u;

export function login(loginId: string, password: string): StaffUser | null {
  const u = load().staff.find((s) => s.loginId === loginId.trim().toLowerCase() && s.password === password && s.isActive);
  if (!u) return null;
  sessionStorage.setItem(SESSION, u.id);
  return strip(u);
}
export function logout() { sessionStorage.removeItem(SESSION); }

export function changePassword(user: StaffUser, next: string) {
  const db = load();
  const u = db.staff.find((s) => s.id === user.id)!;
  u.password = next; u.mustChangePassword = false;
  save(db);
}

// ───────── staff: reading (mirrors row-level security) ─────────
const isActiveAssignee = (r: Report, u: StaffUser) => r.assignments.some((a) => a.staffId === u.id);
const canSee = (r: Report, u: StaffUser) => u.role === 'admin_head' || u.role === 'admin' || (u.role === 'reporter' && isActiveAssignee(r, u));

export function listReports(u: StaffUser): Report[] {
  if (u.role === 'viewer') return [];
  return load().reports.filter((r) => canSee(r, u)).map((r) => redact(r, u));
}

export function getReport(u: StaffUser, id: string): Report | null {
  const r = load().reports.find((x) => x.id === id);
  return r && canSee(r, u) ? redact(r, u) : null;
}

/** Contact details never leave the "server" except to the Admin Head (via getContact, which logs the view). */
function redact(r: Report, _u: StaffUser): Report {
  const { contact: _c, ...rest } = r;
  return { ...rest, contact: undefined };
}

export function hasContact(id: string): boolean {
  return !!load().reports.find((x) => x.id === id)?.contact;
}

/** RPC get_contact: Admin Head only; every view is written to the audit log. */
export function getContact(u: StaffUser, id: string): Contact | null {
  if (u.role !== 'admin_head') throw new Error('forbidden');
  const db = load();
  const r = db.reports.find((x) => x.id === id);
  if (!r?.contact) return null;
  audit(r, u.loginId, 'Viewed citizen contact details');
  save(db);
  return r.contact;
}

export function stats(u: StaffUser) {
  const all = u.role === 'viewer' ? load().reports : listReports(u);
  const c = (f: (r: Report) => boolean) => all.filter(f).length;
  const weekAgo = Date.now() - 7 * 86400000;
  return {
    urgent: c((r) => r.urgency === 'urgent' && (r.workflowState === 'received' || r.workflowState === 'screening')),
    new: c((r) => r.workflowState === 'received'),
    verification: c((r) => r.workflowState === 'verification' || r.workflowState === 'screening'),
    assigned: c((r) => r.workflowState === 'assigned' || r.workflowState === 'follow_up'),
    approval: c((r) => r.visibility === 'pending_approval'),
    overdue: c((r) => r.assignments.some((a) => a.dueAt && new Date(a.dueAt).getTime() < Date.now()) && citizenStatus(r.workflowState) !== 'closed'),
    closedWeek: c((r) => citizenStatus(r.workflowState) === 'closed' && new Date(r.closedAt ?? r.submittedAt).getTime() > weekAgo),
    total: all.length,
  };
}

// ───────── staff: newsroom actions (RPCs) ─────────
function mutate(u: StaffUser, id: string, fn: (r: Report, db: Db) => void) {
  const db = load();
  const r = db.reports.find((x) => x.id === id);
  if (!r || !canSee(r, u)) throw new Error('not_found');
  const before = citizenStatus(r.workflowState);
  fn(r, db);
  const after = citizenStatus(r.workflowState);
  if (after !== before) (r.citizenEvents ??= []).push({ status: after, at: now() });
  save(db);
}
const need = (ok: boolean) => { if (!ok) throw new Error('forbidden'); };

/** Allowed workflow moves (Phase 1 lifecycle). */
export const TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  received: ['screening', 'rejected', 'outside_scope'],
  screening: ['verification', 'insufficient_info', 'rejected', 'duplicate', 'outside_scope'],
  insufficient_info: ['screening', 'closed'],
  verification: ['assigned', 'rejected'],
  assigned: ['follow_up', 'editorial_decision'],
  follow_up: ['verification', 'editorial_decision'],
  editorial_decision: ['closed', 'follow_up'],
  rejected: ['closed'], duplicate: ['closed'], outside_scope: ['closed'], closed: [],
};

export function allowedTransitions(u: StaffUser, r: Report): WorkflowState[] {
  if (u.role === 'admin_head' || u.role === 'admin') return TRANSITIONS[r.workflowState];
  if (u.role === 'reporter') return TRANSITIONS[r.workflowState].filter((s) => s === 'follow_up' || s === 'editorial_decision');
  return [];
}

export function transition(u: StaffUser, id: string, to: WorkflowState, reason?: string) {
  mutate(u, id, (r) => {
    need(allowedTransitions(u, r).includes(to));
    if ((to === 'rejected' || to === 'outside_scope') && !reason?.trim()) throw new Error('reason_required');
    const from = r.workflowState;
    r.workflowState = to;
    if (to === 'closed') r.closedAt = now();
    audit(r, u.loginId, `State changed: ${from} → ${to}`, reason);
  });
}

export function assign(u: StaffUser, id: string, staffIds: string[], leadId: string, dueAt: string | undefined, instructions: string) {
  need(u.role === 'admin_head');
  mutate(u, id, (r, db) => {
    r.assignments = staffIds.map((s) => ({ staffId: s, isLead: s === leadId, dueAt, instructions, assignedBy: u.id, assignedAt: now() }));
    if (['received', 'screening', 'verification'].includes(r.workflowState)) r.workflowState = 'assigned';
    const names = staffIds.map((s) => db.staff.find((x) => x.id === s)?.loginId).join(', ');
    audit(r, u.loginId, `Assigned to ${names}`, dueAt ? `Due ${dueAt.slice(0, 10)}` : undefined);
  });
}

export function setPriority(u: StaffUser, id: string, p: Priority) {
  need(u.role === 'admin_head' || u.role === 'admin');
  mutate(u, id, (r) => { r.priority = p; audit(r, u.loginId, `Priority set to ${p}`); });
}

export function addNote(u: StaffUser, id: string, kind: NoteKind, body: string) {
  need(u.role !== 'viewer' && !!body.trim());
  mutate(u, id, (r) => {
    const n: Note = { id: uid(), authorId: u.loginId, kind, body: body.trim(), at: now() };
    r.notes.unshift(n);
    audit(r, u.loginId, `Added ${kind.replace('_', ' ')}`);
  });
}

export function requestInfo(u: StaffUser, id: string, message: string) {
  need(u.role !== 'viewer' && !!message.trim());
  mutate(u, id, (r) => {
    r.infoRequests.push({ id: uid(), message: message.trim(), requestedBy: u.loginId, at: now() });
    audit(r, u.loginId, 'Requested more information from citizen');
  });
}

export function markDuplicate(u: StaffUser, id: string, primaryRef: string) {
  need(u.role === 'admin_head' || u.role === 'admin');
  mutate(u, id, (r, db) => {
    const p = db.reports.find((x) => x.referenceCode === primaryRef.trim().toUpperCase());
    if (!p || p.id === r.id) throw new Error('primary_not_found');
    r.duplicateOf = p.id; r.workflowState = 'duplicate';
    audit(r, u.loginId, `Marked duplicate of ${p.referenceCode}`);
  });
}

export function savePublicDraft(u: StaffUser, id: string, title: string, summary: string, storyUrl?: string) {
  need(u.role === 'admin_head' || u.role === 'admin');
  mutate(u, id, (r) => {
    r.publicInfo = { ...r.publicInfo, title: title.trim(), summary: summary.trim(), storyUrl: storyUrl?.trim() || undefined };
    if (r.visibility !== 'public') r.visibility = 'pending_approval';
    audit(r, u.loginId, 'Public summary drafted — awaiting Admin Head approval');
  });
}

export function publish(u: StaffUser, id: string) {
  need(u.role === 'admin_head');
  mutate(u, id, (r) => {
    need(!!r.publicInfo?.title && !!r.publicInfo.summary);
    r.visibility = 'public';
    r.publicInfo = { ...r.publicInfo!, approvedBy: u.loginId, approvedAt: now() };
    audit(r, u.loginId, 'Published to public archive');
  });
}

export function withdraw(u: StaffUser, id: string, reason: string) {
  need(u.role === 'admin_head' && !!reason.trim());
  mutate(u, id, (r) => { r.visibility = 'withdrawn'; audit(r, u.loginId, 'Withdrawn from public archive', reason); });
}

// ───────── staff accounts (Edge Function /staff/*) ─────────
export function listStaff(): StaffUser[] { return load().staff.map(strip); }
export const staffName = (id: string) => load().staff.find((s) => s.id === id)?.loginId ?? '—';

const canManage = (u: StaffUser, role: StaffRole) =>
  u.role === 'admin_head' ? role !== 'admin_head' : u.role === 'admin' ? role === 'reporter' || role === 'viewer' : false;

export function createStaff(u: StaffUser, loginId: string, fullName: string, role: StaffRole): string {
  need(canManage(u, role));
  const db = load();
  const id = loginId.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,30}$/.test(id)) throw new Error('bad_login_id');
  if (db.staff.some((s) => s.loginId === id)) throw new Error('login_taken');
  const temp = newToken().slice(0, 10);
  db.staff.push({ id: uid(), loginId: id, fullName: fullName.trim(), role, isActive: true, mustChangePassword: true, password: temp });
  save(db);
  return temp;
}

export function resetPassword(u: StaffUser, staffId: string): string {
  const db = load();
  const s = db.staff.find((x) => x.id === staffId);
  need(!!s && canManage(u, s.role));
  const temp = newToken().slice(0, 10);
  s!.password = temp; s!.mustChangePassword = true;
  save(db);
  return temp;
}

export function setActive(u: StaffUser, staffId: string, active: boolean) {
  const db = load();
  const s = db.staff.find((x) => x.id === staffId);
  need(!!s && canManage(u, s.role));
  s!.isActive = active;
  if (!active) db.reports.forEach((r) => { r.assignments = r.assignments.filter((a) => a.staffId !== staffId); });
  save(db);
}

// ───────── seed data (clearly marked sample) ─────────
function seed(): Db {
  const staff: Db['staff'] = [
    { id: 's-head', loginId: 'admin.head', fullName: 'Admin Head', role: 'admin_head', isActive: true, mustChangePassword: false, password: DEMO_PASSWORD },
    { id: 's-admin', loginId: 'admin', fullName: 'News Admin', role: 'admin', isActive: true, mustChangePassword: false, password: DEMO_PASSWORD },
    { id: 's-ram', loginId: 'ram.reporter', fullName: 'Ram (sample reporter)', role: 'reporter', isActive: true, mustChangePassword: false, password: DEMO_PASSWORD },
    { id: 's-sita', loginId: 'sita.reporter', fullName: 'Sita (sample reporter)', role: 'reporter', isActive: true, mustChangePassword: false, password: DEMO_PASSWORD },
    { id: 's-hari', loginId: 'hari.reporter', fullName: 'Hari (sample reporter)', role: 'reporter', isActive: true, mustChangePassword: false, password: DEMO_PASSWORD },
  ];
  const year = bsYear();
  let seq = 116;
  const mk = (p: Partial<Report> & Pick<Report, 'category' | 'description' | 'workflowState'>, minsAgo: number, loc: ReportLocation): Report => {
    seq += 1;
    const r: Report = {
      id: uid(), referenceCode: `HTP-${year}-${String(seq).padStart(6, '0')}`, type: 'quick', originalLanguage: 'ne', urgency: 'normal',
      isAnonymous: true, wantsVideoContact: false, visibility: 'private', priority: 'normal', trackingTokenHash: 'sample',
      submittedAt: ago(minsAgo), location: loc, media: [], assignments: [], notes: [], infoRequests: [], audit: [], sample: true, ...p,
    };
    r.audit.push({ id: uid(), at: r.submittedAt, actor: 'citizen', action: 'Report received from citizen' });
    const cs = citizenStatus(r.workflowState);
    const later = (h: number) => new Date(new Date(r.submittedAt).getTime() + h * 3600000).toISOString();
    r.citizenEvents = [{ status: 'received', at: r.submittedAt }];
    if (cs !== 'received') r.citizenEvents.push({ status: 'under_review', at: later(3) });
    if (cs === 'closed') { r.closedAt = later(26); r.citizenEvents.push({ status: 'closed', at: r.closedAt }); }
    return r;
  };
  const loc = (district: string, localLevel: string, ward?: number): ReportLocation =>
    ({ method: 'manual', provinceId: district === 'dhanusha' || district === 'siraha' || district === 'saptari' ? 'madhesh' : 'bagmati', districtId: district, localLevel, ward });

  const reports: Report[] = [
    mk({ category: 'corruption', description: 'सडक ठेक्काको काम अधुरो छ तर भुक्तानी भइसकेको भनिन्छ।', workflowState: 'screening' }, 6 * 1440, loc('dhanusha', 'dhanusha:janakpurdham-sub-metropolitan-city', 4)),
    mk({ category: 'health', description: 'स्वास्थ्य चौकीमा दुई हप्तादेखि आधारभूत औषधि छैन।', workflowState: 'editorial_decision', visibility: 'public',
      assignments: [{ staffId: 's-hari', isLead: true, assignedBy: 's-head', assignedAt: ago(5 * 1440) }],
      publicInfo: { title: 'स्वास्थ्य चौकीमा आधारभूत औषधि अभाव', summary: 'औषधि आपूर्ति ढिलो भएको स्वास्थ्य चौकीको जवाफ रिपोर्टसँगै राखिएको छ।', approvedBy: 'admin.head', approvedAt: ago(3 * 1440) } },
      7 * 1440, loc('saptari', 'saptari:bodebarsain-municipality', 2)),
    mk({ category: 'water', description: 'धारा बन्द, उही टोलबाट दोस्रो रिपोर्ट।', workflowState: 'duplicate' }, 4 * 1440 + 30, loc('siraha', 'siraha:dhangadhimai-municipality', 7)),
    mk({ category: 'water', description: 'तीन हप्तादेखि टोलको धारामा पानी आएको छैन।', workflowState: 'assigned', visibility: 'public',
      assignments: [{ staffId: 's-sita', isLead: true, assignedBy: 's-head', assignedAt: ago(3 * 1440), dueAt: ago(2 * 1440) }],
      publicInfo: { title: 'तीन हप्तादेखि धारामा पानी नआएको गुनासो', summary: 'एउटै टोलबाट धेरै रिपोर्ट आएका छन्। HTP खबरले सम्बन्धित निकायसँग कुरा गरिरहेको छ।', approvedBy: 'admin.head', approvedAt: ago(2 * 1440) } },
      4 * 1440, loc('siraha', 'siraha:dhangadhimai-municipality', 7)),
    mk({ category: 'road', description: 'लहान बजार नजिक मुख्य सडकमा ठूला खाल्डा छन्। हिजो राति मोटरसाइकल लडेर दुई जना घाइते भए।', workflowState: 'follow_up', priority: 'high', visibility: 'public',
      assignments: [{ staffId: 's-ram', isLead: true, assignedBy: 's-head', assignedAt: ago(2 * 1440), dueAt: new Date(Date.now() + 2 * 86400000).toISOString(), instructions: 'स्थलगत फोटो र नगरपालिकाको प्रतिक्रिया लिनुहोस्।' }],
      notes: [
        { id: uid(), authorId: 'ram.reporter', kind: 'finding', body: 'Visited site. Three potholes about 1 m wide near the market chowk. Shopkeeper confirms the accident.', at: ago(1 * 1440) },
        { id: uid(), authorId: 'ram.reporter', kind: 'contact_attempt', body: 'Called municipality engineering section; asked for comment.', at: ago(1 * 1440 + 120) },
      ],
      publicInfo: { title: 'लहान बजार नजिक मुख्य सडकमा ठूला खाल्डा, दुर्घटनाको जोखिम', summary: 'नागरिकको रिपोर्टपछि HTP खबरले स्थलगत जाँच गर्‍यो। नगरपालिकाले मर्मत गर्ने बताएको छ।', storyUrl: 'https://htpkhabar.com/', approvedBy: 'admin.head', approvedAt: ago(1 * 1440) } },
      2 * 1440 + 60, { ...loc('siraha', 'siraha:lahan-municipality', 5), method: 'gps', accuracyM: 12, locality: 'बजार चोक' }),
    mk({ category: 'education', description: 'हाम्रा गाउँक विद्यालयमे शिक्षक नियमित नहि अबैत छथि।', originalLanguage: 'mai', workflowState: 'received', isAnonymous: false, contact: { name: 'नमुना नागरिक', phone: '9800000000' } }, 40, loc('siraha', 'siraha:mirchaiya-municipality', 3)),
    mk({ category: 'disaster', description: 'खोलाले तटबन्ध काट्दैछ, रातिसम्म बस्तीमा पानी पस्ने खतरा छ।', urgency: 'urgent', priority: 'high', workflowState: 'received' }, 12, loc('saptari', 'saptari:rajbiraj-municipality', 1)),
  ];
  return { counters: { [year]: seq }, reports: reports.reverse(), staff };
}
