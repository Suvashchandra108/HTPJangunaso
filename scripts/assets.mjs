// Writes the HTP logo and app icons into public/ before dev and build.
// They are kept as base64 text in brand-assets.json so the repository
// contains no binary files. To change the logo, replace the strings there.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const assets = JSON.parse(readFileSync(join(here, 'brand-assets.json'), 'utf8'));
const out = join(here, '..', 'public');
mkdirSync(out, { recursive: true });
for (const [name, b64] of Object.entries(assets)) writeFileSync(join(out, name), Buffer.from(b64, 'base64'));
console.log(`brand assets written: ${Object.keys(assets).join(', ')}`);
