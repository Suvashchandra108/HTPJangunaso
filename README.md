# HTP Janagunaso — citizen reporting for HTP Khabar

A mobile-first web app (PWA) where anyone in Nepal can report a public-interest
issue to HTP Khabar in Nepali, English or Maithili, and where the newsroom
screens, verifies, assigns and publishes those reports.

**Status: Phase 3 demo.** All screens work, but data is stored only in the
browser that uses it (sample data included). Phase 4 connects the Supabase
backend so reports reach the newsroom from any phone.

## Try it

| What | Where |
| --- | --- |
| Citizen side | `/#/` — report, track, explore |
| Newsroom | `/#/staff` |

Demo staff accounts (password `demo1234` for all):

| Login ID | Role | Can do |
| --- | --- | --- |
| `admin.head` | Admin Head | Everything: assign, publish, view citizen contacts, create Admins |
| `admin` | Admin | Run the queue, draft public summaries, create Reporters and Viewers |
| `ram.reporter` | Reporter | Only reports assigned to them |

"Reset demo data" on the sign-in page restores the sample data.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## Publish on GitHub Pages

1. Create a **public** repository on your GitHub account (free Pages needs a public repo) and push this folder to its `main` branch.
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` builds and deploys automatically (`.github/workflows/deploy.yml`).
   The site appears at `https://<your-username>.github.io/<repo-name>/`.

No secrets are in this repository. In Phase 4 only the Supabase project URL and
its public "anon" key are added; both are safe to publish because row-level
security in the database decides what anyone can read or write.

## What works in this demo

- Quick and detailed reports; category tiles pre-select the topic
- Voice recording in the browser (up to 2 min) with playback, delete and re-record
- Photos compressed on the phone to ~500 KB, with GPS/EXIF metadata removed before upload
- PDF and audio-file attachments with size limits
- Location by GPS, map pin (tap or drag) or manual Province → District → Local level → Ward;
  denying GPS never blocks a report; GPS vs manual is recorded
- Nepali (default), English and Maithili; switching language never loses typed text;
  the draft also survives reloads
- Anonymous or identified reporting; video-evidence "contact me" option
- Reference numbers in the Bikram Sambat year (`HTP-2083-000125`) plus a one-time private tracking link
- Tracking shows only Received / Under review / Closed, plus newsroom questions the citizen can answer
- Public archive and map of approved reports only, area-level location only
- Newsroom: inbox with counts, full workflow states, assignment to one or more reporters
  (Admin Head only), notes and contact log, information requests, duplicates,
  public summary drafting and Admin Head approval, logged contact view, audit history
- Staff accounts: created by Admin Head / Admin, temporary password changed at first sign-in, reset, deactivate
- Installable PWA with an offline app shell

## Code map

```
src/
  lib/api.ts        Demo backend — same functions and role rules as the Phase 2 API spec.
                    Phase 4 replaces this file's internals with Supabase calls.
  lib/types.ts      Types mirroring the database schema
  lib/geo.ts        Nepal provinces (7), districts (77), sample local levels
  lib/bs.ts         All Bikram Sambat date handling
  lib/media.ts      Photo compression, audio format choice, on-device file store
  lib/draft.tsx     Report draft state (persists across language switch and reload)
  locales/          ne.json, en.json, mai.json
  pages/            Citizen screens; pages/staff/ newsroom screens
  styles.css        HTP red design system (#E4010B from the logo)
scripts/assets.mjs  Writes the logo and app icons (kept as text in brand-assets.json) into public/ before each build
tests/e2e.py        23 end-to-end checks (Playwright)
```

## Known limitations to resolve

1. **Calendar date:** the date library gives Kartik 13 for 30 Oct 2026; htpkhabar.com shows Kartik 14.
   Check against the official calendar; any fix goes in `src/lib/bs.ts` only.
2. **Local levels:** only sample local levels for Siraha, Saptari, Dhanusha and Kathmandu are listed
   (other districts accept a typed name). The full official list of 753 loads in Phase 4.
3. **Maithili:** draft translation; needs review by a native speaker. Missing strings show in Nepali.
4. **Place search** uses OpenStreetMap's free Nominatim service, fine for a demo but rate-limited;
   choose a production geocoder or self-host before launch.
5. **Demo storage:** reports stay in the browser that created them; staff in another browser won't see them until Phase 4.
6. **Privacy policy** text is a draft for legal review.
