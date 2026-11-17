import type { TabelBranch } from '../tabelConfig';
import {
  builderBody,
  isColumnsCatalog,
  moveItem,
  previewHeaders,
  readTabelTemplateMeta,
  seedBuilder,
  toggleIdentity,
  type TabelTemplateColumns,
} from '../tabelTemplate';

const CATALOG: TabelTemplateColumns = {
  summary: [
    { key: 'n_leave', label: 'Mehnat ta’tili kunlari' },
    { key: 'n_present', label: 'Jami ish kunlari' },
    { key: 'hours', label: 'Jami soat' },
  ],
  identity: [
    { key: 'tabel_number', label: 'Tabel №' },
    { key: 'position', label: 'Lavozimi' },
    { key: 'name', label: 'F.I.SH.' },
  ],
  codes: [
    { key: 'annual_leave', code: 'OT', label: 'Mehnat ta’tili' },
    { key: 'holiday', code: '', label: 'Bayram kuni' },
  ],
  defaults: {
    identity: ['tabel_number', 'position'],
    summary: ['n_leave', 'n_present'],
    group_by_department: true,
    weekend_sheet: true,
    name_format: 'name',
    present: '{norm}',
    legend: true,
    codes: {},
    labels: {},
  },
};

describe('tabel template constructor', () => {
  it('seeds from the server defaults; codes: catalogue < defaults < detected < saved options', () => {
    const s = seedBuilder(CATALOG, null);
    expect(s).toMatchObject({ identity: ['tabel_number', 'position'], summary: ['n_leave', 'n_present'], group: true, weekend: true, legend: true, nameFormat: 'name', present: '{norm}' });
    expect(s.codes).toEqual({ annual_leave: 'OT', holiday: '' });
    const detected = seedBuilder(CATALOG, null, { annual_leave: 'TT', holiday: 'B' });
    expect(detected.codes).toEqual({ annual_leave: 'TT', holiday: 'B' });
    const saved = seedBuilder(CATALOG, { summary: ['hours'], codes: { annual_leave: 'X' }, labels: { hours: 'Soat' }, group_by_department: false }, { annual_leave: 'TT' });
    expect(saved.codes.annual_leave).toBe('X');
    expect(saved.summary).toEqual(['hours']);
    expect(saved.group).toBe(false);
    expect(saved.labels).toEqual({ hours: 'Soat' });
  });

  it('request body sends only codes and headers that differ from the catalogue', () => {
    const s = seedBuilder(CATALOG, null);
    s.codes = { annual_leave: ' OT ', holiday: 'B' };
    s.labels = { n_leave: 'Ta’til', n_present: 'Jami ish kunlari', hours: 'ignored (not selected)' };
    expect(builderBody(s, CATALOG)).toEqual({
      identity: ['tabel_number', 'position'],
      summary: ['n_leave', 'n_present'],
      group_by_department: true,
      weekend_sheet: true,
      name_format: 'name',
      present: '{norm}',
      legend: true,
      codes: { holiday: 'B' },
      labels: { n_leave: 'Ta’til' },
    });
  });

  it('toggles identity columns keeping catalogue order; moves summary columns', () => {
    expect(toggleIdentity(CATALOG, ['position'], 'tabel_number')).toEqual(['tabel_number', 'position']);
    expect(toggleIdentity(CATALOG, ['tabel_number', 'position'], 'position')).toEqual(['tabel_number']);
    expect(moveItem(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
    expect(moveItem(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
  });

  it('preview headers: № + F.I.SH. + chosen identity + days + renamed summary', () => {
    const s = seedBuilder(CATALOG, null);
    s.labels = { n_leave: 'Ta’til' };
    expect(previewHeaders(s, CATALOG)).toEqual(['№', 'F.I.SH.', 'Tabel №', 'Lavozimi', '1 2 3 …', 'Ta’til', 'Jami ish kunlari']);
  });

  it('an answer without the full catalogue shape (an old server) is not a catalogue', () => {
    expect(isColumnsCatalog(CATALOG)).toBe(true);
    expect(isColumnsCatalog({ detail: [{ msg: 'value is not a valid integer' }] })).toBe(false);
    expect(isColumnsCatalog({ summary: [], identity: [], codes: [] })).toBe(false);
    expect(isColumnsCatalog(null)).toBe(false);
  });

  it('reads the stored template meta: name, sheets, autodetect report, constructor options, own legend', () => {
    const branch = {
      id: 1,
      document_templates: {
        tabel: {
          file: {
            name: 'x.xlsx',
            original: 'Tabel (konstruktor).xlsx',
            sheets: ['Tabel', 'Dam olish'],
            autodetect: { sheets: [{ sheet: 'Tabel', kind: 'main', grouped: true, days_found: 30, rows_removed: 4, columns: [] }], codes: { annual_leave: 'OT' } },
            options: { summary: ['hours'] },
            own_legend: true,
          },
        },
      },
    } as unknown as TabelBranch;
    const m = readTabelTemplateMeta(branch)!;
    expect(m).toMatchObject({ original: 'Tabel (konstruktor).xlsx', sheets: ['Tabel', 'Dam olish'], ownLegend: true, options: { summary: ['hours'] } });
    expect(m.autodetect?.codes).toEqual({ annual_leave: 'OT' });
    expect(readTabelTemplateMeta({ id: 2, document_templates: null } as unknown as TabelBranch)).toBeNull();
    // An old record: no sheets / autodetect / own_legend keys.
    const old = readTabelTemplateMeta({ id: 3, document_templates: { tabel: { file: { name: 'y.xlsx' } } } } as unknown as TabelBranch)!;
    expect(old).toMatchObject({ original: 'y.xlsx', sheets: [], autodetect: null, options: null, ownLegend: false });
  });
});
