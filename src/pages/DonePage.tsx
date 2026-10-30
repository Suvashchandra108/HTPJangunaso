import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '../components/Layout';
import { Check, Lock } from '../components/Icons';
import { bsLong } from '../lib/bs';
import type { Lang } from '../lib/types';

interface DoneState { referenceCode: string; trackingToken: string; submittedAt: string }

// The tracking token is shown exactly once, here. It is passed in router state
// (memory only), never written to storage or the URL of this page.
export default function DonePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const s = useLocation().state as DoneState | null;
  const [copied, setCopied] = useState(false);

  if (!s) {
    return (
      <div className="app">
        <header className="topbar"><Logo /></header>
        <main className="page"><p className="notice">{t('done.missing')}</p><Link to="/track" className="btn btn-primary">{t('done.status')}</Link></main>
      </div>
    );
  }

  const link = `${location.origin}${location.pathname}#/track/${s.referenceCode}/${s.trackingToken}`;
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* clipboard blocked */ } };
  const share = async () => {
    const text = `${t('done.ref')}: ${s.referenceCode}\n${link}`;
    if (navigator.share) { try { await navigator.share({ title: 'HTP Janagunaso', text }); } catch { /* cancelled */ } }
    else copy();
  };

  return (
    <div className="app">
      <header className="topbar"><Logo /></header>
      <section className="hero" style={{ alignItems: 'center', textAlign: 'center', gap: 10, paddingBottom: 30 }}>
        <span style={{ width: 60, height: 60, borderRadius: '50%', background: '#fff', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={30} /></span>
        <h1 style={{ fontSize: 28 }}>{t('done.title')}</h1>
        <p style={{ fontSize: 16 }}>{t('done.thanks')}</p>
      </section>
      <main className="page" style={{ paddingTop: 0, gap: 20 }}>
        <div className="card-raised" style={{ marginTop: -18, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="small muted">{t('done.ref')}</span>
          <span className="mono" style={{ fontSize: 26, fontWeight: 800, letterSpacing: 0.5 }}>{s.referenceCode}</span>
          <span className="muted" style={{ fontSize: 15 }}>{bsLong(s.submittedAt, lang)}</span>
        </div>

        <div className="panel-ink" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}><span style={{ color: '#FFB4B7' }}><Lock /></span>{t('done.keep')}</strong>
          <p style={{ margin: 0, fontSize: 14, color: '#E7E5E4' }}>{t('done.keepBody')}</p>
          <div className="mono" style={{ padding: '10px 12px', background: '#292524', borderRadius: 10, fontSize: 13, wordBreak: 'break-all' }}>{link}</div>
          <span className="tiny" style={{ color: '#D6D3D1' }}>{t('done.code')}: <span className="mono" style={{ color: '#fff' }}>{s.trackingToken}</span></span>
          <div className="grid-2">
            <button type="button" className="btn btn-primary" style={{ fontSize: 15, minHeight: 48 }} onClick={copy}>{copied ? t('done.copied') : t('done.copy')}</button>
            <button type="button" className="btn" style={{ fontSize: 15, minHeight: 48, background: 'transparent', border: '1.5px solid #57534E', color: '#fff' }} onClick={share}>{t('done.share')}</button>
          </div>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="section-title" style={{ fontSize: 17 }}>{t('done.next')}</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15, color: 'var(--text-2)' }}>
            {['next1', 'next2', 'next3'].map((k) => <li key={k} style={{ display: 'flex', gap: 10 }}><span className="dot" style={{ background: 'var(--red)', width: 6, height: 6, marginTop: 9 }} />{t(`done.${k}`)}</li>)}
          </ul>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
          <Link to={`/track/${s.referenceCode}/${s.trackingToken}`} className="btn btn-outline">{t('done.status')}</Link>
          <Link to="/" className="link-btn" style={{ textAlign: 'center', textDecoration: 'none' }}>{t('done.home')}</Link>
        </div>
      </main>
    </div>
  );
}
