import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import {
  WORKSPACES_LIST,
  WORKSPACE_DETAIL,
  WORKSPACE_MEMBER,
  COLUMNS_LIST,
  CARDS_LIST,
  CARD_COMPLETE,
  CARD_UNCOMPLETE,
  CARD_COMMENTS,
} from '@/api/urls';
import {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember,
  createColumn,
  createCard,
  completeCard,
  uncompleteCard,
  toggleCardComplete,
  createCardComment,
} from '../mutations';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('workspace request functions', () => {
  it('createWorkspace POSTs the payload to the list endpoint', async () => {
    mock.onPost(WORKSPACES_LIST).reply(201, { id: 10, name: 'Reja' });
    const created = await createWorkspace({ name: 'Reja' });
    expect(created).toEqual({ id: 10, name: 'Reja' });
    expect(mock.history.post[0].url).toBe(WORKSPACES_LIST);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ name: 'Reja' });
  });

  it('updateWorkspace PATCHes workspaces/:id', async () => {
    mock.onPatch(WORKSPACE_DETAIL(3)).reply(200, { id: 3 });
    const updated = await updateWorkspace(3, { name: 'B', description: 'd' });
    expect(updated).toEqual({ id: 3 });
    expect(mock.history.patch[0].url).toBe(WORKSPACE_DETAIL(3));
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ name: 'B', description: 'd' });
  });

  it('deleteWorkspace DELETEs workspaces/:id', async () => {
    mock.onDelete(WORKSPACE_DETAIL(8)).reply(204);
    await expect(deleteWorkspace(8)).resolves.toBeUndefined();
    expect(mock.history.delete[0].url).toBe(WORKSPACE_DETAIL(8));
  });
});

describe('workspace member request functions', () => {
  it('addWorkspaceMember POSTs to the member endpoint', async () => {
    mock.onPost(WORKSPACE_MEMBER(5, 12)).reply(201);
    await expect(addWorkspaceMember(5, 12)).resolves.toBeUndefined();
    expect(mock.history.post[0].url).toBe(WORKSPACE_MEMBER(5, 12));
  });

  it('removeWorkspaceMember DELETEs the member endpoint', async () => {
    mock.onDelete(WORKSPACE_MEMBER(5, 12)).reply(204);
    await expect(removeWorkspaceMember(5, 12)).resolves.toBeUndefined();
    expect(mock.history.delete[0].url).toBe(WORKSPACE_MEMBER(5, 12));
  });
});

describe('column & card request functions', () => {
  it('createColumn POSTs name + workspace_id to the columns endpoint', async () => {
    mock.onPost(COLUMNS_LIST).reply(201, { id: 1, name: 'Rejada' });
    const col = await createColumn(7, 'Rejada');
    expect(col).toEqual({ id: 1, name: 'Rejada' });
    expect(mock.history.post[0].url).toBe(COLUMNS_LIST);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ name: 'Rejada', workspace_id: 7 });
  });

  it('createCard POSTs the payload to the cards endpoint', async () => {
    mock.onPost(CARDS_LIST).reply(201, { id: 2, title: 'Vazifa' });
    const card = await createCard({ title: 'Vazifa', description: 'd', column_id: 4 });
    expect(card).toEqual({ id: 2, title: 'Vazifa' });
    expect(mock.history.post[0].url).toBe(CARDS_LIST);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ title: 'Vazifa', description: 'd', column_id: 4 });
  });

  it('completeCard POSTs to cards/:id/complete', async () => {
    mock.onPost(CARD_COMPLETE(9)).reply(200);
    await expect(completeCard(9)).resolves.toBeUndefined();
    expect(mock.history.post[0].url).toBe(CARD_COMPLETE(9));
  });

  it('uncompleteCard POSTs to cards/:id/uncomplete', async () => {
    mock.onPost(CARD_UNCOMPLETE(9)).reply(200);
    await expect(uncompleteCard(9)).resolves.toBeUndefined();
    expect(mock.history.post[0].url).toBe(CARD_UNCOMPLETE(9));
  });
});

describe('createCardComment', () => {
  it('POSTs { text } to cards/:id/comments and returns the created comment', async () => {
    mock.onPost(CARD_COMMENTS(7)).reply(201, { id: 55, text: 'Izoh', author: { legal_name: 'X' } });
    const created = await createCardComment(7, 'Izoh');
    expect(created).toEqual({ id: 55, text: 'Izoh', author: { legal_name: 'X' } });
    expect(mock.history.post[0].url).toBe(CARD_COMMENTS(7));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ text: 'Izoh' });
  });

  it('trims surrounding whitespace before sending', async () => {
    mock.onPost(CARD_COMMENTS(7)).reply(201, { id: 56 });
    await createCardComment(7, '  hello  ');
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ text: 'hello' });
  });
});

describe('toggleCardComplete', () => {
  it('hits uncomplete for an already-completed card', async () => {
    mock.onPost(CARD_UNCOMPLETE(3)).reply(200);
    await toggleCardComplete({ id: 3, is_completed: true });
    expect(mock.history.post[0].url).toBe(CARD_UNCOMPLETE(3));
  });

  it('hits complete for an incomplete card', async () => {
    mock.onPost(CARD_COMPLETE(3)).reply(200);
    await toggleCardComplete({ id: 3, is_completed: false });
    expect(mock.history.post[0].url).toBe(CARD_COMPLETE(3));
  });
});
