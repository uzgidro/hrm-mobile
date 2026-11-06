import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { __resetAccessTokenCache } from '@/api/authToken';
import { FACE_CHALLENGE, FACE_ME, FACE_STATUS, FACE_VERIFY, USER_INFO } from '@/api/urls';
import { faceErrorKey, faceLoginEnabled, getMyFaceLogin, setMyFaceLogin, startFaceChallenge, verifyFace } from '../api';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(apiClient);
  __resetAccessTokenCache();
});

afterEach(() => mock.restore());

describe('faceLoginEnabled', () => {
  it('follows the server flag', async () => {
    mock.onGet(FACE_STATUS).reply(200, { enabled: true });
    await expect(faceLoginEnabled()).resolves.toBe(true);
  });

  it('hides the button when the server is unreachable or says no', async () => {
    mock.onGet(FACE_STATUS).reply(500);
    await expect(faceLoginEnabled()).resolves.toBe(false);
    mock.onGet(FACE_STATUS).reply(200, { enabled: false });
    await expect(faceLoginEnabled()).resolves.toBe(false);
  });
});

describe('face login requests', () => {
  it('starts a challenge', async () => {
    const body = {
      challenge_id: 'c1',
      steps: ['front', 'left', 'right', 'left'],
      expires_in: 90,
      step_ms: 2500,
      frame_interval_ms: 250,
      max_frames: 64,
    };
    mock.onPost(FACE_CHALLENGE).reply(200, body);
    await expect(startFaceChallenge()).resolves.toEqual(body);
  });

  it('sends every frame in one request and loads the user with the new token', async () => {
    mock.onPost(FACE_VERIFY).reply((config) => {
      const body = JSON.parse(config.data);
      expect(body).toEqual({
        challenge_id: 'c1',
        frames: [
          { i: 0, t: 0, image: 'A' },
          { i: 1, t: 300, image: 'B' },
          { i: 1, t: 620, image: 'C' },
        ],
        mirrored: false,
      });
      expect(config.headers?.['device-type']).toBe('mobile');
      return [200, { access_token: 'acc', refresh_token: 'ref', expires_in: 600 }];
    });
    mock.onGet(USER_INFO).reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer acc');
      return [200, { id: 7, username: 'x' }];
    });
    const out = await verifyFace('c1', [
      { i: 0, t: 0, image: 'A' },
      { i: 1, t: 300, image: 'B' },
      { i: 1, t: 620, image: 'C' },
    ]);
    expect(out.tokens.refresh_token).toBe('ref');
    expect(out.user).toEqual({ id: 7, username: 'x' });
  });
});

describe('faceErrorKey', () => {
  const err = (code?: string) => ({ response: { data: { code } } });
  const nested = (code: string, params?: Record<string, unknown>) => ({
    response: { data: { detail: { code, params } } },
  });

  it('maps backend codes to messages', () => {
    expect(faceErrorKey(err('face_not_recognized'))).toBe('auth.faceNotRecognized');
    expect(faceErrorKey(err('too_many_login_attempts'))).toBe('auth.tooManyAttempts');
    expect(faceErrorKey(err('face_not_found'))).toBe('auth.faceNotFound');
    expect(faceErrorKey(err('face_multiple'))).toBe('auth.faceMultiple');
    expect(faceErrorKey(err('face_too_small'))).toBe('auth.faceTooSmall');
    expect(faceErrorKey(err('face_challenge_expired'))).toBe('auth.faceExpired');
    expect(faceErrorKey(err('face_login_unavailable'))).toBe('auth.faceUnavailable');
  });

  it('reads the code from an object-shaped detail', () => {
    expect(faceErrorKey(nested('face_login_not_allowed'))).toBe('auth.faceNotAllowed');
    expect(faceErrorKey(nested('face_frames_invalid'))).toBe('auth.faceFramesInvalid');
  });

  it('picks the liveness message by reason', () => {
    expect(faceErrorKey(nested('face_liveness_failed', { reason: 'spoof' }))).toBe('auth.faceSpoof');
    expect(faceErrorKey(nested('face_liveness_failed', { reason: 'too_fast' }))).toBe('auth.faceTooFast');
    expect(faceErrorKey(nested('face_liveness_failed', { reason: 'identity' }))).toBe('auth.faceContinuity');
    expect(faceErrorKey(nested('face_liveness_failed', { reason: 'continuity' }))).toBe('auth.faceContinuity');
    expect(faceErrorKey(nested('face_liveness_failed', { reason: 'pose' }))).toBe('auth.faceLiveness');
    expect(faceErrorKey(nested('face_liveness_failed', { reason: 'flash' }))).toBe('auth.faceFlash');
    expect(faceErrorKey(nested('face_liveness_failed'))).toBe('auth.faceLiveness');
    expect(faceErrorKey(err('face_liveness_failed'))).toBe('auth.faceLiveness');
  });

  it('falls back to the generic message', () => {
    expect(faceErrorKey(err('something_else'))).toBe('auth.faceFailed');
    expect(faceErrorKey(new Error('network'))).toBe('auth.faceFailed');
  });
});

describe('my face login switch', () => {
  it('reads the per-person state', async () => {
    const body = { available: true, eligible: true, enabled: false };
    mock.onGet(FACE_ME).reply(200, body);
    await expect(getMyFaceLogin()).resolves.toEqual(body);
  });

  it('PUTs the new value and returns the server state', async () => {
    mock.onPut(FACE_ME, { enabled: false }).reply(200, { available: true, eligible: true, enabled: false });
    await expect(setMyFaceLogin(false)).resolves.toEqual({ available: true, eligible: true, enabled: false });
  });

  it('maps face_login_turned_off to its own message', () => {
    expect(faceErrorKey({ response: { data: { code: 'face_login_turned_off' } } })).toBe('auth.faceTurnedOff');
  });
});
