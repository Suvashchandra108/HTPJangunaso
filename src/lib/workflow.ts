import type { Report, StaffUser, WorkflowState } from './types';
import { citizenStatus } from './types';

/** Plain-language status the newsroom sees (fewer, clearer names than the internal states). */
export type Plain = 'new' | 'checking' | 'needs_info' | 'with_reporter' | 'decision' | 'rejected' | 'duplicate' | 'outside' | 'closed';

export function plainState(s: WorkflowState): Plain {
  switch (s) {
    case 'received': return 'new';
    case 'screening': case 'verification': return 'checking';
    case 'insufficient_info': return 'needs_info';
    case 'assigned': case 'follow_up': return 'with_reporter';
    case 'editorial_decision': return 'decision';
    case 'rejected': return 'rejected';
    case 'duplicate': return 'duplicate';
    case 'outside_scope': return 'outside';
    default: return 'closed';
  }
}

export const PLAIN_COLOR: Record<Plain, string> = {
  new: '#E4010B', checking: '#CA8A04', needs_info: '#CA8A04', with_reporter: '#1C1917', decision: '#7C3AED',
  rejected: '#A8A29E', duplicate: '#A8A29E', outside: '#A8A29E', closed: '#15803D',
};

/** Board columns, left to right. */
export type Column = 'new' | 'checking' | 'with_reporter' | 'decision' | 'closed';
export const COLUMNS: Column[] = ['new', 'checking', 'with_reporter', 'decision', 'closed'];
export function columnOf(r: Report): Column {
  const p = plainState(r.workflowState);
  if (p === 'needs_info') return 'checking';
  if (p === 'rejected' || p === 'duplicate' || p === 'outside') return 'closed';
  return p;
}

/** Today screen lanes. */
export type Lane = 'new' | 'reporters' | 'decide';
export function laneOf(r: Report): Lane | null {
  if (r.visibility === 'pending_approval') return 'decide';
  const c = columnOf(r);
  if (c === 'new' || c === 'checking') return 'new';
  if (c === 'with_reporter') return 'reporters';
  if (c === 'decision') return 'decide';
  return null;
}

export type Next =
  | { key: string; kind: 'move'; to: WorkflowState }
  | { key: 'assign'; kind: 'assign' }
  | { key: 'writeSummary'; kind: 'summary' }
  | { key: 'approve'; kind: 'publish' }
  | { key: string; kind: 'wait' };

/** The one obvious next action for this person on this report, or null when nothing is left. */
export function nextStep(u: StaffUser, r: Report): Next | null {
  const head = u.role === 'admin_head';
  const admin = head || u.role === 'admin';
  const onCase = u.role === 'reporter' && r.assignments.some((a) => a.staffId === u.id);
  if (r.visibility === 'pending_approval') return head ? { key: 'approve', kind: 'publish' } : { key: 'waitApprove', kind: 'wait' };
  switch (r.workflowState) {
    case 'received': return admin ? { key: 'start', kind: 'move', to: 'screening' } : null;
    case 'screening': return admin ? { key: 'verify', kind: 'move', to: 'verification' } : null;
    case 'verification': return head ? { key: 'assign', kind: 'assign' } : admin ? { key: 'waitAssign', kind: 'wait' } : null;
    case 'insufficient_info': return admin ? { key: 'backToCheck', kind: 'move', to: 'screening' } : null;
    case 'assigned': return admin || onCase ? { key: 'startWork', kind: 'move', to: 'follow_up' } : null;
    case 'follow_up': return admin || onCase ? { key: 'sendDecision', kind: 'move', to: 'editorial_decision' } : null;
    case 'editorial_decision':
      if (!admin) return null;
      if (!r.publicInfo && r.visibility === 'private') return { key: 'writeSummary', kind: 'summary' };
      return { key: 'close', kind: 'move', to: 'closed' };
    default: return null;
  }
}

const DAY = 86400000;
/** Days until the lead assignment is due: negative = late. Null when no deadline or the report is finished. */
export function dueDays(r: Report): number | null {
  const due = r.assignments.find((a) => a.isLead)?.dueAt ?? r.assignments[0]?.dueAt;
  if (!due || citizenStatus(r.workflowState) === 'closed') return null;
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const d = new Date(due); d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - startOfToday.getTime()) / DAY);
}

export function ageParts(iso: string): { unit: 'min' | 'hour' | 'day'; n: number } {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return { unit: 'min', n: mins };
  const h = Math.round(mins / 60);
  return h < 24 ? { unit: 'hour', n: h } : { unit: 'day', n: Math.round(h / 24) };
}
