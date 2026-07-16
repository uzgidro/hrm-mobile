// ─────────────────────────────────────────────────────────────────────────────
// LLM assistant — pure stream/marker helpers (no React, no network) so the
// tricky parts are unit-testable. The backend stream is SSE with ONLY bare
// `data:` lines: each chunk is `data: {"chunk": "...", "content": "..."}`
// (both fields carry the SAME delta) and the stream ends with `data: [DONE]`.
// Errors arrive as a normal data chunk (Uzbek text) — never an SSE error event.
// The web client parses format-agnostically; we mirror that defensiveness.
// ─────────────────────────────────────────────────────────────────────────────

// Extract the delta text from one parsed data payload. Mirrors the web's
// pickChunkText: any of these keys may carry the text depending on backend
// version; objects without any are ignored (returns '').
export function pickChunkText(payload: unknown): string {
  if (payload == null) return '';
  if (typeof payload === 'string') return payload;
  if (typeof payload !== 'object') return '';
  const p = payload as Record<string, unknown>;
  for (const key of ['content', 'chunk', 'delta', 'text', 'response', 'message', 'token']) {
    const v = p[key];
    if (typeof v === 'string' && v) return v;
  }
  return '';
}

export interface StreamParseResult {
  /** concatenated delta text extracted from complete lines */
  text: string;
  /** true once the [DONE] sentinel was seen */
  done: boolean;
  /** unconsumed tail (an incomplete line) to prepend to the next network chunk */
  rest: string;
}

// Feed one network chunk (prepended with the previous call's `rest`) and pull
// out every complete line. Handles: SSE `data: {...}` lines, SSE `data: [DONE]`,
// bare JSON lines, and plain text lines (passed through verbatim).
export function parseStreamChunk(buffer: string): StreamParseResult {
  let text = '';
  let done = false;
  const lastNL = buffer.lastIndexOf('\n');
  if (lastNL === -1) return { text: '', done: false, rest: buffer };
  const complete = buffer.slice(0, lastNL);
  const rest = buffer.slice(lastNL + 1);

  for (const rawLine of complete.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (!line.trim()) continue;
    let data = line;
    if (line.startsWith('data:')) data = line.slice(5).trim();
    if (data === '[DONE]') { done = true; continue; }
    if (data.startsWith('{') || data.startsWith('[')) {
      try {
        text += pickChunkText(JSON.parse(data));
        continue;
      } catch {
        // fall through: treat as plain text
      }
    }
    // Plain-text line (non-SSE fallback responses).
    text += data;
  }
  return { text, done, rest };
}

// ── LOAD_MORE marker ─────────────────────────────────────────────────────────
// Long tool results append `[[LOAD_MORE:<hexId>:<shown>:<total>]]` to the
// answer. v1 strips it and shows a "load more" affordance; the rows come from
// GET llm/large-lists/{id}.
const LOAD_MORE_RE = /\[\[LOAD_MORE:([A-Za-z0-9_-]+):(\d+):(\d+)\]\]/;

export interface LoadMoreMarker {
  listId: string;
  shown: number;
  total: number;
}

/** Extract the marker (or null) and the message text with the marker removed. */
export function splitLoadMoreMarker(text: string): { text: string; marker: LoadMoreMarker | null } {
  const m = LOAD_MORE_RE.exec(text);
  if (!m) return { text, marker: null };
  return {
    text: (text.slice(0, m.index) + text.slice(m.index + m[0].length)).trimEnd(),
    marker: { listId: m[1], shown: Number(m[2]), total: Number(m[3]) },
  };
}

// ── Streaming-table stabilizer ───────────────────────────────────────────────
// Mid-stream, a markdown table's first rows arrive before the `|---|`
// separator, which makes renderers flash them as plain text. Hold back a
// trailing run of pipe-lines until the separator line has arrived (web parity:
// useStabilizedStreamText). Once the separator is in the held block, or the
// stream is finished, everything is released.
export function stabilizeStreamText(text: string, isStreaming: boolean): string {
  if (!isStreaming) return text;
  const lines = text.split('\n');
  // Find the start of the trailing pipe-run.
  let i = lines.length - 1;
  // A trailing partial line (no newline yet) also counts toward the run.
  while (i >= 0 && lines[i].trimStart().startsWith('|')) i--;
  const run = lines.slice(i + 1);
  if (run.length === 0) return text;
  const hasSeparator = run.some((l) => /^\s*\|[\s:-]*-[\s|:-]*$/.test(l));
  if (hasSeparator && run.length >= 2) return text; // header+separator present → safe
  return lines.slice(0, i + 1).join('\n');
}
