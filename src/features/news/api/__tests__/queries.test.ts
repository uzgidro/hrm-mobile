import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { COMPANY_NEWS_PAGE } from '@/api/urls';
import { Env } from '@/config/env';
import { newsImageUrl, newsKeys, newsLang, newsListQuery } from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

// 2026-10-06: «Yangiliklar chiqmayapti mobilda. Webda yangiliklar barcha filiallarga birdek
// apidan ketadigan qilingan edi» — mobil ham sayt manbasidan, filial filtrisiz.
describe('kompaniya yangiliklari', () => {
  it("sayt manbasi: til bilan, 20 tadan sahifalab, filial parametri YO'Q", async () => {
    mock.onGet(COMPANY_NEWS_PAGE).reply(200, { items: [{ id: 1, title: 'A', url: 'https://uzgidro.uz/news/view/1' }], page: 1, pages: 3, size: 20 });
    const q = newsListQuery('ru');
    const r = await (q.queryFn as unknown as (c: { pageParam: number }) => Promise<{ items: unknown[]; pages: number }>)({ pageParam: 1 });
    expect(mock.history.get[0].params).toEqual({ lang: 'ru', page: 1, size: 20 });
    expect(r.items).toHaveLength(1);
    expect(q.getNextPageParam(r as never, [], 1, [])).toBe(2);
    expect(newsKeys.list('ru')).toEqual(['news', 'company', 'ru']);
  });

  it('til xaritasi va rasm manzili', () => {
    expect(newsLang('uz-Cyrl')).toBe('uz');
    expect(newsLang('ru')).toBe('ru');
    expect(newsLang('en')).toBe('en');
    expect(newsImageUrl({ image: '/dashboard/company-news/5/image' })).toBe(`${Env.apiUrl.replace(/\/$/, '')}/dashboard/company-news/5/image`);
    expect(newsImageUrl({ image: null, image_source: 'https://upload.uzgidro.uz/a.jpg' })).toBe('https://upload.uzgidro.uz/a.jpg');
    expect(newsImageUrl({})).toBeNull();
  });
});
