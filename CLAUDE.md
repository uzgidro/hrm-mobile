# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

**HRM Uzgidro** — an Expo Router mobile app (iOS / Android / web) for Uzgidro's internal HR system. UI language is Uzbek. It is the mobile client of an existing web dashboard and deliberately mirrors the web's business rules (see "Web parity" below). Backend API: `https://hr-api.uzgidro.uz` (set in `src/constants/index.ts`).

## Commands

```bash
npm start          # expo start (Metro, dev server)
npm run ios        # expo run:ios   (native build)
npm run android    # expo run:android
npm run web        # expo start --web
```

There is **no test runner, linter, or typecheck script** configured. To typecheck manually: `npx tsc --noEmit` (strict mode is on). Builds ship via EAS (`eas.json`: `preview` = internal APK, `production` = app-bundle with autoIncrement).

Expo SDK is **56** and its APIs have changed from earlier versions — consult https://docs.expo.dev/versions/v56.0.0/ before writing native/Expo code.

## Architecture

**Routing** is file-based via Expo Router with typed routes (`app/`). `app/_layout.tsx` is the single source of navigation truth: it wraps everything in `SafeAreaProvider → ThemeProvider → QueryClientProvider`, and every stack screen must be declared there. Two route groups: `(auth)/` (login) and `(tabs)/` (bottom tabs). All other screens are flat files in `app/` pushed onto the root stack.

**Auth bootstrap** lives in the `AuthLoader` component inside `app/_layout.tsx`. On launch it reads `access_token` from secure storage, calls `auth/me`, and routes to `(tabs)` or `(auth)/login`. On network failure (not 401/403) it falls back to the cached user (`cached_user`) so the app works offline. Tokens and the user cache go through `src/api/storage.ts`, which is a **SecureStore wrapper with a `localStorage` fallback on web** (SecureStore doesn't exist on web).

**API layer** (`src/api/`):
- `client.ts` — the shared axios instance. A request interceptor attaches the bearer token; a response interceptor does **single-flight token refresh**: the first 401 starts one refresh promise and all concurrent 401s await it, so parallel queries on app-open don't each rotate the session and log the user out. If refresh fails, tokens are deleted. **Always import `apiClient` from here** — don't create new axios instances (a raw `axios.post` is used only inside the refresh call itself, to avoid interceptor recursion).
- `urls.ts` — every endpoint as a constant or `(id) => \`...\`` builder. Add new endpoints here rather than inlining path strings.
- Data fetching uses **TanStack Query** directly (`useQuery`/`useMutation` with `apiClient`). `src/hooks/useApi.ts` (`useGet`/`usePost`) is a simpler legacy pattern still used by some screens — prefer React Query for new work.

**State**: **Zustand**, not Redux/Context, for app state. `authStore` (user, auth flags, login/logout, plus `isMasterAdmin`/`isEmployee`/`isHR` helpers) and `prefsStore` (theme preference, hydrated on launch). React Query owns all server state.

**Roles & access** (`src/utils/roles.ts`) — the critical shared logic. It mirrors the web's `roleHelpers.js` 1:1. Special roles are `type === 'employee'` with `is_multi_org_user === true` and a `multi_org_employee_role` (`hr | kpp | ministr | deputy | chancellery | ...`), which may arrive as a **string or an array** — always resolve via `getMultiOrgRoles()`, never read the field directly. `canAccessPage(user, pageKey)` decides page/tab visibility and is what gates tab `href`s in `app/(tabs)/_layout.tsx` (a tab is hidden by setting `href: null`). When changing who-can-see-what, keep it consistent with the web's nav config.

**Theming** (`src/theme/`) — `useTheme()` gives `{ colors, isDark }`; `useThemedStyles(makeStyles)` builds `StyleSheet`s from the palette. There's an in-progress migration off the static `COLORS` export in `src/constants` (dark palette) toward the theme system — new/redesigned screens must use `useTheme()`, not `COLORS`.

**Push notifications** (`src/services/notifications.ts` + `_layout.tsx`) — imported for side effects at the top of `_layout.tsx`. Registers the Expo push token with the backend after login, invalidates the `['notifications']` query on foreground receipt, and `routeForNotification(data)` maps a notification payload to an in-app route on tap.

**Documents** — Buyruqlar (order-acts / decrees) and Xatlar (letters) support an OnlyOffice editor rendered in a `react-native-webview`; the editor's `api.js` is served from `ONLYOFFICE_SERVER_URL` (`src/api/urls.ts`). Status/stage logic for these flows lives in `src/utils/orderStatus.ts` and `src/utils/letterStatus.ts`.

## Conventions

- Path alias `@/*` → `src/*` (tsconfig). App screens under `app/` typically import via relative paths.
- Status/domain string mapping (order stages, letter statuses, leave types, role→page) is centralized in `src/utils/*` — extend those rather than scattering conditionals in screens.
- User-facing strings are Uzbek (no i18n library — literals throughout; `dayjs` uses the `uz` locale for weekday/month names). Match surrounding wording when adding UI text.
- Large lists (attendance events, employees) are loaded with a **parallel-pagination** helper — see `src/utils/attendance.ts` and `src/utils/employees.ts`. Reuse these instead of hand-rolling page loops.

## Web parity is a hard constraint

Role resolution, page visibility, and the approval/signing workflows (order-act decree chain: approve → forward-to-leadership → register → acknowledge; letter/leave sign & reject) are intended to match the web dashboard exactly. When touching these, mirror the web's behavior rather than inventing mobile-specific rules.
