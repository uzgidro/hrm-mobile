import {
  fileExt,
  fileSize,
  insertMention,
  jobRows,
  mentionIds,
  mentionQuery,
  mentionablePeople,
  opensInViewer,
  rootTone,
  stepTone,
  subtree,
  treeOrder,
  type ChronoStep,
} from '../utils/chrono';

const step = (id: number, parent: number | null, extra: Partial<ChronoStep> = {}): ChronoStep => ({
  id,
  title: `Ish ${id}`,
  deadline: '2026-11-10',
  original_deadline: '2026-11-10',
  status: 'active',
  parent_id: parent,
  depth: 0,
  children_total: 0,
  children_done: 0,
  blocked: false,
  late_days: 0,
  own_late_days: 0,
  inherited_days: 0,
  on_critical_path: false,
  extensions: [],
  ...extra,
});

describe('stepTone / rootTone', () => {
  it('reads a job the way the web tree does', () => {
    expect(stepTone({ status: 'approved', late_days: 3, blocked: false })).toBe('done');
    expect(stepTone({ status: 'submitted', late_days: 0, blocked: false })).toBe('review');
    expect(stepTone({ status: 'returned', late_days: 0, blocked: false })).toBe('returned');
    expect(stepTone({ status: 'returned', late_days: 2, blocked: false })).toBe('late');
    expect(stepTone({ status: 'active', late_days: 1, blocked: true })).toBe('late');
    expect(stepTone({ status: 'active', late_days: 0, blocked: true })).toBe('waiting');
    expect(stepTone({ status: 'active', late_days: 0, blocked: false })).toBe('active');
  });

  it('reads the main job', () => {
    expect(rootTone({ completed_at: '2026-10-01', submitted_at: null, delay_days: 4, jobs_open: 0 })).toBe('done');
    expect(rootTone({ completed_at: null, submitted_at: 'x', delay_days: 0, jobs_open: 0 })).toBe('review');
    expect(rootTone({ completed_at: null, submitted_at: null, delay_days: 2, jobs_open: 1 })).toBe('late');
    expect(rootTone({ completed_at: null, submitted_at: null, delay_days: 0, jobs_open: 1 })).toBe('waiting');
    expect(rootTone({ completed_at: null, submitted_at: null, delay_days: 0, jobs_open: 0 })).toBe('active');
  });
});

describe('treeOrder', () => {
  it('numbers the tree depth-first and keeps orphans and loops', () => {
    const rows = treeOrder([
      { id: 'b', parent: null },
      { id: 'a1', parent: 'a' },
      { id: 'a', parent: null },
      { id: 'a1x', parent: 'a1' },
      { id: 'orphan', parent: 'missing' },
    ]);
    expect(rows.map((r) => `${r.number}:${r.item.id}@${r.depth}`)).toEqual([
      '1:b@0',
      '2:a@0',
      '2.1:a1@1',
      '2.1.1:a1x@2',
      '3:orphan@0',
    ]);
    const loop = treeOrder([
      { id: 'x', parent: 'y' },
      { id: 'y', parent: 'x' },
    ]);
    expect(loop.map((r) => r.number)).toEqual(['?', '?']);
  });

  it('subtree() is a job and everything under it', () => {
    const items = [
      { id: 'a', parent: null },
      { id: 'b', parent: 'a' },
      { id: 'c', parent: 'b' },
      { id: 'd', parent: null },
    ];
    expect([...subtree(items, 'a')].sort()).toEqual(['a', 'b', 'c']);
    expect([...subtree(items, 'd')]).toEqual(['d']);
  });

  it('jobRows() orders the server steps as an outline', () => {
    const rows = jobRows({ steps: [step(3, 1), step(1, null), step(2, null)] });
    expect(rows.map((r) => [r.number, r.step.id, r.depth])).toEqual([
      ['1', 1, 0],
      ['1.1', 3, 1],
      ['2', 2, 0],
    ]);
  });
});

describe('mentions', () => {
  const people = [
    { id: 7, legal_name: 'Aliyev Vali' },
    { id: 8, legal_name: 'Karimova Nodira' },
  ];

  it('finds the @word before the caret', () => {
    expect(mentionQuery('salom @Ali', 10)).toBe('Ali');
    expect(mentionQuery('@', 1)).toBe('');
    expect(mentionQuery('email@site', 10)).toBeNull();
    expect(mentionQuery('salom', 5)).toBeNull();
  });

  it('inserts the full name and keeps only names still in the text', () => {
    const r = insertMention('tekshiring @Ali bugun', 15, 'Aliyev Vali');
    expect(r.text).toBe('tekshiring @Aliyev Vali  bugun');
    expect(r.caret).toBe('tekshiring @Aliyev Vali '.length);
    expect(mentionIds(r.text, people)).toEqual([7]);
    expect(mentionIds('hech kim', people)).toEqual([]);
  });

  it('lists the members, the main executor and every executor once', () => {
    const got = mentionablePeople({
      members: [{ id: 1, legal_name: 'A' }],
      main_executor: { id: 2, legal_name: 'B' },
      steps: [step(1, null, { assignee: { id: 1, legal_name: 'A' } }), step(2, null, { assignee: { id: 3, legal_name: 'C' } })],
    });
    expect(got.map((p) => p.id).sort()).toEqual([1, 2, 3]);
  });
});

describe('files', () => {
  it('opens office files in the viewer and downloads the rest', () => {
    expect(fileExt('Hisobot.XLSX')).toBe('xlsx');
    expect(opensInViewer('a.pdf')).toBe(true);
    expect(opensInViewer('b.docx')).toBe(true);
    expect(opensInViewer('c.zip')).toBe(false);
    expect(opensInViewer('d.rar')).toBe(false);
    expect(opensInViewer('noext')).toBe(false);
    expect(fileSize(0)).toBe('');
    expect(fileSize(2048)).toBe('2 KB');
    expect(fileSize(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});
