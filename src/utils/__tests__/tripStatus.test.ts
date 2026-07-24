import type { Letter } from '@/types';
import { canSubmitTrip } from '../tripStatus';

const letter = (o: Partial<Letter>): Letter => ({ id: 1, ...o });

// canSubmitTrip reads the server-computed available_actions flag — the client
// does not re-derive trip rights (the backend knows the trip_approver we don't).
describe('canSubmitTrip', () => {
  it('true when the server flag can_submit_trip is set', () => {
    expect(canSubmitTrip(letter({ available_actions: { can_submit_trip: true } }))).toBe(true);
  });

  it('false when the flag is absent, false, or available_actions is missing', () => {
    expect(canSubmitTrip(letter({ available_actions: { can_submit_trip: false } }))).toBe(false);
    expect(canSubmitTrip(letter({ available_actions: {} }))).toBe(false);
    expect(canSubmitTrip(letter({}))).toBe(false);
  });
});
