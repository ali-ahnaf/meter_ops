# SPEC: Meter Ops Android app (offline, Expo)

## 1. Goal

- A household meter reader opens the Android app with no network. They log DPDC meter readings and WASA water amounts, edit or delete sessions, compare two sessions and see the bill. Everything works the same as on the web app.
- Data survives app restarts and phone reboots, and never leaves the phone unless the user exports it.
- **Export:** creates a single `.json` backup file and opens the Android share sheet.
- **Import:** restores a backup, or migrates the web app's `db.json`, after a confirmation step.
- **Failure:** if an import file is invalid, the user sees an error alert and their existing data is unchanged.
- Why: readings are taken at the meter, where there is often no signal, and the web app needs the server to be reachable.

## 2. Decisions

- Data location → device only. No server calls from the app.
- Backup → manual export and import of one JSON file, using the share sheet and the document picker.
- Web app → kept unchanged and still live. The new app lives in `mobile/` next to it.
- OCR → manual entry only. The web UI has no OCR either; only dead helpers and the `tesseract.js` dependency remain.
- Framework → Expo (managed, CNG, EAS builds), Android only. Output is an APK for sideloading.
- Expo SDK → latest stable when work starts. Use the versioned docs, not memory (assumed).
- Navigation → Expo Router with two bottom tabs, DPDC and WASA. Stack routes for session detail and the consumption report (assumed).
- Storage → `@react-native-async-storage/async-storage`, one key per web JSON file, holding the same shapes (assumed).
- Sharing pure logic → mobile imports the repo-root `lib/` through Metro `watchFolders`. Separate `mobile/package.json`, no npm workspaces, because the root uses React 18 and Expo needs 19 (assumed).
- Logic now inside web components that mobile also needs → move it into `lib/`, and make the web components import it from there with no change in behaviour (assumed).
- Billing → exact parity with the current web behaviour, except for the two client-confirmed fixes below (assumed).
- Mother-meter rate → 12.5/unit is correct (client). The "10.50" text in the report explanation is wrong; correct it on web and mobile.
- WASA last usage → save the on-screen total `diff × 16.7 × 2 × 1.15` (client). Use one shared `lib/` function so web and mobile both change.
- Import semantics → replace all data after `Alert` confirmation. No merging (assumed).
- Import accepts → the backup format below, or a bare web `db.json` (`MeterSession[]`) or `water-db.json` (`WaterSession[]`). The array type is detected by whether items have a `readings` field (assumed).
- Charts → `react-native-gifted-charts` (assumed).
- Theme and fonts → light only, matching the web palette. IBM Plex Mono and Space Mono via `@expo-google-fonts` (assumed).
- UI conventions → follow `.agents/react-native/SKILL.md`, reading its `packages/app` as `mobile/` (assumed).
- Test policy: manual

## 3. Open questions for the client

None.

## 4. Contract

Backup file, written by Export and read by Import:
```ts
type MeterOpsBackup = {
  app: 'meter-ops';
  version: 1;
  exportedAt: string;              // ISO
  sessions: MeterSession[];        // lib/meter-ops.ts (== web db.json)
  waterSessions: WaterSession[];   // lib/water-ops.ts (== web water-db.json)
  lastUsage: LastUsage | null;     // == web last-usage.json
  waterLastUsage: LastUsage | null;// == web water-last-usage.json
};
// file name: meter-ops-backup-YYYY-MM-DD.json
```
`LastUsage` moves from `components/last-usage-card.tsx:5-16` to `lib/meter-ops.ts`:
```ts
export type LastUsage = { amount: number; calculatedAt: string; fromDate?: string; toDate?: string; detail?: string };
```
AsyncStorage keys:
```ts
'meterops:sessions' | 'meterops:waterSessions' | 'meterops:lastUsage' | 'meterops:waterLastUsage'
```
Mobile storage API (`mobile/src/storage.ts`), which mirrors `app/actions.ts`:
```ts
getSessions(): Promise<MeterSession[]>;          saveSessions(s: MeterSession[]): Promise<void>;
getWaterSessions(): Promise<WaterSession[]>;     saveWaterSessions(s: WaterSession[]): Promise<void>;
getLastUsage(): Promise<LastUsage | null>;       saveLastUsage(u: LastUsage): Promise<void>;
getWaterLastUsage(): Promise<LastUsage | null>;  saveWaterLastUsage(u: LastUsage): Promise<void>;
exportBackup(): Promise<void>;                   importBackup(): Promise<'imported' | 'cancelled'>; // throws on invalid file
```
New readings keep `ocrText: ''` so their data stays compatible with the web app.

## 5. Change plan

Shared `lib/`, where the web app's behaviour must not change:
1. `lib/consumption.ts:1` - change the `@/lib/meter-ops` import to `./meter-ops`, so it resolves without the alias.
2. `lib/meter-ops.ts` - add the `LastUsage` type (moved from `components/last-usage-card.tsx:5-16`). Add `parsePastedReadings(text)` (moved from `components/session-manager.tsx:118-151`).
3. `lib/water-ops.ts` - add `WATER_RATE = 16.7` and the water bill and monthly-estimate functions (moved from `components/water-session-manager.tsx:12,101-113,303-325`). The bill function returns the on-screen total `diff × 16.7 × 2 × 1.15`.
4. `components/last-usage-card.tsx`, `components/session-manager.tsx`, `components/water-session-manager.tsx` - import the moved code from `lib/`.
   - `components/water-session-manager.tsx:134` saves the shared bill total as last usage, not `diff × 16.7`.
5. `components/consumption-report.tsx:73-74` - change the explanation text from 10.50 to 12.5/unit.

Root config:
6. `tsconfig.json` - add `"mobile"` to `exclude` so `next build` doesn't type-check RN code.
7. `.gitignore` - add `.expo/`, `mobile/android/`, `mobile/ios/`, `*.apk`, `*.aab`, `*.jks`, `*.keystore`, `credentials.json`.

New `mobile/` app:
8. `mobile/package.json`, `app.json`, `eas.json` - Expo app; Android package `com.meterops.app`; EAS `preview` profile builds an APK.
9. `mobile/tsconfig.json` - extends `expo/tsconfig.base` and includes `../lib/**`.
10. `mobile/metro.config.js` - `watchFolders: [repoRoot]`, with `nodeModulesPaths` set to `mobile/node_modules`.
11. `mobile/.eslintrc.json` - `root: true` (stops it inheriting the root `next/core-web-vitals`).
12. `mobile/src/storage.ts` - the storage API above. Write with AsyncStorage `multiSet`.
13. `mobile/src/backup.ts` - export with `expo-file-system` and `expo-sharing`; import with `expo-document-picker`. Validate the shape, then write all four keys.
14. `mobile/src/app/_layout.tsx`, `(tabs)/_layout.tsx` - root stack, fonts, and the DPDC/WASA tabs. A header menu holds Export and Import.
15. `mobile/src/app/(tabs)/index.tsx` - port of `components/session-manager.tsx`:
    - add-session modal with the one-mother-meter rule
    - paste import
    - calculate (pick 2)
    - delete with `Alert.alert`
    - `LastUsageCard`, chart, recent comparison
16. `mobile/src/app/sessions/[sessionId].tsx` - port of `components/session-detail.tsx` and `components/session-table.tsx`: edit the date and add, edit or delete readings. Dates use a date-time picker.
17. `mobile/src/app/consumption.tsx` - port of `components/consumption-report.tsx`. Takes the `first`/`second` params, uses `buildConsumptionComparison`, and saves last usage.
18. `mobile/src/app/(tabs)/wasa.tsx` - port of `components/water-session-manager.tsx` and `components/water-readings-chart.tsx`.
19. `mobile/src/components/` - Button, Card, TextField, LastUsageCard, RecentConsumptionCard, MeterReadingsChart (with per-owner toggles), WaterChart. Design tokens go in `mobile/src/theme.ts`.
20. `CLAUDE.md` - add a short Mobile section: commands, how `lib/` is shared, and the backup format.

Callers checked: session-manager, session-detail, session-table, consumption-report, recent-consumption-card, last-usage-card, water-session-manager, meter-readings-chart, water-readings-chart, navbar.
Workspaces checked clean: `scripts/copy-static.js`, `ecosystem.config.js`, `next.config.mjs` (unaffected).
Build order: shared `lib/` and root config first → `npm run build && npm run lint` (web still green) → `cd mobile && npm i && npx expo-doctor && npx tsc --noEmit` → `eas build -p android --profile preview`.

## 6. Out of scope

- Any OCR or camera capture. Also leaving the dead OCR helpers in `lib/meter-ops.ts` as they are.
- Sync with the web server and multi-device use.
- iOS builds and Play Store publishing.
- Replacing the hardcoded 378/1440/12.5 values with constants.
- Dark mode, and changes to the web UI beyond the `lib/` moves.

## 7. Risks

- Metro fails to resolve `lib/` outside the project root → the `watchFolders` setup is step 10. Verification step 3 catches a failure.
- Moving code into `lib/` changes the web app's numbers → compare a web consumption report before and after (step 2). The WASA last-usage change is the only intended difference.
- Data is lost when the user uninstalls the app → an Export reminder is shown on the menu. The backup is the only recovery path.

## 8. Verification

1. `npm run build && npm run lint` at the repo root passes.
2. Pick two web sessions and open `/consumption?firstSessionId=A&secondSessionId=B` (`npm run dev`, port 3033). Every row and the total match what the page showed before the `lib/` moves, and the explanation text reads 12.5/unit for the mother meter.
3. `cd mobile && npx expo-doctor && npx tsc --noEmit` passes. `npx expo run:android` launches on a device or emulator.
4. With airplane mode on, add a session (3 owners plus `MM` as mother meter). Force-stop the app and reopen it: the session is still there.
5. Add a second session, then tap Calculate: the report rows and the total equal the web report for the same readings.
6. On the WASA tab, add 2 entries. The calculated total and monthly estimate equal the web `/wasa` page for the same inputs, and the last-usage card shows that same total (×2, +15% VAT) on both web and mobile.
7. Menu → Export: the share sheet opens with `meter-ops-backup-<date>.json`. Save it to Files.
8. Clear the app's data in Android settings, then Import that file and confirm: all sessions, water entries and last-usage cards return.
9. Import the server's `db.json`: the web sessions appear, and the report for two of them equals step 2.
10. Import a non-JSON file, or `{}`: an error alert appears and the existing data is unchanged.
11. `eas build -p android --profile preview` produces an APK that installs on a physical phone.
