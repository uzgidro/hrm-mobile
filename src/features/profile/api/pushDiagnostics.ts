// Push diagnostics data layer (pure request functions, tested with
// axios-mock-adapter). The screen composes these with the device-side checks
// from `services/notifications`.
import { apiClient } from '@/api/client';
import { PUSH_TOKENS_ME, PUSH_TOKENS_TEST } from '@/api/urls';

export interface ServerPushDevice {
  platform?: string | null;
  token_tail?: string | null;
  updated_at?: string | null;
}
export interface ServerPushTokens {
  count: number;
  tokens: ServerPushDevice[];
}

export function fetchMyPushTokens(): Promise<ServerPushTokens> {
  return apiClient.get<ServerPushTokens>(PUSH_TOKENS_ME).then((r) => r.data);
}

export function sendTestPush(): Promise<{ ok: boolean; tokens: number }> {
  return apiClient.post<{ ok: boolean; tokens: number }>(PUSH_TOKENS_TEST).then((r) => r.data);
}
