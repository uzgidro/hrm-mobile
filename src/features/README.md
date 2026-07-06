# Feature modules

Target architecture (bulletproof-react style, adapted for Expo Router). We are
migrating here **incrementally** — screens move into a feature as later work
touches them (query colocation, god-file decomposition), not in one big sweep.
New code should follow this layout from the start.

## Layout

```
src/features/<feature>/
  api/          # queryOptions factories (queries.ts) + mutations (mutations.ts)
  components/   # components specific to this feature
  screens/      # screen components (the route file in app/ re-exports these)
  hooks/        # feature hooks (workflow logic, derived state)
  utils/        # feature-specific helpers (status maps, formatters)
  types.ts      # feature-local types (shared types stay in src/types)
```

`app/` stays **routes-only**: an `app/x.tsx` route is a thin re-export of its
screen, e.g. `export { default } from '@/features/orders/screens/OrderDetailScreen';`.
Route groups and `_layout.tsx` files remain in `app/` (they are navigation config).

## Rules

- **No cross-feature imports.** Compose features at the route (`app/`) level.
  Shared building blocks live in `src/components`, `src/lib`, `src/utils`,
  `src/types` — not in another feature.
- Import via the `@/*` alias (→ `src/*`) rather than deep relative paths.
- Keep route files thin (a re-export or a few lines); logic belongs in the
  feature, so it stays testable and out of the router graph.

## Suggested feature boundaries

`auth` · `dashboard` · `orders` · `letters` · `leaves` · `attendance` ·
`employees` · `visitors` · `projects` · `profile` · `notifications` · `news`

(`visitors` supersedes the Uzbek `mehmon-*` naming and `projects` the `loyiha-*`
naming in code; the `app/` route file names stay as-is so push deep-links and
`routeForNotification` keep working.)
