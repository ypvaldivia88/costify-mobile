# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Cursor Cloud specific instructions

**What this is:** `costify-mobile` ("Costify") is a single, fully offline Expo SDK 56 / React Native app (no backend, no DB, no network — all data lives in on-device AsyncStorage). The only dev service is the Expo/Metro dev server.

**Running the app:** There is no Android emulator in the cloud VM, so use the web target to interact with the app:

```bash
EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1 npx expo start --web --port 8081
```

- `EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1` is **required** to bundle. SDK 56 throws (`expo-router is no longer compatible with react-navigation`) when both packages are installed. This app actually uses React Navigation (`src/navigation/AppNavigator.tsx`); `expo-router` is an unused leftover dependency, so disabling the check is safe.
- Add `CI=1` to disable Metro watch mode for one-shot/background runs.
- First web bundle takes ~30s. Confirm a clean build by fetching the bundle: `curl "http://localhost:8081/index.ts.bundle?platform=web&dev=true"` should return HTTP 200 (not a JSON `InternalError`).

**Dependency gotchas (handled by the update script, noted here for context):**
- `npm install` must use `--legacy-peer-deps` — the committed lockfile has an upstream peer conflict (`react@19.2.3` vs `react-dom@19.2.7`'s `react@^19.2.7` requirement, pulled in transitively via `expo-router`). `npm ci` fails for the same reason.
- `babel-preset-expo` is nested under `node_modules/expo/node_modules/` in the committed lockfile and is NOT hoisted, so Babel/Metro cannot resolve it from the project root. It must be force-installed at top level.
- The web target deps (`react-dom`, `react-native-web`, `@expo/metro-runtime`) are not in `package.json` (this is primarily an Android app). They are installed with `--no-save` so the committed project is unchanged.

**Lint/test/build:** There is no ESLint config and no test framework. Type-check with `npx tsc --noEmit` (closest thing to a lint gate). Production builds use EAS (`eas build`), which needs an Expo account + real `projectId` in `app.json` — not available/needed in the cloud VM.
