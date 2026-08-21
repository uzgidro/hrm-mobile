import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { NEWS_POSTS, ORGANIZATION_BRANCHES } from '@/api/urls';
import NewsScreen from '../screens/NewsScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

// `GET news-posts` FAQAT `organization_branch_id` beradi (nom ham, muallif ham
// yo'q) — web NewsPage nomni filiallar ro'yxatidan qidiradi. Mobilда bu
// bo'lmagani uchun filialga yo'naltirilgan yangilik ham "Barcha xodimlarga"
// deb ko'rinardi.
describe('NewsScreen — filial yorlig\'i', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(() => {
    useAuthStore.setState({
      user: { type: 'employee', employee: { id: 1, legal_name: 'X' } },
      isAuthenticated: true,
    } as never);
  });
  afterEach(() => mock.reset());

  it("filial nomini filiallar ro'yxatidan oladi, filialsizga fallback qo'yadi", async () => {
    mock.onGet(NEWS_POSTS).reply(200, [
      { id: 1, title: 'Filial yangiligi', description: 'A', created_at: '2026-05-12T10:00:00', organization_branch_id: 20 },
      { id: 2, title: 'Umumiy', description: 'B', created_at: '2026-05-11T10:00:00', organization_branch_id: null },
    ]);
    mock.onGet(ORGANIZATION_BRANCHES).reply(200, [{ id: 20, name: '"Qamchiq GES" filiali' }]);

    const { findByText, queryByText } = await renderWithProviders(<NewsScreen />);

    expect(await findByText('"Qamchiq GES" filiali')).toBeTruthy();
    expect(await findByText('Barcha xodimlarga')).toBeTruthy();
    // Backend muallif bermaydi — soxta "Admin" muallifi ko'rsatilmaydi.
    expect(queryByText('Admin')).toBeNull();
  });
});
