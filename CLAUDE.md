# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — dev server on **port 3033** (not 3000, despite what layout metadata/README say)
- `npm run build` — Next.js build; `postbuild` auto-runs `scripts/copy-static.js` to assemble the standalone bundle
- `npm run lint` — ESLint (`next/core-web-vitals`)
- `npm run start:prod` — run the built standalone server (`cd .next/standalone && node server.js`) on port 3033
- No test framework is configured.
- Formatting: Prettier (`.prettierrc`).

## Architecture

Next.js 14 App Router + React 18 + TypeScript + Tailwind CSS v4. Path alias `@/*` → repo root.

Two independent utility domains, switched via the top `Navbar`:
- **DPDC** (electricity) at `/` — the main app
- **WASA** (water) at `/wasa` — a much simpler amount-logging page

### Persistence — flat JSON files via server actions (NOT localStorage)

README.md and AGENT.md both say sessions live in browser `localStorage`. **This is stale.** Persistence is server-side: `app/actions.ts` (`'use server'`) reads/writes JSON files with `fs`. Client components (`session-manager.tsx`, `water-session-manager.tsx`) call these actions and hold the data in React state.

`getDbPath()` in `app/actions.ts` decides the file location:
- **development**: `db.json` / `water-db.json` in `process.cwd()` (repo root)
- **production**: `/var/www/meter-ops/db.json` / `water-db.json`

This prod path is duplicated as `prodDb` in `scripts/copy-static.js` — **keep the two in sync** if it changes. There is no real database; the entire state is these two JSON arrays.

### Billing logic (the non-obvious core) — `lib/consumption.ts`

Keep billing math out of components (per AGENT.md). `buildConsumptionComparison(a, b)` diffs two sessions and produces per-owner rows. Two distinct meter types with **different tariffs**:

- **Normal meters**: energy charge via `calculateSlabEnergyCharge` — if consumption ≤ `LIFELINE_LIMIT` (50) the whole amount bills at `LIFELINE_RATE`; otherwise progressive `TARIFF_SLABS` bands. Then `+ 378` demand charge, then `+5%` VAT.
- **Mother meter** (`isMotherMeter: true`, e.g. owner `MM`): billed on **net** consumption = its raw reading diff **minus the summed consumption of all normal meters**. Computed in a second pass after normal rows exist. Uses flat `12.5`/unit `+ 1440` demand `+5%` VAT. (`calculateCost` + `TARIFF_CHART` implement the mother-meter slab variant.)

`TARIFF_SLABS` was recently changed; the previous rates are kept commented ("old slab") in the file for reference.

### OCR — `lib/meter-ops.ts`

`tesseract.js` runs OCR in the browser; readings are always editable before commit. `extractReadingCandidate` cleans OCR noise (`cleanOcrText` swaps commonly-misread glyphs like `O→0`, `I→1`) and scores digit candidates (explicit-decimal > spaced > plain integer), returning the highest-scoring value. `OCR_REGION` is the normalized crop box for the meter display.

### Layout

- `app/` — routes: `/` (SessionManager), `/consumption` (compares two sessions via `firstSessionId`/`secondSessionId` search params), `/sessions/[sessionId]`, `/wasa`
- `components/` — page-level client components; `components/ui/` holds primitives (prefer these over raw Tailwind for shared elements)
- `lib/` — `meter-ops.ts` (types, OCR, formatting), `consumption.ts` (billing), `water-ops.ts`, `fonts.ts`, `utils.ts`

## Mobile (`mobile/`)

Offline Android app (Expo SDK 58, Expo Router, Android only). Separate `mobile/package.json` — the root is React 18, Expo needs 19, so there are no npm workspaces. `npm install` runs with `legacy-peer-deps` (set in `mobile/.npmrc`).

- Commands (from `mobile/`): `npx expo run:android` (dev build), `npm run typecheck`, `npm run lint`, `npx expo-doctor`, `npx eas-cli build -p android --profile preview` (APK for sideloading).
- **Shared logic:** mobile imports the repo-root `lib/` (billing, formatting, water bill) as `@lib/*`, via `watchFolders` in `mobile/metro.config.js` and a `paths` alias in `mobile/tsconfig.json`. Files in `lib/` must stay free of Next/alias imports (use relative imports) and of globals Hermes lacks (e.g. `crypto.randomUUID` — pass an id factory in instead).
- **Persistence:** AsyncStorage, one key per web JSON file (`meterops:sessions`, `meterops:waterSessions`, `meterops:lastUsage`, `meterops:waterLastUsage`), same shapes as the web files. See `mobile/src/storage.ts`. No server calls.
- **Backup:** header menu → Export writes `meter-ops-backup-YYYY-MM-DD.json` (`{ app: 'meter-ops', version: 1, exportedAt, sessions, waterSessions, lastUsage, waterLastUsage }`) and opens the share sheet. Import accepts that format or a bare web `db.json` / `water-db.json`, validates it, asks for confirmation, then replaces the data (a bare file replaces only its own dataset). Invalid files raise an error alert and change nothing. See `mobile/src/backup.ts`.
- UI conventions: `.agents/react-native/SKILL.md` (read its `packages/app` as `mobile/`).

## Deployment

`next.config.mjs` uses `output: 'standalone'`. Build → `copy-static.js` copies `.next/static` and `public/` into `.next/standalone`. Run under PM2 via `ecosystem.config.js` (app `meterops`, fork mode, `npm run start:prod`).

## Git workflow (from AGENT.md)

After changes: `git add -A`, commit, push current branch to `origin`. Do not rewrite history, amend, or force-push unless asked. Never claim tests/validation passed unless actually run.
