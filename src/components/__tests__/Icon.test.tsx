import React from 'react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { Icon, IconName } from '../Icon';

const NAMES: IconName[] = [
  'home', 'orders', 'mail', 'grid', 'user', 'users', 'bell', 'clock',
  'checklist', 'wallet', 'news', 'idcard', 'gift', 'calendar', 'sun', 'moon',
  'system', 'chevronRight', 'chevronLeft', 'arrowDown', 'arrowUp', 'plus',
  'edit', 'building', 'globe', 'logout', 'search', 'close', 'check', 'doc',
  'inbox', 'settings', 'lock', 'phone', 'chart', 'briefcase', 'cake',
  'graduation', 'target', 'eye', 'eyeOff', 'guest', 'board', 'trash',
];

describe('Icon', () => {
  it('renders an SVG tree for a glyph', async () => {
    const { toJSON } = await renderWithProviders(<Icon name="home" />);
    // The rendered tree contains an SVG view with the stroke paths.
    expect(JSON.stringify(toJSON())).toContain('RNSVGSvgView');
  });

  it('renders every named glyph without throwing', async () => {
    for (const name of NAMES) {
      const { unmount } = await renderWithProviders(<Icon name={name} size={20} color="#123456" />);
      unmount();
    }
    // Reaching here means no glyph threw during render.
    expect(NAMES).toHaveLength(44);
  });

  it('is wrapped in React.memo', () => {
    // React.memo components expose a memo $$typeof marker.
    expect((Icon as unknown as { $$typeof?: symbol }).$$typeof).toBeDefined();
  });
});
