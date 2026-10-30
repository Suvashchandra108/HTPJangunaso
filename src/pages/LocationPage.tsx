import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHead } from '../components/Layout';
import { Check, Gps, Pin } from '../components/Icons';
import { PickMap } from '../components/MapView';
import { useDraft } from '../lib/draft';
import { PROVINCES, districtsOf, findDistrict, findLocalLevel, findProvince, localLevelsOf, placeName, resolveLocation } from '../lib/geo';
import { toNeDigits } from '../lib/bs';
import type { Lang, LocationMethod, ReportLocation } from '../lib/types';

type Tab = 'gps' | 'map' | 'manual';

export default function LocationPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const nav = useNavigate();
  const { draft, update } = useDraft();
  const [loc, setLoc] = useState<ReportLocation>(draft.location.method === 'none' ? { method: 'none' } : draft.location);
  const [tab, setTab] = useState<Tab>(draft.location.method === 'manual' ? 'manual' : draft.location.method === 'map' ? 'map' : 'gps');
  const [gpsState, setGpsState] = useState<'idle' | 'busy' | 'denied' | 'error'>('idle');
  const [q, setQ] = useState('');
  const [searchMsg, setSearchMsg] = useState('');
  const [outside, setOutside] = useState(false);

  const point = loc.lat != null && loc.lng != null ? ([loc.lat, loc.lng] as [number, number]) : undefined;

  function placeAt(lat: number, lng: number, method: LocationMethod, accuracyM?: number) {
    const ll = resolveLocation(lat, lng);
    setOutside(!ll);
    setLoc((prev) => ({
      ...prev, method, lat, lng, accuracyM, capturedAt: new Date().toISOString(),
      ...(ll ? { provinceId: findDistrict(ll.district)?.province, districtId: ll.district, localLevel: ll.id } : {}),
    }));
  }

  function useGps() {
    if (!navigator.geolocation) { setGpsState('error'); return; }
    setGpsState('busy');
    navigator.geolocation.getCurrentPosition(
      (p) => { setGpsState('idle'); placeAt(p.coords.latitude, p.coords.longitude, 'gps', Math.round(p.coords.accuracy)); },
      (e) => setGpsState(e.code === e.PERMISSION_DENIED ? 'denied' : 'error'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setSearchMsg('…');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=np&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
      const [hit] = (await res.json()) as { lat: string; lon: string }[];
      if (!hit) { setSearchMsg(t('location.noResult')); return; }
      setSearchMsg('');
      placeAt(Number(hit.lat), Number(hit.lon), 'map');
    } catch { setSearchMsg(t('location.noResult')); }
  }

  const districts = useMemo(() => districtsOf(loc.provinceId), [loc.provinceId]);
  const levels = useMemo(() => localLevelsOf(loc.districtId), [loc.districtId]);
  const ll = findLocalLevel(loc.localLevel);
  const summary = ll ? placeName(ll, lang) : loc.localLevel;
  const hasPlace = !!(loc.districtId || point);

  function confirm() {
    update({ location: { ...loc, method: loc.method === 'none' && loc.districtId ? 'manual' : loc.method } });
    nav(-1);
  }

  return (
    <div className="app">
      <PageHead title={t('location.title')} />
      <main className="page" style={{ gap: 18 }}>
        <div className="tabs" role="tablist">
          {(['gps', 'map', 'manual'] as Tab[]).map((k) => (
            <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)}>{t(`location.${k}`)}</button>
          ))}
        </div>

        {tab === 'gps' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button type="button" className="btn btn-primary btn-block" onClick={useGps} disabled={gpsState === 'busy'}>
              <Gps />{gpsState === 'busy' ? t('location.locating') : t('location.useMine')}
            </button>
            {gpsState === 'denied' && <p className="error" role="alert">{t('location.denied')}</p>}
            {gpsState === 'error' && <p className="error" role="alert">{t('location.unavailable')}</p>}
            {point && loc.method === 'gps' && <PickMap point={point} onPick={(a, b) => placeAt(a, b, 'map')} />}
          </div>
        )}

        {tab === 'map' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <form onSubmit={search} style={{ display: 'flex', gap: 8 }}>
              <label htmlFor="loc-q" className="sr-only">{t('location.search')}</label>
              <input id="loc-q" className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('location.search')} />
              <button type="submit" className="btn btn-quiet" style={{ flex: 'none' }}>{t('location.searchBtn')}</button>
            </form>
            {searchMsg && <span className="hint" role="status">{searchMsg}</span>}
            <PickMap point={point} onPick={(a, b) => placeAt(a, b, 'map')} />
            <p className="hint" style={{ margin: 0 }}>{t('location.drag')}</p>
          </div>
        )}

        {(tab === 'manual' || hasPlace) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {point && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, border: '1.5px solid var(--ink)', borderRadius: 14 }}>
                <span className="icon-tile"><Pin /></span>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: 17 }}>{summary || t('location.found')}</strong>
                  <span className="small muted">
                    {[placeName(findDistrict(loc.districtId), lang), placeName(findProvince(loc.provinceId), lang)].filter(Boolean).join(' · ')}
                    {loc.accuracyM ? ` · GPS ${t('location.accuracy', { m: toNeDigits(loc.accuracyM, lang) })}` : ''}
                  </span>
                </span>
              </div>
            )}
            {outside && <p className="hint" style={{ margin: 0 }}>{t('location.outside')}</p>}

            <div className="grid-2">
              <label className="field small" style={{ fontWeight: 700 }}>{t('location.province')}
                <select className="select" value={loc.provinceId ?? ''} onChange={(e) => setLoc({ ...loc, method: point ? loc.method : 'manual', provinceId: e.target.value || undefined, districtId: undefined, localLevel: undefined })}>
                  <option value="">{t('location.choose')}</option>
                  {PROVINCES.map((p) => <option key={p.id} value={p.id}>{placeName(p, lang)}</option>)}
                </select>
              </label>
              <label className="field small" style={{ fontWeight: 700 }}>{t('location.district')}
                <select className="select" value={loc.districtId ?? ''} disabled={!loc.provinceId} onChange={(e) => setLoc({ ...loc, method: point ? loc.method : 'manual', districtId: e.target.value || undefined, localLevel: undefined })}>
                  <option value="">{t('location.choose')}</option>
                  {districts.map((d) => <option key={d.id} value={d.id}>{placeName(d, lang)}</option>)}
                </select>
              </label>
            </div>

            {loc.districtId && (
              levels.length ? (
                <label className="field small" style={{ fontWeight: 700 }}>{t('location.localLevel')}
                  <select className="select" value={loc.localLevel ?? ''} onChange={(e) => setLoc({ ...loc, localLevel: e.target.value || undefined })}>
                    <option value="">{t('location.choose')}</option>
                    {levels.map((l) => <option key={l.id} value={l.id}>{placeName(l, lang)}</option>)}
                  </select>
                </label>
              ) : (
                <label className="field small" style={{ fontWeight: 700 }}>{t('location.localLevel')}
                  <input className="input" value={loc.localLevel ?? ''} placeholder={t('location.localLevelPh')} onChange={(e) => setLoc({ ...loc, localLevel: e.target.value })} />
                </label>
              )
            )}

            <div className="grid-2">
              <label className="field small" style={{ fontWeight: 700 }}>{t('location.ward')}
                <select className="select" value={loc.ward ?? ''} onChange={(e) => setLoc({ ...loc, ward: e.target.value ? Number(e.target.value) : undefined })}>
                  <option value="">{t('location.choose')}</option>
                  {Array.from({ length: 35 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{toNeDigits(n, lang)}</option>)}
                </select>
              </label>
              <label className="field small" style={{ fontWeight: 700 }}>{t('location.locality')}
                <input className="input" value={loc.locality ?? ''} onChange={(e) => setLoc({ ...loc, locality: e.target.value })} />
              </label>
            </div>
            {point && <p className="hint" style={{ margin: 0 }}>{t('location.wardHint')}</p>}
          </div>
        )}

        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: 'var(--text-2)' }}>
          <li style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--green)' }}><Check /></span>{t('location.ok1')}</li>
          <li style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--green)' }}><Check /></span>{t('location.ok2')}</li>
        </ul>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
          <button type="button" className="btn btn-primary btn-block" onClick={confirm} disabled={!hasPlace}>{t('location.confirm')}</button>
          <button type="button" className="link-btn" onClick={() => { update({ location: { method: 'none' } }); nav(-1); }}>{t('location.skip')}</button>
        </div>
      </main>
    </div>
  );
}
