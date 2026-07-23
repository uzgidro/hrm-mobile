import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { NEWS_POSTS } from '@/api/urls';
import { createNewsPost } from '../mutations';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('createNewsPost', () => {
  it('POSTs { title, description, organization_branch_id } and returns the created post', async () => {
    mock.onPost(NEWS_POSTS).reply(201, { id: 5, title: 'Yangilik' });
    const created = await createNewsPost({ title: 'Yangilik', description: 'matn', organization_branch_id: 3 });
    expect(created).toEqual({ id: 5, title: 'Yangilik' });
    expect(mock.history.post[0].url).toBe(NEWS_POSTS);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      title: 'Yangilik', description: 'matn', organization_branch_id: 3,
    });
  });

  it('trims the title and normalizes an empty description / branch to null', async () => {
    mock.onPost(NEWS_POSTS).reply(201, { id: 6 });
    await createNewsPost({ title: '  Yangilik  ', description: '  ', organization_branch_id: null });
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      title: 'Yangilik', description: null, organization_branch_id: null,
    });
  });
});
