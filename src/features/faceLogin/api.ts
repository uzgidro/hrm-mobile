// Face login (2026-11-06) — sign in with the front camera, no username/password.
//
// The server hands out a single-use challenge (front, then three head turns);
// the app films a short burst of JPEG frames during every step and sends the
// whole clip (with timestamps) in one request.
// Liveness + recognition among all employees happen on the server
// (backend services/face_login.py). Frames are not stored anywhere.
import { apiClient } from '@/api/client';
import { FACE_CHALLENGE, FACE_STATUS, FACE_VERIFY, USER_INFO } from '@/api/urls';
import type { User } from '@/types';

export type FaceStep = 'front' | 'left' | 'right';

export type FlashColor = 'red' | 'green' | 'blue';

/** Server-driven screen flash shown during one step (optional). */
export type FaceFlash = {
  /** Step index the flash belongs to (always 0). */
  step: number;
  colors: FlashColor[];
  /** First slot starts this long after filming starts (t0), ms. */
  start_ms: number;
  /** Length of one colour slot, ms. */
  slot_ms: number;
  /** Minimum gap between two captured frames during the flash step, ms. */
  frame_interval_ms: number;
};

export type FaceChallenge = {
  challenge_id: string;
  steps: FaceStep[];
  expires_in: number;
  /** Duration of one step, ms. */
  step_ms: number;
  /** Duration of EACH step, ms; preferred over `step_ms` when present. */
  step_durations_ms?: number[];
  /** Screen flash settings; absent on older servers. */
  flash?: FaceFlash;
  /** Minimum gap between two captured frames, ms. */
  frame_interval_ms: number;
  /** Hard cap on the total frames in one verify request. */
  max_frames: number;
};

/** One clip frame: `i` = step index, `t` = ms since filming started. */
export type FaceFrame = { i: number; t: number; image: string };

export type FaceTokens = { access_token: string; refresh_token: string; expires_in: number };

const DEVICE_HEADERS = { 'device-name': 'HRM Mobile (Face ID)', 'device-type': 'mobile' };

/** False on any failure: the button simply stays hidden. */
export async function faceLoginEnabled(): Promise<boolean> {
  try {
    const { data } = await apiClient.get<{ enabled?: boolean }>(FACE_STATUS);
    return Boolean(data?.enabled);
  } catch {
    return false;
  }
}

export async function startFaceChallenge(): Promise<FaceChallenge> {
  const { data } = await apiClient.post<FaceChallenge>(FACE_CHALLENGE);
  return data;
}

/** Sends the whole clip: base64 JPEG frames tagged with step index and time. */
export async function verifyFace(
  challengeId: string,
  frames: FaceFrame[],
  mirrored = false,
): Promise<{ tokens: FaceTokens; user: User }> {
  const { data } = await apiClient.post<FaceTokens>(
    FACE_VERIFY,
    { challenge_id: challengeId, frames, mirrored },
    { headers: DEVICE_HEADERS },
  );
  const me = await apiClient.get<User>(USER_INFO, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  return { tokens: data, user: me.data };
}

/** Backend error code → `auth.*` message key (anything else: the generic one). */
const ERROR_KEY: Record<string, string> = {
  face_not_recognized: 'auth.faceNotRecognized',
  face_liveness_failed: 'auth.faceLiveness',
  face_not_found: 'auth.faceNotFound',
  face_multiple: 'auth.faceMultiple',
  face_too_small: 'auth.faceTooSmall',
  face_login_not_allowed: 'auth.faceNotAllowed',
  face_challenge_expired: 'auth.faceExpired',
  face_frames_invalid: 'auth.faceFramesInvalid',
  face_login_unavailable: 'auth.faceUnavailable',
  face_login_disabled: 'auth.faceUnavailable',
  too_many_login_attempts: 'auth.tooManyAttempts',
};

/** `face_liveness_failed` → message by `params.reason` (unknown reason: the pose message). */
const LIVENESS_REASON_KEY: Record<string, string> = {
  spoof: 'auth.faceSpoof',
  too_fast: 'auth.faceTooFast',
  identity: 'auth.faceContinuity',
  continuity: 'auth.faceContinuity',
  pose: 'auth.faceLiveness',
  flash: 'auth.faceFlash',
};

type ErrBody = {
  code?: unknown;
  params?: { reason?: unknown };
  detail?: { code?: unknown; params?: { reason?: unknown } } | unknown;
};

export function faceErrorKey(err: unknown): string {
  const data = (err as { response?: { data?: ErrBody } })?.response?.data;
  // The code may sit at the top level or inside an object-shaped `detail`.
  const d = data?.detail && typeof data.detail === 'object' && !Array.isArray(data.detail)
    ? (data.detail as { code?: unknown; params?: { reason?: unknown } })
    : undefined;
  const code = typeof data?.code === 'string' ? data.code : typeof d?.code === 'string' ? d.code : undefined;
  if (code === 'face_liveness_failed') {
    const reason = d?.params?.reason ?? data?.params?.reason;
    return (typeof reason === 'string' && LIVENESS_REASON_KEY[reason]) || 'auth.faceLiveness';
  }
  return (code && ERROR_KEY[code]) || 'auth.faceFailed';
}
