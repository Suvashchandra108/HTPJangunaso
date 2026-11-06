import type { TFunction } from 'i18next';
import type { CategorySlug, ReportLocation, Urgency } from './types';
import { findDistrict, findLocalLevel, placeName } from './geo';

export interface ReportSummary {
  category: CategorySlug;
  description: string;
  urgency: Urgency;
  location: ReportLocation;
  hasVoice: boolean;
  photoCount: number;
}

export function placeText(loc: ReportLocation, lang: string, wardLabel: string): string {
  const ll = findLocalLevel(loc.localLevel);
  return [
    loc.locality,
    loc.ward ? `${wardLabel} ${loc.ward}` : '',
    ll ? placeName(ll, lang) : loc.localLevel,
    placeName(findDistrict(loc.districtId), lang),
  ].filter(Boolean).join(', ');
}

/** The message pre-typed into WhatsApp for HTP's number. Written in the citizen's language. */
export function reportMessage(t: TFunction, lang: string, ref: string, s: ReportSummary): string {
  const lines = [
    `${s.urgency === 'urgent' ? `🔴 ${t('wa.urgent')} — ` : ''}${t('wa.header')}`,
    `${t('wa.ref')}: ${ref}`,
    `${t('wa.topic')}: ${t(`cat.${s.category}`)}`,
  ];
  if (s.description.trim()) lines.push(`${t('wa.what')}: ${s.description.trim()}`);
  const place = placeText(s.location, lang, t('location.ward'));
  if (place) lines.push(`${t('wa.where')}: ${place}`);
  if (s.location.lat != null && s.location.lng != null) lines.push(`${t('wa.map')}: https://maps.google.com/?q=${s.location.lat.toFixed(5)},${s.location.lng.toFixed(5)}`);
  if (s.hasVoice) lines.push(t('wa.voiceNote'));
  if (s.photoCount) lines.push(t('wa.photosNote'));
  return lines.join('\n');
}
