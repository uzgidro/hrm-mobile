# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

**HRM Uzgidro** — an Expo Router mobile app (iOS / Android / web) for Uzgidro's internal HR system. UI language is Uzbek. It is the mobile client of an existing web dashboard and deliberately mirrors the web's business rules (see "Web parity" below). Backend API defaults to `https://hr-api.uzgidro.uz`; both it and the OnlyOffice server are configured via `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_ONLYOFFICE_URL` (see `.env.example`) and read through the frozen `Env` object in `src/config/env.ts` — access config via `Env`, never `process.env` or hard-coded URLs elsewhere.

## Commands

```bash
npm start          # expo start (Metro, dev server)
npm run ios        # expo run:ios   (native build)
npm run android    # expo run:android
npm run web        # expo start --web

npm test           # jest (jest-expo + RNTL 14 + axios-mock-adapter)
npm run typecheck  # tsc --noEmit (strict mode)
npm run lint       # eslint (eslint-config-expo/flat)
```

Every change should keep `npm test`, `npm run typecheck`, and `npm run lint` green.

**Release / CI-CD.** Two long-lived branches: `refactoring` (dev) and `master` (release). CI (`.github/workflows/`) runs on both: `ci.yml` (typecheck/lint/jest on PR + push), `ota.yml` (push to `master` → `eas update --channel production`, an over-the-air JS/asset update), `release.yml` (tag `v<app.json version>` on `master` → `eas build --profile production --auto-submit` to the Google Play **internal** track; promotion to production stays manual in Play Console). `eas.json` uses `appVersionSource: remote` (EAS owns `versionCode`); `runtimeVersion` policy is `appVersion`.
**Hard rule:** any change to native deps (`package.json`) or config plugins (`app.json`) MUST bump `expo.version` in the same PR and ship as a store release — an OTA that added a native requirement would reach binaries without that module. Pure JS/asset changes go out as OTAs from `master`. Local Android builds currently fail on a Gradle-9/JDK-21 toolchain mismatch (foojay `IBM_SEMERU`); build via EAS, not `expo run:android`.

**Testing conventions** (see `src/test/`): unit-test pure functions and data-layer request/query factories with `axios-mock-adapter`; component tests via the awaited `renderWithProviders`. Do **not** test hooks with `renderHook` — under RNTL 14 it deadlocks the jest worker; split hooks into a thin `useMutation`/`useQuery` wrapper over a pure request function and test the function. E2E smoke flows live in `.maestro/` (see its README) and run against a dev build on a simulator/emulator.

Expo SDK is **56** and its APIs have changed from earlier versions — consult https://docs.expo.dev/versions/v56.0.0/ before writing native/Expo code.

## Architecture

**Routing** is file-based via Expo Router with typed routes (`app/`). `app/_layout.tsx` is the single source of navigation truth: it wraps everything in `SafeAreaProvider → ThemeProvider → QueryClientProvider`, and every stack screen must be declared there. Two route groups: `(auth)/` (login) and `(tabs)/` (bottom tabs). All other screens are flat files in `app/` pushed onto the root stack.

**Auth bootstrap** — routing is **declarative**: `app/_layout.tsx` wraps screens in `<Stack.Protected guard={isAuthenticated}>` (tabs + inner screens) and `<Stack.Protected guard={!isAuthenticated}>` (`(auth)`), so login/logout flips `authStore.isAuthenticated` and the guard redirects automatically — do **not** add imperative `router.replace` for auth navigation. The `useAuthBootstrap` hook (`src/auth/`) resolves the session on launch and drives the native splash: it seeds a cached user immediately (non-blocking startup) then refreshes `auth/me` in the background. The pure, tested resolver is `resolveBootstrap()` in `src/auth/bootstrap.ts` — its five branches (no token / auth-me ok / 401-403 → logout / network error → cached user offline / no cache → login) are the auth contract; change it there, not inline. Tokens and the user cache go through `src/api/storage.ts` (a **SecureStore wrapper with a `localStorage` fallback on web**), and the access token is cached in memory via `src/api/authToken.ts` (read once, not per request).

**API layer** (`src/api/`):
- `client.ts` — the shared axios instance. A request interceptor attaches the bearer token; a response interceptor does **single-flight token refresh**: the first 401 starts one refresh promise and all concurrent 401s await it, so parallel queries on app-open don't each rotate the session and log the user out. If refresh fails, tokens are deleted. **Always import `apiClient` from here** — don't create new axios instances (a raw `axios.post` is used only inside the refresh call itself, to avoid interceptor recursion).
- `urls.ts` — every endpoint as a constant or `(id) => \`...\`` builder. Add new endpoints here rather than inlining path strings.
- Data fetching uses **TanStack Query** (`useQuery`/`useMutation` with `apiClient`), organized as per-feature `queries.ts`/`mutations.ts` factories (see Conventions).

**State**: **Zustand**, not Redux/Context, for app state. `authStore` (user, auth flags, login/logout, plus `isMasterAdmin`/`isEmployee`/`isHR` helpers) and `prefsStore` (theme preference, hydrated on launch). React Query owns all server state.

**Errors & UX states** — the QueryClient (`src/lib/queryClient.ts`) has a `QueryCache`/`MutationCache` `onError` that auto-shows a toast (`src/lib/toast.ts` + `<ToastHost/>` in the root layout): background query refetch failures toast (stale data stays), first-load query errors are left to the screen's `<ErrorState/>`, and every mutation error toasts unless it sets `meta: { skipErrorToast: true }`. Error text is normalized via `getApiErrorMessage(e, fallback)` (`src/api/errors.ts`) — use it in catch blocks instead of hand-parsing `detail`. A root `<RootErrorBoundary/>` catches render crashes. Screens use the shared `<LoadingView/>` / `<EmptyState/>` / `<ErrorState/>` from `src/components/StateViews.tsx` rather than inline `ActivityIndicator`/empty blocks.

**Roles & access** (`src/utils/roles.ts`) — the critical shared logic. It mirrors the web's `roleHelpers.js` 1:1. Special roles are `type === 'employee'` with `is_multi_org_user === true` and a `multi_org_employee_role` (`hr | kpp | ministr | deputy | chancellery | ...`), which may arrive as a **string or an array** — always resolve via `getMultiOrgRoles()`, never read the field directly. `canAccessPage(user, pageKey)` decides page/tab visibility and is what gates tab `href`s in `app/(tabs)/_layout.tsx` (a tab is hidden by setting `href: null`). When changing who-can-see-what, keep it consistent with the web's nav config.

**Theming** (`src/theme/`) — `useTheme()` gives `{ colors, isDark }`; `useThemedStyles(makeStyles)` builds `StyleSheet`s from the palette. There's an in-progress migration off the static `COLORS` export in `src/constants` (dark palette) toward the theme system — new/redesigned screens must use `useTheme()`, not `COLORS`.

**Push notifications** (`src/services/notifications.ts` + `_layout.tsx`) — imported for side effects at the top of `_layout.tsx`. Registers the Expo push token with the backend after login, invalidates the `['notifications']` query on foreground receipt, and `routeForNotification(data)` maps a notification payload to an in-app route on tap.

**App lock (mandatory PIN + biometrics)** — a **native-only** gate (`Platform.OS !== 'web'`; on web `lockStore` reports `unlocked` and nothing renders). Pure logic in `src/auth/` (`pin.ts` — salted SHA-256 record in SecureStore; `lockPolicy.ts` — `PIN_LENGTH`/`MAX_ATTEMPTS`/relock window; `biometrics.ts` — `expo-local-authentication` wrapper; `useAppLock.ts` — AppState re-lock after 1 min background) + the `lockStore` state machine (`unknown → setup-required | locked → unlocked`). UI in `src/features/security/` (one controlled `PinPad` shared by setup/unlock/change screens). It is a **full-screen overlay** (`LockOverlay`), rendered as a sibling of the navigator in `_layout.tsx` — **not a route** — so it never fights the `Stack.Protected` auth guards. Two invariants to preserve: (1) `useAuthBootstrap` **awaits `useLockStore.hydrate()` before `hideSplash()`** so content never flashes before the lock; (2) 5 wrong attempts → the screen calls `reset()` + `authStore.logout()` (the store only reports `forceLogout`; it never imports authStore). `authStore.login`/`logout` both call `lockStore.reset()` so a PIN never carries across users.

**In-app update check** (`src/services/appUpdates.ts`, wired once in `_layout.tsx` after unlock) — Google Play in-app updates via `expo-in-app-updates`, guarded no-op off-Android / in Expo Go / on web. `checkForUpdate` → an Uzbek Alert → `startUpdate(false)` (**flexible**; `true` = immediate). 24h cooldown, once per session. Distinct from **EAS Update** (`expo-updates`, OTA delivery — see Release above).

**Documents** — Buyruqlar (order-acts / decrees) and Xatlar (letters) support an OnlyOffice editor rendered in a `react-native-webview`; the editor's `api.js` is served from `ONLYOFFICE_SERVER_URL` (`src/api/urls.ts`). Status/stage logic for these flows lives in `src/utils/orderStatus.ts` and `src/utils/letterStatus.ts`.

## Conventions

- **Feature structure:** logic lives in `src/features/<feature>/` (api/components/screens/hooks/utils), `app/` is routes-only (thin re-exports like `export { default } from '@/features/<f>/screens/XScreen'`). See `src/features/README.md`. Nearly all screens are migrated into the feature layer; a few thin app-shell screens (`app/(auth)/login.tsx`, `app/(tabs)/modules.tsx`, `app/salary.tsx`) stay inline as route files but are fully i18n'd. New code follows this layout. **No cross-feature imports** — a feature reaches other features only through shared `src/utils/*`, `src/api/*`, or `src/components/*`. Each feature's data access is a per-feature `api/queries.ts` (hierarchical `xKeys` + `queryOptions` factories) + `api/mutations.ts` (pure request fns + thin `useMutation` hooks invalidating `xKeys.all`); see the `visitors` feature as the reference.
- Path alias `@/*` → `src/*` (tsconfig). App screens under `app/` typically import via relative paths; prefer `@/*` in new/moved code.
- Status/domain string mapping (order stages, letter statuses, leave types, role→page) is centralized in `src/utils/*` — extend those rather than scattering conditionals in screens.
- **i18n (4 languages):** all user-facing strings go through `t('namespace.key')` (i18next + react-i18next). Locales: `uz-Latn` (source of truth + fallback), `uz-Cyrl`, `ru`, `en`. Catalogs live in `src/i18n/locales/<loc>/<namespace>.ts` (one flat object per language, dotted keys like `t('orders.createTitle')`; a namespace per feature). Adding a string = add the key to **all four** locale files for that namespace (a catalog-parity test fails otherwise). **Every component that renders translated text must call `useTranslation()`** so it re-renders on a language switch — including ones that only show labels resolved through utils (`statusMeta` etc.). Non-React services use the `i18n` singleton (`import i18n from '@/i18n'`). Plurals via i18next `{ count }` — Russian needs `_one/_few/_many`, uz/en `_one/_other`. Dates: use `monthName`/`weekdayName` from `@/i18n/dates` (never a local `MONTHS_UZ` array); the dayjs locale switches with the language (built-in `uz` is Cyrillic, `uz-latn` is Latin). **Web-parity: never translate enum values / status codes / role tokens / API field keys** — only their display labels. The switcher (flags, `src/components/Flag.tsx`) is in ProfileScreen; language defaults to the device locale on first launch (`expo-localization`), persists an explicit choice, and hydrates in `useAuthBootstrap` awaited before `hideSplash`.
- Large lists (attendance events, employees) are loaded with a **parallel-pagination** helper — see `src/utils/attendance.ts` and `src/utils/employees.ts`. Reuse these instead of hand-rolling page loops.

## Web parity is a hard constraint

Role resolution, page visibility, and the approval/signing workflows (order-act decree chain: approve → forward-to-leadership → register → acknowledge; letter/leave sign & reject) are intended to match the web dashboard exactly. When touching these, mirror the web's behavior rather than inventing mobile-specific rules.
