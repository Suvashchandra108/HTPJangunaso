import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Red pin drawn as SVG: avoids Leaflet's default image icons (which break in bundles) and matches the brand.
const pinSvg = (color = '#E4010B') =>
  `<svg width="36" height="46" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg"><path d="M20 50S4 32 4 19a16 16 0 0 1 32 0c0 13-16 31-16 31z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="20" cy="19" r="6" fill="#fff"/></svg>`;
export const redPin = L.divIcon({ html: pinSvg(), className: '', iconSize: [36, 46], iconAnchor: [18, 44], popupAnchor: [0, -40] });
export const dotPin = L.divIcon({ html: '<span style="display:block;width:18px;height:18px;border-radius:50%;background:#E4010B;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>', className: '', iconSize: [18, 18], iconAnchor: [9, 9] });

export const NEPAL_CENTER: [number, number] = [28.2, 84.1];

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ at, zoom }: { at?: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => { if (at) map.setView(at, Math.max(map.getZoom(), zoom)); }, [at?.[0], at?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const tiles = { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors' };

/** Pick a point: tap the map or drag the pin. */
export function PickMap({ point, onPick, tall }: { point?: [number, number]; onPick: (lat: number, lng: number) => void; tall?: boolean }) {
  return (
    <div className={`map-box${tall ? ' tall' : ''}`}>
      <MapContainer center={point ?? NEPAL_CENTER} zoom={point ? 15 : 7} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer {...tiles} />
        <ClickToPlace onPick={onPick} />
        <Recenter at={point} zoom={15} />
        {point && (
          <Marker position={point} icon={redPin} draggable eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onPick(ll.lat, ll.lng); } }} />
        )}
      </MapContainer>
    </div>
  );
}

export interface MapItem { id: string; lat: number; lng: number; title: string; sub: string; href?: string }

/** Public map of approved reports (area centres only). */
export function ReportsMap({ items }: { items: MapItem[] }) {
  const center: [number, number] = items.length ? [items[0].lat, items[0].lng] : NEPAL_CENTER;
  return (
    <div className="map-box tall">
      <MapContainer center={center} zoom={items.length ? 9 : 7} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer {...tiles} />
        {items.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={dotPin}>
            <Popup><strong style={{ fontFamily: 'var(--font)', fontSize: 15 }}>{m.title}</strong><br /><span style={{ color: '#57534E' }}>{m.sub}</span></Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
