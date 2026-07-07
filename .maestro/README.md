# E2E flows (Maestro)

End-to-end smoke flows for the HRM Uzgidro app, run against a **dev build** on
an iOS simulator or Android emulator (not Expo Go). They assume an authenticated
session unless noted; `login.yaml` can establish one.

## Prerequisites

- Maestro CLI: `curl -Ls "https://get.maestro.mobile.dev" | bash` → adds
  `~/.maestro/bin` to PATH.
- A JDK on PATH. If you only have Android Studio's bundled JBR:
  `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`
- The dev build installed and Metro running (`npm start`). A booted simulator
  or emulator with the app installed (`npm run ios` / `npm run android`).

## Running

```bash
export PATH="$HOME/.maestro/bin:$PATH"
export MAESTRO_CLI_NO_ANALYTICS=1

# One flow on a specific device (get the id from `xcrun simctl list` / `adb devices`)
maestro --device <UDID-or-serial> test .maestro/tabs-navigation.yaml

# All flows
maestro test .maestro/
```

## Flows

| Flow | What it covers |
|------|----------------|
| `login.yaml` | Login with `-e USERNAME=… -e PASSWORD=…`; no-ops if already signed in. |
| `tabs-navigation.yaml` | Navigates all 5 bottom tabs, asserts each migrated screen renders (dashboard, orders, letters, modules, guests). |
| `create-leave.yaml` | Opens the decomposed leave-request form; exercises the extracted type-sheet + date-time picker + comment field. Does **not** submit (no real request created). |
| `guests.yaml` | Opens the visitors list + the create-guest form, backs out without saving. |

## Conventions

- **Tabs are tapped by `id:`** (`tab-home` / `tab-orders` / `tab-letters` /
  `tab-modules` / `tab-guests`), set via `tabBarButtonTestID` in
  `app/(tabs)/_layout.tsx`. The 10px tab labels are drawn by a custom `TabIcon`
  and are not reliable text selectors.
- Assertions target prominent screen content (card/section headers), not tiny
  labels.
- Flows deliberately avoid destructive submits so they are safe to re-run
  against a real backend.
- iOS has no hardware back — flows leave a pushed screen via the on-screen
  back chevron (top-left, ~7%,11%).
