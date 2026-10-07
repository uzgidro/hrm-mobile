import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { TABEL_CODES } from '@/api/urls';
import { tabelCodesQueryOptions, toOverrides } from '../useTabelCodes';

describe('HR tabel kodlari manbasi', () => {
  const mock = new MockAdapter(apiClient);
  afterEach(() => mock.reset());

  it("so'rov: o'z filiali (parametrsiz) yoki berilgan filial; javob → kalit:kod xaritasi", async () => {
    mock.onGet(TABEL_CODES).reply(200, { items: [{ key: 'business_trip', code: 'K', label: 'Xizmat safari' }, { key: 'absent', code: '', label: 'Kelmagan (sababsiz)' }] });
    const rows = await tabelCodesQueryOptions().queryFn();
    expect(mock.history.get[0].params).toBeUndefined();
    expect(toOverrides(rows)).toEqual({ business_trip: 'K', absent: '' });
    await tabelCodesQueryOptions(7).queryFn();
    expect(mock.history.get[1].params).toEqual({ organization_branch_id: 7 });
    expect(toOverrides(undefined)).toEqual({});
  });
});
