# Deploying the Android app (EAS Build)

This builds an installable **APK** on Expo's cloud (EAS Build). No local Android SDK needed.

Build profiles live in [eas.json](eas.json):

| Profile      | Output                | Use                                  |
| ------------ | --------------------- | ------------------------------------ |
| `preview`    | `.apk` (internal)     | Sideload directly onto a phone       |
| `production` | `.aab` (app bundle)   | Play Store upload only (not an APK)  |

Android package id: `com.meterops.app` (set in [app.json](app.json)).

## One-time setup

1. Create a free account at <https://expo.dev/signup>.
2. Install deps (from `mobile/`):
   ```bash
   npm install
   ```
3. Log in:
   ```bash
   npx eas-cli login
   npx eas-cli whoami   # confirm
   ```
4. Link the project to your Expo account. This writes `extra.eas.projectId` and `owner` into `app.json`:
   ```bash
   npx eas-cli init
   ```
   Commit that change.

## Build the APK

From `mobile/`:

```bash
npx eas-cli build -p android --profile preview
```

- On the first build EAS asks to generate an **Android keystore**. Say yes and let EAS manage it. Keep using the same keystore so future APKs install as updates over old ones.
- The build runs in the cloud. The CLI prints a build URL and waits (add `--no-wait` to return immediately).
- When it finishes, download the `.apk` from the build page (<https://expo.dev> → your project → Builds), or scan the QR code from the CLI on the phone.

Useful variants:

```bash
npx eas-cli build -p android --profile preview --no-wait   # don't block the terminal
npx eas-cli build:list                                     # list recent builds
npx eas-cli build:download --platform android --latest     # fetch the latest artifact
```

## Install on a phone

1. Copy the `.apk` to the phone (or open the build page / QR code on it).
2. Allow "Install unknown apps" for the app you opened it from (browser / Files).
3. Tap the APK to install.

## Before building

Run these from `mobile/` and fix anything they report:

```bash
npm run typecheck
npm run lint
npx expo-doctor
```

## Things specific to this repo

- **Shared code:** the app imports the repo-root `lib/` as `@lib/*` (see `metro.config.js` and `tsconfig.json`). EAS packages the project from the **git repository root**, so keep `mobile/` inside this repo and run the build from within it. Don't move `mobile/` out of the repo, or `../lib` will be missing in the cloud build.
- **Uncommitted files are not uploaded** when the project is in git (EAS respects `.gitignore` and uses the git state). Commit your changes, including `lib/` edits, before building.
- **Peer deps:** `mobile/.npmrc` sets `legacy-peer-deps=true`. EAS reads it from the project, so cloud installs behave like local ones.
- **Versioning:** `appVersionSource` is `local`. Bump `expo.version` in `app.json` for user-visible releases. To install over an existing build, you must also raise the Android `versionCode` (add `expo.android.versionCode` in `app.json` and increment it each build). Without it, Android may refuse the update.
- **No server needed:** data lives in on-device AsyncStorage. Use the in-app Export/Import backup before uninstalling or switching signing keys, since uninstalling wipes the data.

## Troubleshooting

- **`../lib` / `@lib/*` not found in the build log:** the change isn't committed, or the build was started outside the repo.
- **Install fails with "App not installed":** an existing install was signed with a different key (e.g. a local debug build). Uninstall it first (export a backup beforehand), or confirm `versionCode` was increased.
- **Dependency resolution errors during install:** confirm `mobile/.npmrc` is committed and `package-lock.json` is in sync (`npm install` locally, then commit).
- **Check build status/logs:** open the build URL printed by the CLI, or run `npx eas-cli build:list`.

## Play Store (optional, later)

Use the `production` profile to produce an `.aab`, then upload it in the Play Console:

```bash
npx eas-cli build -p android --profile production
```
