import type { Letter } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Business-trip (xizmat safari) action helpers. Action gating (submit / approve)
// reads the server-computed letter.available_actions flags — the client does not
// re-derive trip rights (it does not know the branch trip_approver). See the
// backend _available_actions. This file stays self-contained (no import from
// letterStatus.ts) so the dependency arrow is strictly one-way.
// ─────────────────────────────────────────────────────────────────────────────

// The employee may send a trip draft into the flow. Purely the server flag —
// the backend already checked creator + draft + (NEW-flow attachment).
export function canSubmitTrip(l: Letter): boolean {
  return !!l.available_actions?.can_submit_trip;
}
