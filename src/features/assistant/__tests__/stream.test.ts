import {
  pickChunkText,
  parseStreamChunk,
  splitLoadMoreMarker,
  stabilizeStreamText,
} from '../stream';

describe('pickChunkText', () => {
  it('reads the delta from any known key (content first)', () => {
    expect(pickChunkText({ chunk: 'a', content: 'a' })).toBe('a');
    expect(pickChunkText({ delta: 'd' })).toBe('d');
    expect(pickChunkText({ text: 't' })).toBe('t');
    expect(pickChunkText({ response: 'r' })).toBe('r');
    expect(pickChunkText({ token: 'k' })).toBe('k');
  });

  it('passes strings through and ignores junk', () => {
    expect(pickChunkText('plain')).toBe('plain');
    expect(pickChunkText(null)).toBe('');
    expect(pickChunkText(42)).toBe('');
    expect(pickChunkText({ other: 1 })).toBe('');
    expect(pickChunkText({ content: '' })).toBe('');
  });
});

describe('parseStreamChunk', () => {
  it('parses backend SSE data lines (chunk/content duplicated)', () => {
    const r = parseStreamChunk('data: {"chunk": "Sal", "content": "Sal"}\n\ndata: {"chunk": "om", "content": "om"}\n\n');
    expect(r.text).toBe('Salom');
    expect(r.done).toBe(false);
    expect(r.rest).toBe('');
  });

  it('detects the [DONE] sentinel', () => {
    const r = parseStreamChunk('data: {"content": "tamom"}\n\ndata: [DONE]\n\n');
    expect(r.text).toBe('tamom');
    expect(r.done).toBe(true);
  });

  it('keeps an incomplete trailing line as rest for the next chunk', () => {
    const r1 = parseStreamChunk('data: {"content": "bir"}\ndata: {"cont');
    expect(r1.text).toBe('bir');
    expect(r1.rest).toBe('data: {"cont');
    const r2 = parseStreamChunk(r1.rest + 'ent": "ikki"}\n');
    expect(r2.text).toBe('ikki');
    expect(r2.rest).toBe('');
  });

  it('no newline at all → everything is rest', () => {
    const r = parseStreamChunk('data: {"content": "x"}');
    expect(r.text).toBe('');
    expect(r.rest).toBe('data: {"content": "x"}');
  });

  it('handles bare JSON lines and plain text lines (fallback formats)', () => {
    expect(parseStreamChunk('{"content": "json"}\n').text).toBe('json');
    expect(parseStreamChunk('oddiy matn\n').text).toBe('oddiy matn');
  });

  it('malformed JSON falls through as plain text; CR is stripped', () => {
    expect(parseStreamChunk('data: {broken\r\n').text).toBe('{broken');
  });

  it('skips empty lines', () => {
    expect(parseStreamChunk('\n\n\ndata: {"content": "a"}\n\n').text).toBe('a');
  });
});

describe('splitLoadMoreMarker', () => {
  it('extracts and strips the marker', () => {
    const { text, marker } = splitLoadMoreMarker('Jadval:\n| a |\n\n[[LOAD_MORE:ab12cd:15:80]]');
    expect(marker).toEqual({ listId: 'ab12cd', shown: 15, total: 80 });
    expect(text).toBe('Jadval:\n| a |');
    expect(text).not.toContain('LOAD_MORE');
  });

  it('null marker when absent — text untouched', () => {
    const { text, marker } = splitLoadMoreMarker('oddiy javob');
    expect(marker).toBeNull();
    expect(text).toBe('oddiy javob');
  });

  it('strips a mid-text marker too', () => {
    const { text, marker } = splitLoadMoreMarker('boshi [[LOAD_MORE:x1:5:9]] oxiri');
    expect(marker?.listId).toBe('x1');
    expect(text).toBe('boshi  oxiri');
  });
});

describe('stabilizeStreamText', () => {
  it('holds back a trailing table header until the separator row arrives', () => {
    const partial = 'Natija:\n| Ism | Foiz |';
    expect(stabilizeStreamText(partial, true)).toBe('Natija:');
  });

  it('releases once header + separator are both present', () => {
    const withSep = 'Natija:\n| Ism | Foiz |\n|---|---|';
    expect(stabilizeStreamText(withSep, true)).toBe(withSep);
  });

  it('passes everything through when not streaming', () => {
    const partial = 'Natija:\n| Ism | Foiz |';
    expect(stabilizeStreamText(partial, false)).toBe(partial);
  });

  it('leaves non-table text alone mid-stream', () => {
    expect(stabilizeStreamText('shunchaki matn', true)).toBe('shunchaki matn');
  });

  it('separator variants with colons/spaces count as separators', () => {
    const t = '| a | b |\n| :--- | ---: |\n| 1 | 2 |';
    expect(stabilizeStreamText(t, true)).toBe(t);
  });
});
