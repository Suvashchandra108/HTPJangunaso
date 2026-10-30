import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomNav, TopBar } from '../components/Layout';
import { ReportsMap, type MapItem } from '../components/MapView';
import { listPublic } from '../lib/api';
import { bsShort, toNeDigits } from '../lib/bs';
import { DISTRICTS, findDistrict, findLocalLevel, placeName } from '../lib/geo';
import { CATEGORIES, type Lang } from '../lib/types';

const STATUS_DOT: Record<string, string> = { received: '#A8A29E', under_review: 'var(--amber-dot)', closed: 'var(--muted)' };

export default function ExplorePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const [q, setQ] = useState('');
  const [district, setDistrict] = useState('');
  const [cat, setCat] = useState('');
  const [view, setView] = useState<'list' | 'map'>('list');
  const all = useMemo(() => listPublic(), []);
  const usedDistricts = useMemo(() => DISTRICTS.filter((d) => all.some((r) => r.location.districtId === d.id)), [all]);

  const items = all.filter((r) =>
    (!district || r.location.districtId === district) && (!cat || r.category === cat) &&
    (!q.trim() || `${r.title} ${r.summary} ${placeName(findLocalLevel(r.location.localLevel), lang)}`.toLowerCase().includes(q.trim().toLowerCase())));

  const area = (r: (typeof all)[number]) => {
    const ll = findLocalLevel(r.location.localLevel);
    return ll ? placeName(ll, lang).replace(/ (नगरपालिका|उपमहानगरपालिका|महानगरपालिका)$| (Municipality|Sub-Metropolitan City|Metropolitan City)$/, '') : placeName(findDistrict(r.location.districtId), lang);
  };

  const mapItems: MapItem[] = items.flatMap((r) => {
    const ll = findLocalLevel(r.location.localLevel);
    return ll ? [{ id: r.id, lat: ll.lat, lng: ll.lng, title: r.title, sub: `${t(`cat.${r.category}`)} · ${area(r)}` }] : [];
  });

  return (
    <div className="app">
      <TopBar right={all.some((r) => r.sample) ? <span className="badge">{t('explore.sample')}</span> : undefined} />
      <div style={{ padding: '4px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, borderBottom: '3px solid var(--red)', paddingBottom: 6, width: 'fit-content' }}>{t('explore.title')}</h1>
        <label htmlFor="q" className="sr-only">{t('explore.search')}</label>
        <input id="q" type="search" className="input" style={{ border: 0, background: 'var(--surface-2)' }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('explore.search')} />
        <div className="grid-2">
          <label className="sr-only" htmlFor="f-d">{t('location.district')}</label>
          <select id="f-d" className="select" value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">{t('explore.allDistricts')}</option>
            {usedDistricts.map((d) => <option key={d.id} value={d.id}>{placeName(d, lang)}</option>)}
          </select>
          <label className="sr-only" htmlFor="f-c">{t('report.topic')}</label>
          <select id="f-c" className="select" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">{t('explore.allTopics')}</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(`cat.${c}`)}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="small muted">{t('explore.count', { n: toNeDigits(items.length, lang) })}</span>
          <div className="tabs" role="tablist" style={{ padding: 3 }}>
            <button role="tab" aria-selected={view === 'list'} onClick={() => setView('list')} style={{ minHeight: 36, padding: '6px 14px' }}>{t('explore.list')}</button>
            <button role="tab" aria-selected={view === 'map'} onClick={() => setView('map')} style={{ minHeight: 36, padding: '6px 14px' }}>{t('explore.map')}</button>
          </div>
        </div>
      </div>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '4px 16px 16px' }}>
        {view === 'map' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10 }}>
            <ReportsMap items={mapItems} />
            <p className="hint" style={{ margin: 0 }}>{t('explore.mapNote')}</p>
          </div>
        ) : items.length === 0 ? (
          <p className="notice" style={{ marginTop: 12 }}>{t('explore.empty')}</p>
        ) : items.map((r) => (
          <article key={r.id} className="article">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <span style={{ color: 'var(--red)', fontWeight: 800 }}>{t(`cat.${r.category}`)}</span>
              <span style={{ color: '#A8A29E' }}>•</span>
              <span className="muted">{area(r)}{r.approvedAt ? ` · ${bsShort(r.approvedAt, lang)}` : ''}</span>
            </div>
            <h2 lang="ne">{r.title}</h2>
            <p lang="ne">{r.summary}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
              {r.storyUrl ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green)', fontWeight: 700 }}><span className="dot" style={{ background: 'var(--green)', width: 7, height: 7 }} />{t('explore.published')}</span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text-2)' }}><span className="dot" style={{ background: STATUS_DOT[r.status], width: 7, height: 7 }} />{t(`track.${r.status}`)}</span>
              )}
              {r.storyUrl && <a href={r.storyUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 700, textDecoration: 'none' }}>{t('explore.readStory')}</a>}
            </div>
          </article>
        ))}
        <a href="mailto:?subject=HTP%20Janagunaso%20correction" className="small" style={{ fontWeight: 600, padding: '14px 0', textDecoration: 'none' }}>{t('explore.correction')}</a>
      </main>
      <BottomNav />
    </div>
  );
}
