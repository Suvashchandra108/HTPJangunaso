import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { emergencyNumbersFor, telLink, whatsappToHtp } from '../lib/contact';
import type { CategorySlug } from '../lib/types';
import { Alert } from './Icons';

/**
 * Main label in the current language with the English word underneath, for
 * people who recognise simple English words (Report, Send, Photo) more easily
 * than formal Nepali. Hidden when the page is already in English.
 */
export function Bi({ k, opts, inline }: { k: string; opts?: Record<string, unknown>; inline?: boolean }) {
  const { t, i18n } = useTranslation();
  const main = t(k, opts) as string;
  const en = i18n.getFixedT('en')(k, opts) as string;
  const showEn = i18n.language !== 'en' && en && en !== main;
  if (inline) return <>{main}{showEn && <span className="bi-en-inline" lang="en"> · {en}</span>}</>;
  return <span className="bi">{main}{showEn && <span className="bi-en" lang="en">{en}</span>}</span>;
}

// ───────── recorded voice help ─────────
// HTP staff record short clips (see docs/voice-script.md) and list them in
// public/audio/manifest.json, e.g. {"ne": ["home", "what"], "mai": ["home"]}.
// A speaker button appears only for clips that exist, so nothing breaks before
// the recordings are made.
let manifest: Promise<Record<string, string[]>> | undefined;
const loadManifest = () =>
  (manifest ??= fetch(`${import.meta.env.BASE_URL}audio/manifest.json`)
    .then((r): Promise<Record<string, string[]>> | Record<string, string[]> => (r.ok ? r.json() : {}))
    .catch(() => ({} as Record<string, string[]>)));

export function SpeakButton({ clip }: { clip: string }) {
  const { t, i18n } = useTranslation();
  const [ok, setOk] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement>();
  const lang = i18n.language === 'mai' ? 'mai' : i18n.language === 'en' ? 'en' : 'ne';
  useEffect(() => { let alive = true; loadManifest().then((m) => alive && setOk(!!m[lang]?.includes(clip))); return () => { alive = false; audio.current?.pause(); }; }, [clip, lang]);
  if (!ok) return null;
  const play = () => {
    audio.current?.pause();
    const a = new Audio(`${import.meta.env.BASE_URL}audio/${lang}/${clip}.mp3`);
    a.onended = () => setPlaying(false);
    audio.current = a; setPlaying(true); a.play().catch(() => setPlaying(false));
  };
  return (
    <button type="button" className="speak" onClick={play} aria-label={t('nav.listen')} aria-pressed={playing}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
    </button>
  );
}

// ───────── emergency ─────────
export function EmergencyCalls({ category }: { category?: CategorySlug }) {
  const { t } = useTranslation();
  const nums = emergencyNumbersFor(category);
  return (
    <div className="calls">
      {nums.map((n, i) => (
        <a key={n.number} href={telLink(n.number)} className={`call-btn${i === 0 ? ' main' : ''}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
          <span><strong>{n.number}</strong><small>{t(`emergency.${n.key}`)}</small></span>
        </a>
      ))}
    </div>
  );
}

/** Shown in the report form as soon as someone says a life is at risk. */
export function EmergencyPanel({ category }: { category?: CategorySlug }) {
  const { t } = useTranslation();
  return (
    <section className="emergency" role="alert">
      <strong className="emergency-title"><Alert size={22} /><Bi k="emergency.title" inline /></strong>
      <p>{t('emergency.body')}</p>
      <EmergencyCalls category={category} />
      <p className="emergency-note">{t('emergency.htpSub')}</p>
      <p className="emergency-note">{t('emergency.noAuto')}</p>
    </section>
  );
}

export function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.3-.2-.6-.3z" /></svg>;
}

/** Green WhatsApp button to HTP's official number, with optional pre-typed text. */
export function WhatsAppHtp({ text, label = 'home.whatsapp', sub = 'home.whatsappSub', compact }: { text: string; label?: string; sub?: string; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <a href={whatsappToHtp(text)} target="_blank" rel="noreferrer" className={`wa-btn${compact ? ' compact' : ''}`}>
      <WhatsAppIcon size={compact ? 20 : 24} />
      <span><strong>{t(label)}</strong>{!compact && <small>{t(sub)}</small>}</span>
    </a>
  );
}
