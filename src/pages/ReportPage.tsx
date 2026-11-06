import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LangSwitch, PageHead } from '../components/Layout';
import { Check, Pin } from '../components/Icons';
import { Bi, EmergencyPanel, SpeakButton } from '../components/Help';
import { FileAttach, PhotoPicker, VoiceRecorder } from '../components/Media';
import { useDraft } from '../lib/draft';
import { submitReport } from '../lib/api';
import { findDistrict, findLocalLevel, placeName } from '../lib/geo';
import { toNeDigits } from '../lib/bs';
import { CATEGORIES, type CategorySlug, type Lang, type MediaItem } from '../lib/types';

export default function ReportPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const detailed = params.get('mode') === 'detailed';
  const voiceFirst = params.get('voice') === '1';
  const { draft, update, clear, touched } = useDraft();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const voice = draft.media.find((m) => m.kind === 'voice_description');
  const photos = draft.media.filter((m) => m.kind === 'photo');
  const docs = draft.media.filter((m) => m.kind === 'document');
  const audios = draft.media.filter((m) => m.kind === 'audio');
  const setKind = (kind: MediaItem['kind'], items: MediaItem[]) => update({ media: [...draft.media.filter((m) => m.kind !== kind), ...items] });

  // Opening the form from a category tile pre-selects that category.
  const preset = params.get('cat') as CategorySlug | null;
  useEffect(() => {
    if (preset && CATEGORIES.includes(preset)) {
      update({ category: preset });
      const next = new URLSearchParams(params); next.delete('cat');
      setParams(next, { replace: true });
    }
  }, [preset]); // eslint-disable-line react-hooks/exhaustive-deps

  const loc = draft.location;
  const ll = findLocalLevel(loc.localLevel);
  const locTitle = ll ? placeName(ll, lang) : loc.localLevel || placeName(findDistrict(loc.districtId), lang);
  const locSub = [
    loc.ward ? `${t('location.ward')} ${toNeDigits(loc.ward, lang)}` : '',
    ll || loc.localLevel ? placeName(findDistrict(loc.districtId), lang) : '',
    loc.method === 'gps' ? `GPS ${loc.accuracyM ? t('location.accuracy', { m: toNeDigits(loc.accuracyM, lang) }) : ''}` : loc.method === 'map' ? t('location.viaMap') : '',
  ].filter(Boolean).join(' · ');

  // Progress: what a citizen has done out of the essentials.
  const done = [!!(draft.description.trim() || voice), !!draft.category, loc.method !== 'none' || !!loc.districtId, draft.consent].filter(Boolean).length;

  function validate() {
    const e: Record<string, string> = {};
    if (!draft.description.trim() && !voice) e.what = t('report.whatOrVoice');
    if (!draft.category) e.topic = t('report.topicRequired');
    if (!draft.isAnonymous && !draft.phone.trim() && !draft.email.trim()) e.contact = t('report.contactRequired');
    if (draft.wantsVideoContact && (draft.isAnonymous || (!draft.phone.trim() && !draft.email.trim()))) e.contact = t('report.videoNeedsContact');
    if (!draft.consent) e.consent = t('report.consentRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setFailed(false);
    if (!validate()) return;
    setBusy(true);
    try {
      const res = await submitReport({
        type: detailed ? 'detailed' : 'quick', category: draft.category!, title: draft.title || undefined,
        description: draft.description, originalLanguage: lang, urgency: draft.urgency,
        incidentAt: draft.incidentDate || undefined, institution: draft.institution || undefined,
        isAnonymous: draft.isAnonymous, wantsVideoContact: draft.wantsVideoContact, location: draft.location,
        contact: draft.isAnonymous ? undefined : { name: draft.name || undefined, phone: draft.phone || undefined, email: draft.email || undefined },
        media: draft.media,
      });
      const summary = { category: draft.category!, description: draft.description, urgency: draft.urgency, location: draft.location, hasVoice: !!voice, photoCount: photos.length };
      clear();
      nav('/done', { replace: true, state: { ...res, summary } });
    } catch {
      setFailed(true);
    } finally { setBusy(false); }
  }

  return (
    <div className="app">
      <PageHead title={detailed ? t('report.detailedTitle') : t('report.quickTitle')} back="/" right={<LangSwitch />} />
      <div className="progress" aria-hidden="true"><div style={{ width: `${(done / 4) * 100}%` }} /></div>
      {touched && <span className="tiny" role="status" style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 16px 0', justifyContent: 'flex-end' }}><Check size={14} />{t('report.draftSaved')}</span>}

      <form className="page" onSubmit={onSubmit} noValidate>
        {detailed && (
          <div className="field">
            <label htmlFor="title" className="label">{t('report.title')} <span className="opt">· {t('report.optional')}</span></label>
            <input id="title" className="input" value={draft.title} onChange={(e) => update({ title: e.target.value })} placeholder={t('report.titlePh')} />
          </div>
        )}

        <div className="field">
          <div className="label-row"><label htmlFor="what" className="label"><Bi k="report.what" inline /> <span className="req">*</span></label><SpeakButton clip="what" /></div>
          {voiceFirst && <VoiceRecorder value={voice} onChange={(m) => setKind('voice_description', m ? [m] : [])} />}
          <textarea id="what" className="textarea" rows={detailed ? 5 : 3} value={draft.description} placeholder={t('report.whatPh')}
            onChange={(e) => update({ description: e.target.value })} aria-invalid={!!errors.what} aria-describedby={errors.what ? 'what-err' : undefined} />
          {!voiceFirst && <VoiceRecorder value={voice} onChange={(m) => setKind('voice_description', m ? [m] : [])} />}
          {errors.what && <span id="what-err" className="error" role="alert">{errors.what}</span>}
        </div>

        <fieldset>
          <legend className="label" style={{ width: '100%' }}><span className="label-row"><span><Bi k="report.topic" inline /> <span className="req">*</span></span><SpeakButton clip="topic" /></span></legend>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={draft.category === c} onClick={() => update({ category: c })}><Bi k={`cat.${c}`} /></button>
            ))}
          </div>
          {errors.topic && <p className="error" role="alert">{errors.topic}</p>}
        </fieldset>

        <fieldset style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <legend className="label" style={{ width: '100%' }}><span className="label-row"><span>{t('report.urgency')}</span><SpeakButton clip="urgency" /></span></legend>
          <label className="choice"><input type="radio" name="urgency" checked={draft.urgency === 'normal'} onChange={() => update({ urgency: 'normal' })} />{t('report.normal')}</label>
          <label className="choice urgent"><input type="radio" name="urgency" checked={draft.urgency === 'urgent'} onChange={() => update({ urgency: 'urgent' })} />
            <span>{t('report.urgent')}<span className="sub">{t('report.urgentSub')}</span></span></label>
          {draft.urgency === 'urgent' && <EmergencyPanel category={draft.category} />}
        </fieldset>

        <div className="field">
          <div className="label-row"><span className="label"><Bi k="report.where" inline /></span><SpeakButton clip="where" /></div>
          <Link to="/report/location" className="row-link">
            <span className="icon-tile white"><Pin /></span>
            {locTitle ? (
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><strong>{locTitle}</strong>{locSub && <span className="small muted">{locSub}</span>}</span>
            ) : (
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><strong>{t('report.whereAdd')}</strong><span className="small muted">{t('report.whereAddSub')}</span></span>
            )}
            <span className="small" style={{ color: 'var(--red-dark)', fontWeight: 700 }}>{locTitle ? t('report.change') : '+'}</span>
          </Link>
        </div>

        {detailed && (
          <div className="grid-2">
            <div className="field">
              <label htmlFor="when" className="label" style={{ fontSize: 15 }}>{t('report.when')}</label>
              <input id="when" type="datetime-local" className="input" value={draft.incidentDate} onChange={(e) => update({ incidentDate: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="inst" className="label" style={{ fontSize: 15 }}>{t('report.institution')}</label>
              <input id="inst" className="input" value={draft.institution} placeholder={t('report.institutionPh')} onChange={(e) => update({ institution: e.target.value })} />
            </div>
          </div>
        )}

        <div className="field">
          <span className="label"><Bi k="report.photos" inline /> <span className="opt">{t('report.optional')} · {t('report.upTo', { n: toNeDigits(5, lang) })}</span></span>
          <PhotoPicker items={photos} onChange={(m) => setKind('photo', m)} />
          <label className="check"><input type="checkbox" checked={draft.wantsVideoContact}
            onChange={(e) => update({ wantsVideoContact: e.target.checked, ...(e.target.checked ? { isAnonymous: false } : {}) })} />{t('report.video')}</label>
        </div>

        {detailed && (
          <>
            <div className="field"><span className="label" style={{ fontSize: 15 }}>{t('report.documents')}</span><FileAttach kind="document" items={docs} onChange={(m) => setKind('document', m)} /></div>
            <div className="field"><span className="label" style={{ fontSize: 15 }}>{t('report.audioFile')}</span><FileAttach kind="audio" items={audios} onChange={(m) => setKind('audio', m)} /></div>
          </>
        )}

        <fieldset>
          <legend className="label" style={{ width: '100%' }}><span className="label-row"><span>{t('report.identity')}</span><SpeakButton clip="identity" /></span></legend>
          <div className="grid-2">
            <label className="choice"><input type="radio" name="id" checked={draft.isAnonymous} onChange={() => update({ isAnonymous: true, wantsVideoContact: false })} /><Bi k="report.anon" /></label>
            <label className="choice"><input type="radio" name="id" checked={!draft.isAnonymous} onChange={() => update({ isAnonymous: false })} /><Bi k="report.withContact" /></label>
          </div>
          {draft.isAnonymous ? (
            <p className="hint" style={{ margin: '8px 0 0' }}>{t('report.anonNote')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              <label className="field small" style={{ fontWeight: 700 }}>{t('report.name')} <span className="opt" style={{ fontWeight: 400 }}>({t('report.optional')})</span>
                <input className="input" value={draft.name} autoComplete="name" onChange={(e) => update({ name: e.target.value })} /></label>
              <div className="grid-2">
                <label className="field small" style={{ fontWeight: 700 }}>{t('report.phone')}
                  <input className="input" type="tel" inputMode="tel" autoComplete="tel" value={draft.phone} onChange={(e) => update({ phone: e.target.value })} /></label>
                <label className="field small" style={{ fontWeight: 700 }}>{t('report.email')}
                  <input className="input" type="email" autoComplete="email" value={draft.email} onChange={(e) => update({ email: e.target.value })} /></label>
              </div>
              <span className="hint">{t('report.contactHint')}</span>
            </div>
          )}
          {errors.contact && <p className="error" role="alert">{errors.contact}</p>}
        </fieldset>

        <div>
          <label className="check" style={{ fontSize: 14, color: 'var(--text-2)' }}>
            <input type="checkbox" checked={draft.consent} onChange={(e) => update({ consent: e.target.checked })} />{t('report.consent')}</label>
          {errors.consent && <p className="error" role="alert">{errors.consent}</p>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
          {Object.keys(errors).length > 0 && <p className="error" style={{ margin: 0 }}>{t('report.fixErrors')}</p>}
          {failed && <p className="error" role="alert" style={{ margin: 0 }}>{t('report.failed')}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy} style={{ minHeight: 60, fontSize: 19 }}>{busy ? t('report.submitting') : <Bi k="report.submit" />}</button>
          <button type="button" className="link-btn" onClick={() => setParams(detailed ? {} : { mode: 'detailed' })}>{detailed ? t('report.toQuick') : t('report.addDetail')}</button>
        </div>
      </form>
    </div>
  );
}
