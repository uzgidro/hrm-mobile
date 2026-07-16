import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetch as expoFetch } from 'expo/fetch';
import { apiClient } from '@/api/client';
import { getAccessToken } from '@/api/authToken';
import { API_BASE_URL } from '@/constants';
import {
  LLM_SESSIONS,
  LLM_SESSION_DETAIL,
  LLM_SESSION_CHAT,
  LLM_SESSION_CHAT_STREAM,
  LLM_LARGE_LIST,
} from '@/api/urls';
import type { LlmChatResponse, LlmLargeListPage, LlmSession } from '@/types';
import { parseStreamChunk } from '../stream';
import { assistantKeys } from './queries';

// ── Pure request functions (unit-tested with axios-mock-adapter) ─────────────

// The web sends an Uzbek HR-assistant system prompt on create; we mirror it so
// mobile sessions behave identically (backend has no default persona override
// per session otherwise). Contract text — not translated with the UI locale.
export const DEFAULT_SYSTEM_PROMPT =
  "Siz HR tizimining yordamchisisiz. Savollarga qisqa va aniq javob bering. " +
  "Javoblarni o'zbek tilida bering.";

export async function createAssistantSession(name = 'New Chat'): Promise<LlmSession> {
  const { data } = await apiClient.post(LLM_SESSIONS, {
    name,
    system_prompt: DEFAULT_SYSTEM_PROMPT,
  });
  return data as LlmSession;
}

export async function deleteAssistantSession(sessionId: number): Promise<void> {
  await apiClient.delete(LLM_SESSION_DETAIL(sessionId));
}

// Non-stream fallback (also used when streaming is unavailable on the device).
export async function sendAssistantMessage(sessionId: number, message: string): Promise<LlmChatResponse> {
  const { data } = await apiClient.post(LLM_SESSION_CHAT(sessionId), { message });
  return data as LlmChatResponse;
}

export async function fetchLargeListPage(
  listId: string,
  offset: number,
  limit = 15,
): Promise<LlmLargeListPage> {
  const { data } = await apiClient.get(LLM_LARGE_LIST(listId), { params: { offset, limit } });
  return data as LlmLargeListPage;
}

// ── Streaming ─────────────────────────────────────────────────────────────────

export interface StreamCallbacks {
  /** called with the delta text of each parsed chunk */
  onDelta: (delta: string) => void;
}

// POST the message and stream the answer. Uses expo/fetch (WinterCG fetch with
// real ReadableStream support on native — RN's built-in fetch buffers the whole
// body). The axios client can't stream, so this goes around it with an explicit
// Bearer; a 401 here is NOT auto-refreshed — the caller falls back to
// sendAssistantMessage (whose axios path refreshes) rather than duplicating the
// single-flight refresh logic.
// Returns the full accumulated text. Throws on network/HTTP errors; an abort
// surfaces as an AbortError for the caller to swallow.
export async function streamAssistantMessage(
  sessionId: number,
  message: string,
  { onDelta }: StreamCallbacks,
  signal?: AbortSignal,
): Promise<string> {
  const token = await getAccessToken();
  const res = await expoFetch(`${API_BASE_URL}/${LLM_SESSION_CHAT_STREAM(sessionId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream, application/json, text/plain',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message }),
    signal,
  });
  if (!res.ok) throw new Error(`stream_http_${res.status}`);

  // Non-stream JSON fallback (backend may answer application/json).
  const ctype = res.headers.get('content-type') ?? '';
  if (ctype.includes('application/json')) {
    const data = (await res.json()) as LlmChatResponse & { response?: string };
    const text = data.response ?? '';
    if (text) onDelta(text);
    return text;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    // No stream body available — read as text in one go.
    const whole = await res.text();
    const { text } = parseStreamChunk(whole.endsWith('\n') ? whole : whole + '\n');
    if (text) onDelta(text);
    return text;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseStreamChunk(buffer);
    buffer = parsed.rest;
    if (parsed.text) {
      full += parsed.text;
      onDelta(parsed.text);
    }
    if (parsed.done) break;
  }
  // Flush a leftover complete-but-unterminated line.
  if (buffer.trim()) {
    const tail = parseStreamChunk(buffer + '\n');
    if (tail.text) {
      full += tail.text;
      onDelta(tail.text);
    }
  }
  return full;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useCreateAssistantSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name?: string) => createAssistantSession(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: assistantKeys.all }),
  });
}

export function useDeleteAssistantSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => deleteAssistantSession(sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: assistantKeys.all }),
  });
}
