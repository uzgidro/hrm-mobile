import type { Letter } from '@/types';
import {
  canSubmitTrip, canApproveTrip, canApproveReport, canApproveGuvohnoma, canRejectLetter,
} from '../tripStatus';

const letter = (o: Partial<Letter>): Letter => ({ id: 1, ...o });

// The trip action gates read the server-computed available_actions flags — the
// client does not re-derive trip rights (the backend knows the trip_approver we
// don't). These tests pin that each gate reads its OWN flag (catches a wrong
// flag-name) and degrades to false when available_actions is absent (list /
// pre-deploy backend).
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

describe('trip action gates read their own flag and default to false', () => {
  it('canApproveTrip reads can_approve_trip only', () => {
    expect(canApproveTrip(letter({ available_actions: { can_approve_trip: true } }))).toBe(true);
    expect(canApproveTrip(letter({ available_actions: { can_approve_report: true } }))).toBe(false);
    expect(canApproveTrip(letter({}))).toBe(false);
  });

  it('canApproveReport reads can_approve_report only', () => {
    expect(canApproveReport(letter({ available_actions: { can_approve_report: true } }))).toBe(true);
    expect(canApproveReport(letter({ available_actions: { can_approve_trip: true } }))).toBe(false);
    expect(canApproveReport(letter({}))).toBe(false);
  });

  it('canApproveGuvohnoma reads can_approve_guvohnoma only', () => {
    expect(canApproveGuvohnoma(letter({ available_actions: { can_approve_guvohnoma: true } }))).toBe(true);
    expect(canApproveGuvohnoma(letter({ available_actions: { can_approve_report: true } }))).toBe(false);
    expect(canApproveGuvohnoma(letter({}))).toBe(false);
  });

  it('canRejectLetter reads can_reject only', () => {
    expect(canRejectLetter(letter({ available_actions: { can_reject: true } }))).toBe(true);
    expect(canRejectLetter(letter({ available_actions: { can_sign: true } }))).toBe(false);
    expect(canRejectLetter(letter({}))).toBe(false);
  });
});
