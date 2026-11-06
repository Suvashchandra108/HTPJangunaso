import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '../components/Layout';
import { Check, Lock } from '../components/Icons';
import { Bi, EmergencyCalls, WhatsAppHtp, WhatsAppIcon } from '../components/Help';
import { bsLong } from '../lib/bs';
import { whatsappShare } from '../lib/contact';
import { saveMine } from '../lib/myReports';
import { reportMessage, type ReportSummary } from '../lib/waMessage';
import type { Lang } from '../lib/types';

interface DoneState { referenceCode: string; trackingToken: string; submittedAt: string; summary?: ReportSummary }

// The private link is shown here once. It also goes into "My reports" on this
// phone so the person never has to type it; it is never sent to any server
// other than inside the tracking request itself.
export default function DonePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const s = useLocation().state as DoneState | null;
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState('');

  const link = s ? `${location.origin}${location.pathname}#/track/${s.referenceCode}/${s.trackingToken}` : '';
  useEffect(() => {
    if (!s) return;
    if (s.summary) saveMine({ ref: s.referenceCode, token: s.trackingToken, submittedAt: s.submittedAt, category: s.summary.category });
    import('qrcode').then((q) => q.toDataURL(link, { margin: 1, width: 240, color: { dark: '#1C1917', light: '#FFFFFF' } })).then(setQr).catch(() => undefined);
  }, [s?.referenceCode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) {
    return (
      <div className="app">
        <header className="topbar"><Logo /></header>
        <main className="page"><p className="notice">{t('done.missing')}</p><Link to="/track" className="btn btn-primary"><Bi k="home.track" /></Link></main>
      </div>
    );
  }

  const urgent = s.summary?.urgency === 'urgent';
  const waText = s.summary ? reportMessage(t, lang, s.referenceCode, s.summary) : `${t('wa.header')}\n${t('wa.ref')}: ${s.referenceCode}`;
  const selfText = `${t('wa.mine')}\n${t('wa.ref')}: ${s.referenceCode}\n${t('wa.openLink')}: ${link}`;
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* clipboard blocked */ } };

  return (
    <div className="app">
      <header className="topbar"><Logo /></header>
      <section className="hero" style={{ alignItems: 'center', textAlign: 'center', gap: 10, paddingBottom: 30 }}>
        <span style={{ width: 60, height: 60, borderRadius: '50%', background: '#fff', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={30} /></span>
        <h1 style={{ fontSize: 28 }}>{t('done.title')}</h1>
        <p style={{ fontSize: 16 }}>{t('done.thanks')}</p>
      </section>
      <main className="page" style={{ paddingTop: 0, gap: 18 }}>
        <div className="card-raised" style={{ marginTop: -18, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="small muted">{t('done.ref')}</span>
          <span className="mono" style={{ fontSize: 26, fontWeight: 800, letterSpacing: 0.5 }}>{s.referenceCode}</span>
          <span className="muted" style={{ fontSize: 15 }}>{bsLong(s.submittedAt, lang)}</span>
        </div>

        {urgent && (
          <section className="emergency" role="alert">
            <strong className="emergency-title">{t('done.urgentTitle')}</strong>
            <EmergencyCalls category={s.summary?.category} />
            <WhatsAppHtp text={waText} label="emergency.sendNow" sub="emergency.privacy" />
            <p className="emergency-note">{t('emergency.noAuto')}</p>
          </section>
        )}

        <p role="status" style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center', color: 'var(--green)', fontWeight: 700, fontSize: 15 }}><Check size={16} />{t('done.saved')}</p>

        <div className="panel-ink" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}><span style={{ color: '#FFB4B7' }}><Lock /></span>{t('done.keep')}</strong>
          <p style={{ margin: 0, fontSize: 14, color: '#E7E5E4' }}>{t('done.keepBody')}</p>
          {qr && (
            <div className="qr-box">
              <img src={qr} alt={t('done.qr')} />
              <span className="small" style={{ color: 'var(--text-2)' }}>{t('done.qrHint')}</span>
            </div>
          )}
          <div className="mono" style={{ padding: '10px 12px', background: '#292524', borderRadius: 10, fontSize: 12, wordBreak: 'break-all' }}>{link}</div>
          <div className="grid-2">
            <a href={whatsappShare(selfText)} target="_blank" rel="noreferrer" className="btn" style={{ fontSize: 15, minHeight: 52, background: '#128C4A', color: '#fff' }}><WhatsAppIcon /><Bi k="done.share" /></a>
            <button type="button" className="btn" style={{ fontSize: 15, minHeight: 52, background: 'transparent', border: '1.5px solid #57534E', color: '#fff' }} onClick={copy}>{copied ? t('done.copied') : <Bi k="done.copy" />}</button>
          </div>
        </div>

        {!urgent && <WhatsAppHtp text={waText} label="emergency.sendNow" sub="emergency.privacy" />}

        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="section-title" style={{ fontSize: 17 }}>{t('done.next')}</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15, color: 'var(--text-2)' }}>
            {['next1', 'next2', 'next3'].map((k) => <li key={k} style={{ display: 'flex', gap: 10 }}><span className="dot" style={{ background: 'var(--red)', width: 6, height: 6, marginTop: 9 }} />{t(`done.${k}`)}</li>)}
          </ul>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
          <Link to={`/track/${s.referenceCode}/${s.trackingToken}`} className="btn btn-outline"><Bi k="done.status" /></Link>
          <Link to="/" className="link-btn" style={{ textAlign: 'center', textDecoration: 'none' }}>{t('done.home')}</Link>
        </div>
      </main>
    </div>
  );
}
