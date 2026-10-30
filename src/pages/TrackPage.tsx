import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BottomNav, PageHead } from '../components/Layout';
import { Camera } from '../components/Icons';
import { PhotoPicker, VoiceRecorder } from '../components/Media';
import { addInfo, track, type TrackResult } from '../lib/api';
import { bsShort } from '../lib/bs';
import type { Lang, MediaItem } from '../lib/types';

const ORDER = ['received', 'under_review', 'closed'] as const;

export default function TrackPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const params = useParams();
  const [ref, setRef] = useState(params.ref ?? '');
  const [code, setCode] = useState(params.token ?? '');
  const [res, setRes] = useState<TrackResult | null>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'notfound'>('idle');
  const [answer, setAnswer] = useState('');
  const [voice, setVoice] = useState<MediaItem>();
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [sent, setSent] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);

  async function check(r = ref, c = code) {
    if (!r.trim() || !c.trim()) return;
    setState('busy');
    const out = await track(r, c);
    setRes(out);
    setState(out ? 'idle' : 'notfound');
  }
  useEffect(() => { if (params.ref && params.token) check(params.ref, params.token); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    if (!res?.openRequest || (!answer.trim() && !voice && !photos.length)) return;
    await addInfo(res.referenceCode, code.trim(), res.openRequest.id, answer, [...(voice ? [voice] : []), ...photos]);
    setSent(true); setAnswer(''); setVoice(undefined); setPhotos([]);
    check();
  }

  const step = res ? ORDER.indexOf(res.status) : -1;

  return (
    <div className="app">
      <PageHead title={t('track.title')} back="/" />
      <main className="page">
        <form style={{ display: 'flex', flexDirection: 'column', gap: 12 }} onSubmit={(e) => { e.preventDefault(); check(); }}>
          <label className="field" style={{ fontSize: 15, fontWeight: 700 }}>{t('track.ref')}
            <input className="input mono" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="HTP-2083-000125" autoCapitalize="characters" spellCheck={false} />
          </label>
          <label className="field" style={{ fontSize: 15, fontWeight: 700 }}>{t('track.code')}
            <input className="input" type="password" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck={false} />
            <span className="hint" style={{ fontWeight: 400 }}>{t('track.codeHint')}</span>
          </label>
          <button type="submit" className="btn btn-primary" disabled={state === 'busy'}>{state === 'busy' ? t('track.checking') : t('track.check')}</button>
          {state === 'notfound' && <p className="error" role="alert" style={{ margin: 0 }}>{t('track.notFound')}</p>}
        </form>

        {res && (
          <section className="panel" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong className="mono" style={{ fontSize: 15 }}>{res.referenceCode}</strong>
              <span className="tiny muted">{bsShort(res.submittedAt, lang)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6 }}>
              {ORDER.map((s, i) => <div key={s} style={{ height: 6, borderRadius: 3, background: i <= step ? 'var(--red)' : 'var(--line-strong)' }} />)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6, fontSize: 14 }}>
              {ORDER.map((s, i) => <span key={s} style={i === step ? { color: 'var(--red)', fontWeight: 800 } : { color: i < step ? 'var(--text-2)' : 'var(--muted)' }}>{t(`track.${s}`)}</span>)}
            </div>
            <p style={{ margin: 0, fontSize: 15, color: 'var(--text-2)' }}>{t(`track.desc_${res.status}`)}</p>
          </section>
        )}

        {sent && <p role="status" style={{ margin: 0, color: 'var(--green)', fontWeight: 700 }}>{t('track.sent')}</p>}

        {res?.openRequest && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, border: '1.5px solid var(--red)', borderRadius: 16 }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red-dark)' }}><span className="dot" style={{ background: 'var(--red)' }} />{t('track.request')}</strong>
            <p style={{ margin: 0, fontSize: 15 }}>{res.openRequest.message}</p>
            <label htmlFor="ans" style={{ fontSize: 14, fontWeight: 700 }}>{t('track.answer')}</label>
            <textarea id="ans" className="textarea" rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={t('track.answerPh')} />
            <VoiceRecorder value={voice} onChange={setVoice} />
            {showPhotos ? <PhotoPicker items={photos} onChange={setPhotos} /> : (
              <button type="button" className="btn btn-quiet" onClick={() => setShowPhotos(true)}><span style={{ color: 'var(--red)' }}><Camera /></span>{t('report.addPhoto')}</button>
            )}
            <button type="button" className="btn btn-primary" onClick={send}>{t('track.send')}</button>
          </section>
        )}

        <p className="tiny muted" style={{ margin: 0 }}>{t('track.onlyStatus')}</p>
      </main>
      <BottomNav />
    </div>
  );
}
