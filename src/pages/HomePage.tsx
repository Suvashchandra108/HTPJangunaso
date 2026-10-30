import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BottomNav, TopBar } from '../components/Layout';
import { ArrowRight, CategoryIcon, List, Mic, Search } from '../components/Icons';
import { CATEGORIES, type Lang } from '../lib/types';
import { toNeDigits } from '../lib/bs';

export default function HomePage() {
  const { t, i18n } = useTranslation();
  return (
    <div className="app">
      <TopBar />
      <section className="hero">
        <span className="eyebrow">{t('home.eyebrow')}</span>
        <h1>{t('home.title')}</h1>
        <p>{t('home.lead')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
          <Link to="/report" className="hero-cta">
            <span><strong>{t('home.quick')}</strong><span className="sub">{t('home.quickSub')}</span></span>
            <span className="round-arrow"><ArrowRight /></span>
          </Link>
          <Link to="/report?voice=1" className="hero-ghost">
            <Mic />{t('home.voice')}<span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 400, color: 'var(--red-soft)' }}>{t('home.voiceSub')}</span>
          </Link>
        </div>
      </section>

      <main className="page" style={{ gap: 26 }}>
        <p className="tiny" role="note" style={{ margin: 0, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 10, color: 'var(--text-2)' }}>{t('home.demo')}</p>

        <div className="grid-2">
          <Link to="/track" className="row-link" style={{ fontWeight: 700 }}><span style={{ color: 'var(--red)' }}><Search /></span>{t('home.track')}</Link>
          <Link to="/explore" className="row-link" style={{ fontWeight: 700 }}><span style={{ color: 'var(--red)' }}><List /></span>{t('home.explore')}</Link>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h2 className="section-title">{t('home.chooseTopic')}</h2>
            <Link to="/report?mode=detailed" style={{ fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>{t('home.detailed')} →</Link>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <Link key={c} to={`/report?cat=${c}`}><span className="icon-tile"><CategoryIcon cat={c} /></span>{t(`cat.${c}`)}</Link>
            ))}
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="section-title">{t('home.how')}</h2>
          <ol className="steps">
            {[1, 2, 3].map((n) => (
              <li key={n}><span className="num">{toNeDigits(n, i18n.language as Lang)}</span><span><strong>{t(`home.step${n}b`)}</strong> — {t(`home.step${n}`)}</span></li>
            ))}
          </ol>
        </section>

        <p className="notice">{t('home.notice')} <Link to="/privacy" style={{ fontWeight: 600 }}>{t('home.privacy')}</Link></p>
        <Link to="/staff" className="tiny" style={{ textAlign: 'center', color: 'var(--muted)' }}>{t('home.staff')}</Link>
      </main>
      <BottomNav />
    </div>
  );
}
