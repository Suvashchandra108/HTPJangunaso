import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BottomNav, PageHead } from '../components/Layout';
import { Camera, CategoryIcon, Check } from '../components/Icons';
import { Bi, WhatsAppHtp } from '../components/Help';
import { PhotoPicker, VoiceRecorder } from '../components/Media';
import { addInfo, track, type TrackResult } from '../lib/api';
import { bsShort } from '../lib/bs';
import { forgetMine, listMine, saveMine, type SavedReport } from '../lib/myReports';
import type { CitizenStatus, Lang, MediaItem } from '../lib/types';

const ORDER: CitizenStatus[] = ['received', 'under_review', 'closed'];
const DOT: Record<CitizenStatus, string> = { received: '#A8A29E', under_review: 'var(--amber-dot)', closed: 'var(--green)' };

function StatusPill({ s }: { s: CitizenStatus }) {
  const { t } = useTranslation();
  return <span className="state" style={{ fontSize: 14 }}><span className="dot" style={{ background: DOT[s] }} />{t(`track.${s}`)}</span>;
}

export default function TrackPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const params = useParams();
  const nav = useNavigate();
  const [mine, setMine] = useState<SavedReport[]>(() => listMine());
  const [statuses, setStatuses] = useState<Record<string, CitizenStatus>>({});
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
    setState('busy'); setSent(false);
    const out = await track(r, c);
    setRes(out); setRef(r); setCode(c);
    setState(out ? 'idle' : 'notfound');
    if (out) {
      // Opening a private link also remembers it on this phone.
      saveMine({ ref: out.referenceCode, token: c.trim(), submittedAt: out.submittedAt, category: out.category });
      setMine(listMine());
    }
  }

  // Re-check whenever a different private link is opened, even if this page is already showing.
  useEffect(() => { if (params.ref && params.token) check(params.ref, params.token); }, [params.ref, params.token]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    listMine().forEach((m) => track(m.ref, m.token).then((r) => r && setStatuses((s) => ({ ...s, [m.ref]: r.status }))));
  }, []);

  async function send() {
    if (!res?.openRequest || (!answer.trim() && !voice && !photos.length)) return;
    await addInfo(res.referenceCode, code.trim(), res.openRequest.id, answer, [...(voice ? [voice] : []), ...photos]);
    setAnswer(''); setVoice(undefined); setPhotos([]); setShowPhotos(false);
    await check();
    setSent(true);
  }

  function forget(r: string) {
    forgetMine(r); setMine(listMine());
    if (res?.referenceCode === r) { setRes(null); setRef(''); setCode(''); nav('/track', { replace: true }); }
  }

  const step = res ? ORDER.indexOf(res.status) : -1;
  const eventAt = (s: CitizenStatus) => res?.events.find((e) => e.status === s)?.at;

  return (
    <div className="app">
      <PageHead title={t('track.title')} back="/" />
      <main className="page" style={{ gap: 18 }}>
        {mine.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 className="section-title" style={{ fontSize: 16 }}>{t('track.onPhone')}</h2>
            <div className="my-list">
              {mine.map((m) => (
                <button key={m.ref} type="button" className="my-item" aria-current={res?.referenceCode === m.ref} onClick={() => check(m.ref, m.token)}>
                  <span className="icon-tile"><CategoryIcon cat={m.category} /></span>
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <strong className="mono" style={{ fontSize: 14 }}>{m.ref}</strong>
                    <span className="tiny muted">{t(`cat.${m.category}`)} · {bsShort(m.submittedAt, lang)}</span>
                  </span>
                  {statuses[m.ref] && <StatusPill s={statuses[m.ref]} />}
                </button>
              ))}
            </div>
          </section>
        )}
        {mine.length === 0 && !params.ref && <p className="notice">{t('track.nonePhone')}</p>}

        {res && (
          <section className="panel" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <strong className="mono" style={{ fontSize: 16 }}>{res.referenceCode}</strong>
                <span className="tiny muted">{t(`cat.${res.category}`)}</span>
              </span>
              <StatusPill s={res.status} />
            </div>

            <ol className="steps-v">
              {ORDER.map((s, i) => {
                const at = eventAt(s);
                const cls = i < step ? 'done' : i === step ? (s === 'closed' ? 'done' : 'current') : '';
                return (
                  <li key={s} className={cls}>
                    <span className="step-dot">{(i < step || (i === step && s === 'closed')) && <Check size={14} />}</span>
                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: 16, color: i === step ? 'var(--ink)' : i < step ? 'var(--text-2)' : 'var(--muted)' }}><Bi k={`track.${s}`} inline /></strong>
                      {at && i <= step && <span className="tiny muted">{bsShort(at, lang)}</span>}
                      {i === step && <span className="small" style={{ color: 'var(--text-2)', marginTop: 2 }}>{t(`track.desc_${s}`)}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{t(`track.next_${res.status}`)}</p>

            {(res.published || res.status === 'closed') && (
              <div style={{ background: 'var(--white)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, borderLeft: 0 }}>
                <span className="tiny muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('track.outcome')}</span>
                {res.published ? (
                  <>
                    <span style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--green)', fontWeight: 700 }}><Check size={16} />{t('track.storyOut')}</span>
                    <strong lang="ne" style={{ fontSize: 16 }}>{res.published.title}</strong>
                    {res.published.storyUrl && <a href={res.published.storyUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ minHeight: 46, fontSize: 15 }}>{t('track.readStory')}</a>}
                  </>
                ) : <span className="small" style={{ color: 'var(--text-2)' }}>{t('track.noStory')}</span>}
              </div>
            )}
          </section>
        )}

        {sent && <p role="status" style={{ margin: 0, color: 'var(--green)', fontWeight: 700 }}>{t('track.sent')}</p>}

        {res?.openRequest && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, border: '1.5px solid var(--red)', borderRadius: 16 }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red-dark)' }}><span className="dot" style={{ background: 'var(--red)' }} />{t('track.request')}</strong>
            <p style={{ margin: 0, fontSize: 16 }}>{res.openRequest.message}</p>
            <label htmlFor="ans" style={{ fontSize: 14, fontWeight: 700 }}>{t('track.answer')}</label>
            <textarea id="ans" className="textarea" rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={t('track.answerPh')} />
            <VoiceRecorder value={voice} onChange={setVoice} />
            {showPhotos ? <PhotoPicker items={photos} onChange={setPhotos} /> : (
              <button type="button" className="btn btn-quiet" onClick={() => setShowPhotos(true)}><span style={{ color: 'var(--red)' }}><Camera /></span><Bi k="report.addPhoto" inline /></button>
            )}
            <button type="button" className="btn btn-primary" onClick={send}><Bi k="track.send" /></button>
          </section>
        )}

        {res && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <WhatsAppHtp compact label="track.askWa" text={`${t('wa.header')}\n${t('wa.ref')}: ${res.referenceCode}\n`} />
            <button type="button" className="link-btn" style={{ color: 'var(--muted)', fontWeight: 600, alignSelf: 'center' }} onClick={() => forget(res.referenceCode)}>{t('track.forget')}</button>
          </div>
        )}

        <details open={!mine.length || state === 'notfound' || (!!params.ref && !res)} style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 15, minHeight: 32 }}>{t('track.other')}</summary>
          <form style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); check(); }}>
            <label className="field" style={{ fontSize: 15, fontWeight: 700 }}>{t('track.ref')}
              <input className="input mono" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="HTP-2083-000125" autoCapitalize="characters" spellCheck={false} />
            </label>
            <label className="field" style={{ fontSize: 15, fontWeight: 700 }}>{t('track.code')}
              <input className="input" type="password" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck={false} />
              <span className="hint" style={{ fontWeight: 400 }}>{t('track.codeHint')}</span>
            </label>
            <button type="submit" className="btn btn-primary" disabled={state === 'busy'}>{state === 'busy' ? t('track.checking') : <Bi k="track.check" />}</button>
            {state === 'notfound' && <p className="error" role="alert" style={{ margin: 0 }}>{t('track.notFound')}</p>}
          </form>
        </details>

        <p className="tiny muted" style={{ margin: 0 }}>{t('track.onlyStatus')}</p>
      </main>
      <BottomNav />
    </div>
  );
}
