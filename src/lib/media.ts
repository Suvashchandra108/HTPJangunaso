// Client-side media handling: photo compression (which also strips EXIF,
// including GPS) and a tiny IndexedDB store for demo files.

export interface Limits { maxPhotos: number; photoTargetKB: number; maxAudioSeconds: number; maxDocMB: number }
export const DEFAULT_LIMITS: Limits = { maxPhotos: 5, photoTargetKB: 500, maxAudioSeconds: 120, maxDocMB: 5 };

const MAX_SIDE = 1600;

/**
 * Resize to at most 1600 px on the long side and re-encode (WebP where the
 * browser supports it, else JPEG), stepping quality down until under target.
 * Drawing to a canvas drops all EXIF metadata, so phone GPS tags never leave the device.
 */
export async function compressPhoto(file: File, targetKB = DEFAULT_LIMITS.photoTargetKB): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const webp = await toBlob(canvas, 'image/webp', 0.8);
  const type = webp && webp.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  let q = 0.82; let blob = (type === 'image/webp' ? webp : await toBlob(canvas, type, q))!;
  while (blob.size > targetKB * 1024 && q > 0.4) {
    q -= 0.1;
    blob = (await toBlob(canvas, type, q))!;
  }
  return blob;
}

function toBlob(c: HTMLCanvasElement, type: string, q: number): Promise<Blob | null> {
  return new Promise((r) => c.toBlob(r, type, q));
}

export const blobToDataUrl = (b: Blob) =>
  new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = rej; fr.readAsDataURL(b); });

export function pickAudioMime(): string {
  const options = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
  for (const m of options) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m;
  return '';
}

export const fmtSize = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
export const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ── IndexedDB blob store (demo only; Phase 4 uses Supabase Storage) ──
const DB = 'htp-janagunaso-media';
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function putBlob(id: string, blob: Blob) {
  const db = await open();
  await new Promise<void>((res, rej) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').put(blob, id); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}
export async function getBlob(id: string): Promise<Blob | undefined> {
  const db = await open();
  return new Promise((res, rej) => { const r = db.transaction('files').objectStore('files').get(id); r.onsuccess = () => res(r.result as Blob | undefined); r.onerror = () => rej(r.error); });
}
