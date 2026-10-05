import React from 'react';
import i18n from '@/i18n';
import { renderWithProviders } from '../../test/renderWithProviders';
import { ScreenHeader } from '../ScreenHeader';
import { TabRoot } from '../TabRoot';
import { PageHeader } from '@/ui/PageHeader';

// Tablar orasida yurilgach `router.canGoBack()` true — tab ildizida ham strelka chiqardi.
jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return { ...actual, router: { ...actual.router, canGoBack: () => true, back: jest.fn() } };
});

const back = () => i18n.t('common.back');

describe('TabRoot — tab ildizida orqaga strelkasi yo‘q (Profil, Davomat…)', () => {
  it('ScreenHeader: stack ekranida strelka bor', async () => {
    const r = await renderWithProviders(<ScreenHeader title="Davomat" />);
    expect(r.queryByLabelText(back())).toBeTruthy();
  });

  it('ScreenHeader: tab ildizida strelka yo‘q (onBack berilgan bo‘lsa ham)', async () => {
    const r = await renderWithProviders(
      <TabRoot>
        <ScreenHeader title="Davomat" onBack={() => {}} />
      </TabRoot>,
    );
    expect(r.queryByLabelText(back())).toBeNull();
    expect(r.getByText('Davomat')).toBeTruthy();
  });

  it('PageHeader: orqaga yo‘l bor stack ekranida strelka bor', async () => {
    const r = await renderWithProviders(<PageHeader title="Mening tabelim" />);
    expect(r.queryByLabelText(back())).toBeTruthy();
  });

  it('PageHeader: canGoBack true bo‘lsa ham tab ildizida strelka yo‘q', async () => {
    const r = await renderWithProviders(
      <TabRoot>
        <PageHeader title="Mening tabelim" />
      </TabRoot>,
    );
    expect(r.queryByLabelText(back())).toBeNull();
    expect(r.getByText('Mening tabelim')).toBeTruthy();
  });
});
