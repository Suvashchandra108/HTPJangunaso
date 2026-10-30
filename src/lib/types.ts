// Shared types. Names mirror the Phase 2 database schema so the
// Supabase implementation in Phase 4 can drop in behind lib/api.ts.

export type Lang = 'ne' | 'en' | 'mai';

export type CategorySlug =
  | 'road' | 'water' | 'electricity' | 'health'
  | 'education' | 'corruption' | 'disaster' | 'other';

export const CATEGORIES: CategorySlug[] = [
  'road', 'water', 'electricity', 'health', 'education', 'corruption', 'disaster', 'other',
];

export type StaffRole = 'admin_head' | 'admin' | 'reporter' | 'viewer';

export type WorkflowState =
  | 'received' | 'screening' | 'verification' | 'assigned' | 'follow_up'
  | 'editorial_decision' | 'insufficient_info' | 'rejected' | 'duplicate'
  | 'outside_scope' | 'closed';

export type CitizenStatus = 'received' | 'under_review' | 'closed';
export type Visibility = 'private' | 'pending_approval' | 'public' | 'withdrawn';
export type Urgency = 'normal' | 'urgent';
export type Priority = 'low' | 'normal' | 'high';
export type LocationMethod = 'gps' | 'map' | 'manual' | 'none';
export type MediaKind = 'photo' | 'voice_description' | 'audio' | 'document';

export interface ReportLocation {
  method: LocationMethod;
  lat?: number;
  lng?: number;
  accuracyM?: number;
  capturedAt?: string;
  provinceId?: string;
  districtId?: string;
  localLevel?: string;
  ward?: number;
  locality?: string;
}

export interface MediaItem {
  id: string;
  kind: MediaKind;
  mime: string;
  sizeBytes: number;
  durationS?: number;
  /** Demo only: a data URL kept in the browser. Phase 4 stores files in Supabase Storage. */
  dataUrl?: string;
  name?: string;
}

export interface Contact { name?: string; phone?: string; email?: string }

export interface Assignment { staffId: string; isLead: boolean; dueAt?: string; instructions?: string; assignedBy: string; assignedAt: string }

export type NoteKind = 'note' | 'verification' | 'contact_attempt' | 'finding';
export interface Note { id: string; authorId: string; kind: NoteKind; body: string; at: string }

export interface AuditEntry { id: string; at: string; actor: string; action: string; details?: string }

export interface InfoRequest { id: string; message: string; requestedBy: string; at: string; answer?: string; answeredAt?: string }

export interface PublicInfo { title: string; summary: string; storyUrl?: string; approvedBy?: string; approvedAt?: string }

export interface Report {
  id: string;
  referenceCode: string;
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
  workflowState: WorkflowState;
  visibility: Visibility;
  priority: Priority;
  duplicateOf?: string;
  trackingTokenHash: string;
  submittedAt: string;
  closedAt?: string;
  location: ReportLocation;
  contact?: Contact;
  media: MediaItem[];
  assignments: Assignment[];
  notes: Note[];
  infoRequests: InfoRequest[];
  publicInfo?: PublicInfo;
  audit: AuditEntry[];
  sample?: boolean;
}

export interface StaffUser { id: string; loginId: string; fullName: string; role: StaffRole; isActive: boolean; mustChangePassword: boolean }

/** Citizen-facing status is derived from the internal state and never stored. */
export function citizenStatus(s: WorkflowState): CitizenStatus {
  if (s === 'received') return 'received';
  if (s === 'rejected' || s === 'duplicate' || s === 'outside_scope' || s === 'closed') return 'closed';
  return 'under_review';
}
