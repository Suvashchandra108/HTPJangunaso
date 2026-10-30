import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MediaItem, MediaKind } from '../lib/types';
import { DEFAULT_LIMITS, compressPhoto, fmtDuration, fmtSize, getBlob, pickAudioMime, putBlob } from '../lib/media';
import { toNeDigits } from '../lib/bs';
import type { Lang } from '../lib/types';
import { Camera, File, Mic, Pause, Play, Plus, Stop, X } from './Icons';

/** Loads a stored file from IndexedDB and gives back an object URL. */
export function useMediaUrl(id?: string) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!id) return;
    let u: string | undefined; let alive = true;
    getBlob(id).then((b) => { if (b && alive) { u = URL.createObjectURL(b); setUrl(u); } });
    return () => { alive = false; if (u) URL.revokeObjectURL(u); };
  }, [id]);
  return url;
}

export function AudioPlayer({ item, tone = 'red' }: { item: MediaItem; tone?: 'red' | 'plain' }) {
  const { t } = useTranslation();
  const url = useMediaUrl(item.id);
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const dur = item.durationS ?? 0;
  const toggle = () => { const a = ref.current; if (!a) return; if (a.paused) a.play(); else a.pause(); };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button type="button" onClick={toggle} disabled={!url} aria-label={playing ? t('voice.pause') : t('voice.play')}
        style={{ flex: 'none', width: 46, height: 46, borderRadius: '50%', border: 0, background: tone === 'red' ? 'var(--red)' : 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        {playing ? <Pause /> : <Play />}
      </button>
      <div style={{ flex: 1, height: 6, background: 'rgba(28,25,23,0.12)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${dur ? Math.min(100, (pos / dur) * 100) : 0}%`, height: 6, background: 'var(--red)' }} />
      </div>
      <span className="small" style={{ fontWeight: 600, minWidth: 40, textAlign: 'right' }}>{fmtDuration(playing ? pos : dur)}</span>
      {url && <audio ref={ref} src={url} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setPos(0); }} onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)} />}
    </div>
  );
}

/** Records the citizen's voice in the browser: playback, discard and re-record before sending. */
export function VoiceRecorder({ value, onChange, maxSeconds = DEFAULT_LIMITS.maxAudioSeconds }: { value?: MediaItem; onChange: (m?: MediaItem) => void; maxSeconds?: number }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const [state, setState] = useState<'idle' | 'recording'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const rec = useRef<MediaRecorder>();
  const timer = useRef<number>();
  const started = useRef(0);
  const supported = typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => () => { window.clearInterval(timer.current); rec.current?.stream.getTracks().forEach((tr) => tr.stop()); }, []);

  async function start() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mime = pickAudioMime();
      const r = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        window.clearInterval(timer.current);
        const secs = Math.round((Date.now() - started.current) / 1000);
        const blob = new Blob(chunks, { type: r.mimeType || 'audio/webm' });
        const id = crypto.randomUUID();
        await putBlob(id, blob);
        onChange({ id, kind: 'voice_description', mime: blob.type, sizeBytes: blob.size, durationS: secs });
        setState('idle');
      };
      rec.current = r;
      started.current = Date.now();
      setElapsed(0);
      r.start(1000);
      setState('recording');
      timer.current = window.setInterval(() => {
        const s = Math.floor((Date.now() - started.current) / 1000);
        setElapsed(s);
        if (s >= maxSeconds) r.stop();
      }, 250);
    } catch {
      setError(t('voice.denied'));
    }
  }

  if (!supported) return <p className="hint">{t('voice.unsupported')}</p>;

  if (state === 'recording') {
    return (
      <div className="panel-red" style={{ display: 'flex', alignItems: 'center', gap: 12 }} role="status" aria-live="polite">
        <button type="button" onClick={() => rec.current?.stop()} aria-label={t('voice.stop')}
          style={{ flex: 'none', width: 52, height: 52, borderRadius: '50%', border: 0, background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Stop /></button>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, fontWeight: 700 }}>
          <span className="dot" style={{ background: 'var(--red)', width: 10, height: 10, animation: 'none' }} />{t('voice.recording')}
        </span>
        <span style={{ fontWeight: 700 }}>{fmtDuration(elapsed)} / {fmtDuration(maxSeconds)}</span>
      </div>
    );
  }

  if (value) {
    return (
      <div className="panel-red" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <AudioPlayer item={value} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="small muted">{t('voice.limit', { min: toNeDigits(maxSeconds / 60, lang) })} · {fmtSize(value.sizeBytes)}</span>
          <span>
            <button type="button" className="link-btn" onClick={() => onChange(undefined)}>{t('voice.delete')}</button>
            <button type="button" className="link-btn" onClick={start}>{t('voice.rerecord')}</button>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button type="button" onClick={start} className="btn btn-quiet btn-block" style={{ minHeight: 56, borderColor: 'var(--red)', color: 'var(--red-dark)', fontSize: 16 }}>
        <Mic />{t('voice.record')}
      </button>
      <span className="hint">{t('voice.limit', { min: toNeDigits(maxSeconds / 60, lang) })}</span>
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}

function Thumb({ item, onRemove }: { item: MediaItem; onRemove: () => void }) {
  const { t } = useTranslation();
  const url = useMediaUrl(item.id);
  return (
    <div className="thumb">
      {url && <img src={url} alt="" />}
      <button type="button" onClick={onRemove} aria-label={t('report.removeFile')}><X /></button>
    </div>
  );
}

export function PhotoPicker({ items, onChange, max = DEFAULT_LIMITS.maxPhotos }: { items: MediaItem[]; onChange: (m: MediaItem[]) => void; max?: number }) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function add(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    const next = [...items];
    for (const f of Array.from(files).slice(0, max - items.length)) {
      if (!f.type.startsWith('image/')) continue;
      const blob = await compressPhoto(f);
      const id = crypto.randomUUID();
      await putBlob(id, blob);
      next.push({ id, kind: 'photo', mime: blob.type, sizeBytes: blob.size, name: f.name });
    }
    onChange(next);
    setBusy(false);
    if (input.current) input.current.value = '';
  }
  return (
    <div className="thumbs">
      {items.map((m) => <Thumb key={m.id} item={m} onRemove={() => onChange(items.filter((x) => x.id !== m.id))} />)}
      {items.length < max && (
        <button type="button" className="thumb-add" onClick={() => input.current?.click()} aria-label={t('report.addPhoto')} disabled={busy}>
          {busy ? <span className="tiny">…</span> : <Plus />}
        </button>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => add(e.target.files)} />
      {busy && <span className="hint" role="status">{t('report.compressing')}</span>}
    </div>
  );
}

/** PDF documents or audio files (MP3/M4A/AAC). Size checked before storing. */
export function FileAttach({ kind, items, onChange }: { kind: Extract<MediaKind, 'document' | 'audio'>; items: MediaItem[]; onChange: (m: MediaItem[]) => void }) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const maxBytes = DEFAULT_LIMITS.maxDocMB * 1024 * 1024;
  const accept = kind === 'document' ? 'application/pdf' : 'audio/mpeg,audio/mp4,audio/aac,audio/x-m4a,.mp3,.m4a,.aac';
  async function add(files: FileList | null) {
    setError('');
    const f = files?.[0];
    if (!f) return;
    if (f.size > maxBytes) { setError(t('report.tooBig', { max: `${DEFAULT_LIMITS.maxDocMB} MB` })); return; }
    const id = crypto.randomUUID();
    await putBlob(id, f);
    let durationS: number | undefined;
    if (kind === 'audio') durationS = await new Promise<number>((res) => { const a = new Audio(URL.createObjectURL(f)); a.onloadedmetadata = () => res(Math.round(a.duration)); a.onerror = () => res(0); });
    onChange([...items, { id, kind, mime: f.type, sizeBytes: f.size, name: f.name, durationS }]);
    if (input.current) input.current.value = '';
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((m) => (
        <div key={m.id} className="row-link" style={{ cursor: 'default' }}>
          <span className="icon-tile white"><File /></span>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
          <span className="tiny muted">{fmtSize(m.sizeBytes)}</span>
          <button type="button" className="icon-btn" aria-label={t('report.removeFile')} onClick={() => onChange(items.filter((x) => x.id !== m.id))}><X /></button>
        </div>
      ))}
      <button type="button" className="btn btn-quiet" onClick={() => input.current?.click()}>
        {kind === 'document' ? <File /> : <Camera />}{kind === 'document' ? t('report.addDocument') : t('report.addAudio')}
      </button>
      <input ref={input} type="file" accept={accept} hidden onChange={(e) => add(e.target.files)} />
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}

export function MediaThumb({ item }: { item: MediaItem }) {
  const url = useMediaUrl(item.id);
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ display: 'block', width: 150, height: 104, borderRadius: 10, overflow: 'hidden', background: 'var(--line-strong)' }}>
      {url && <img src={url} alt="Citizen photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
    </a>
  );
}

export function DocLink({ item }: { item: MediaItem }) {
  const url = useMediaUrl(item.id);
  return <a href={url} download={item.name} className="sbtn" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', textDecoration: 'none' }}><File size={16} />{item.name} · {fmtSize(item.sizeBytes)}</a>;
}
