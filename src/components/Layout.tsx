import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';
import type { Lang } from '../lib/types';
import { Back, Home, List, Plus, Search } from './Icons';

const logoSrc = `${import.meta.env.BASE_URL}htp-logo.png`;

export function Logo({ height = 34 }: { height?: number }) {
  const { t } = useTranslation();
  return <img src={logoSrc} alt={t('app.logoAlt')} className="logo" style={{ height }} />;
}

export function LangSwitch() {
  const { t, i18n } = useTranslation();
  const langs: [Lang, string][] = [['ne', 'नेपाली'], ['en', 'EN'], ['mai', 'मैथिली']];
  return (
    <div className="lang" role="group" aria-label={t('nav.language')}>
      {langs.map(([l, label]) => (
        <button key={l} type="button" aria-pressed={i18n.language === l} onClick={() => setLanguage(l)} lang={l}>{label}</button>
      ))}
    </div>
  );
}

export function TopBar({ right, lined }: { right?: ReactNode; lined?: boolean }) {
  return (
    <header className={`topbar${lined ? ' lined' : ''}`}>
      <Link to="/" aria-label="HTP"><Logo /></Link>
      {right ?? <LangSwitch />}
    </header>
  );
}

export function PageHead({ title, back = -1, right }: { title: string; back?: string | number; right?: ReactNode }) {
  const nav = useNavigate();
  const { t } = useTranslation();
  return (
    <header className="page-head">
      <button type="button" className="icon-btn" aria-label={t('nav.back')} onClick={() => (typeof back === 'number' ? nav(back) : nav(back))}><Back /></button>
      <h1>{title}</h1>
      {right}
    </header>
  );
}

export function BottomNav() {
  const { t } = useTranslation();
  const items: [string, string, ReactNode][] = [
    ['/', t('nav.home'), <Home key="h" />],
    ['/report', t('nav.report'), <Plus key="p" size={20} />],
    ['/explore', t('nav.explore'), <List key="l" />],
    ['/track', t('nav.track'), <Search key="s" />],
  ];
  return (
    <nav className="bottom-nav" aria-label={t('nav.home')}>
      {items.map(([to, label, icon]) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>{icon}{label}</NavLink>
      ))}
    </nav>
  );
}

export function Toast({ text }: { text: string }) {
  return <div className="toast" role="status">{text}</div>;
}
