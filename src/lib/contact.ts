import type { CategorySlug } from './types';

/** HTP Khabar's official WhatsApp number (international format, no +). */
export const HTP_WHATSAPP = '9779851330200';
export const HTP_WHATSAPP_DISPLAY = '+977 985-1330200';

export interface EmergencyNumber { number: string; key: string }

// Official Nepal emergency and helpline numbers (all free to call).
// Source: Ncell emergency services list, checked 31 Oct 2026.
export const POLICE: EmergencyNumber = { number: '100', key: 'police' };
export const AMBULANCE: EmergencyNumber = { number: '102', key: 'ambulance' };
export const FIRE: EmergencyNumber = { number: '101', key: 'fire' };
const DISASTER: EmergencyNumber = { number: '1234', key: 'disaster' };
const WOMEN: EmergencyNumber = { number: '1145', key: 'women' };
const CHILD: EmergencyNumber = { number: '1098', key: 'child' };
const CIAA: EmergencyNumber = { number: '107', key: 'ciaa' };

/** Police is always first; the rest depend on the topic the citizen chose. */
export function emergencyNumbersFor(cat?: CategorySlug): EmergencyNumber[] {
  const extra: Record<CategorySlug, EmergencyNumber[]> = {
    road: [AMBULANCE], water: [AMBULANCE], electricity: [FIRE, AMBULANCE], health: [AMBULANCE],
    education: [CHILD], corruption: [CIAA], disaster: [DISASTER, AMBULANCE, FIRE], other: [AMBULANCE, FIRE],
  };
  const list = [POLICE, ...(cat ? extra[cat] : [AMBULANCE, FIRE])];
  if (cat !== 'education' && cat !== 'corruption') list.push(WOMEN, CHILD);
  return list.filter((n, i) => list.findIndex((m) => m.number === n.number) === i);
}

/** Opens WhatsApp to HTP with the text already typed; the person only taps Send. */
export const whatsappToHtp = (text: string) => `https://wa.me/${HTP_WHATSAPP}?text=${encodeURIComponent(text)}`;

/** Opens WhatsApp's own chooser so people can send something to themselves or anyone. */
export const whatsappShare = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export const telLink = (n: string) => `tel:${n.replace(/[^\d+]/g, '')}`;

/** Normalises a Nepali mobile number to wa.me format (977XXXXXXXXXX). */
export function toWhatsappNumber(phone: string): string | null {
  const d = phone.replace(/\D/g, '');
  if (/^9\d{9}$/.test(d)) return `977${d}`;
  if (/^9779\d{9}$/.test(d)) return d;
  return d.length >= 10 ? d : null;
}
