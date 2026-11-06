import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BottomNav, TopBar } from '../components/Layout';
import { ArrowRight, CategoryIcon, List, Mic, Search } from '../components/Icons';
import { Bi, SpeakButton, WhatsAppHtp } from '../components/Help';
import { CATEGORIES, type Lang } from '../lib/types';
import { toNeDigits } from '../lib/bs';
import { telLink } from '../lib/contact';
import { listMine } from '../lib/myReports';

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const mine = listMine().length;
  return (
    <div className="app">
      <TopBar />
      <section className="hero">
        <div className="label-row"><span className="eyebrow">{t('home.eyebrow')}</span><SpeakButton clip="home" /></div>
        <h1>{t('home.title')}</h1>
        <p>{t('home.lead')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
          <Link to="/report" className="hero-cta">
            <span><strong><Bi k="home.quick" /></strong><span className="sub">{t('home.quickSub')}</span></span>
            <span className="round-arrow"><ArrowRight /></span>
          </Link>
          <Link to="/report?voice=1" className="hero-ghost">
            <Mic /><Bi k="home.voice" /><span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 400, color: 'var(--red-soft)' }}>{t('home.voiceSub')}</span>
          </Link>
        </div>
      </section>

      <main className="page" style={{ gap: 22 }}>
        <a href={telLink('100')} className="sos-strip">
          <span className="sos-num">100</span>
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
            <strong style={{ fontSize: 16 }}>{t('home.emergencyQ')}</strong>
            <span className="small" style={{ color: '#D6D3D1' }}>{t('home.emergencyA')}</span>
          </span>
        </a>

        <WhatsAppHtp text={t('wa.header')} />

        <div className="grid-2">
          <Link to="/track" className="row-link" style={{ fontWeight: 700 }}>
            <span style={{ color: 'var(--red)' }}><Search /></span>
            <span style={{ display: 'flex', flexDirection: 'column' }}><Bi k="home.track" />{mine > 0 && <span className="tiny muted" style={{ fontWeight: 400 }}>{toNeDigits(mine, lang)}</span>}</span>
          </Link>
          <Link to="/explore" className="row-link" style={{ fontWeight: 700 }}><span style={{ color: 'var(--red)' }}><List /></span><Bi k="home.explore" /></Link>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h2 className="section-title"><Bi k="home.chooseTopic" inline /></h2>
            <Link to="/report?mode=detailed" style={{ fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>{t('home.detailed')} →</Link>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <Link key={c} to={`/report?cat=${c}`}><span className="icon-tile"><CategoryIcon cat={c} /></span><Bi k={`cat.${c}`} /></Link>
            ))}
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="section-title">{t('home.how')}</h2>
          <ol className="steps">
            {[1, 2, 3].map((n) => (
              <li key={n}><span className="num">{toNeDigits(n, lang)}</span><span><strong>{t(`home.step${n}b`)}</strong> — {t(`home.step${n}`)}</span></li>
            ))}
          </ol>
        </section>

        <p className="notice">{t('home.notice')} <Link to="/privacy" style={{ fontWeight: 600 }}>{t('home.privacy')}</Link></p>
        <p className="tiny" role="note" style={{ margin: 0, textAlign: 'center', color: 'var(--muted)' }}>{t('home.demo')}</p>
        <Link to="/staff" className="tiny" style={{ textAlign: 'center', color: 'var(--muted)' }}>{t('home.staff')}</Link>
      </main>
      <BottomNav />
    </div>
  );
}
