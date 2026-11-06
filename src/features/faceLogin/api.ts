// Face login (2026-11-06) — sign in with the front camera, no username/password.
//
// The server hands out a single-use challenge (front, then left/right in a
// random order); the app takes one frame per step and sends them together.
// Liveness + recognition among all employees happen on the server
// (backend services/face_login.py). Frames are not stored anywhere.
import { apiClient } from '@/api/client';
import { FACE_CHALLENGE, FACE_STATUS, FACE_VERIFY, USER_INFO } from '@/api/urls';
import type { User } from '@/types';

export type FaceStep = 'front' | 'left' | 'right';

export type FaceChallenge = { challenge_id: string; steps: FaceStep[]; expires_in: number };

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

/** Sends one JPEG (base64, no data: prefix needed) per challenge step. */
export async function verifyFace(
  challengeId: string,
  frames: { step: FaceStep; image: string }[],
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
  face_challenge_expired: 'auth.faceExpired',
  face_login_unavailable: 'auth.faceUnavailable',
  face_login_disabled: 'auth.faceUnavailable',
  too_many_login_attempts: 'auth.tooManyAttempts',
};

export function faceErrorKey(err: unknown): string {
  const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
  return (code && ERROR_KEY[code]) || 'auth.faceFailed';
}
