// Notification title + icon mapping. notificationMeta() derives a human-readable
// title from a backend notification_type code; titles are i18n-resolved at call
// time so they follow the current app language, while the type codes themselves
// are a backend contract and must stay unchanged.
import i18n from '@/i18n';
import { notificationMeta } from '../notifications';

// The backend contract: every notification_type code the client knows about,
// with the icon it must map to. If a code here is renamed, the backend push
// payload would no longer match — so this list is asserted verbatim.
const CONTRACT: { type: string; icon: string }[] = [
  { type: 'order_act_created', icon: 'orders' },
  { type: 'order_act_signed', icon: 'check' },
  { type: 'order_act_changes_requested', icon: 'edit' },
  { type: 'business_trip_created', icon: 'briefcase' },
  { type: 'business_trip_signed', icon: 'check' },
  { type: 'business_trip_stamped', icon: 'check' },
  { type: 'business_trip_rejected', icon: 'close' },
  { type: 'business_trip_report_submitted', icon: 'briefcase' },
  { type: 'business_trip_report_stamped', icon: 'briefcase' },
  { type: 'business_trip_report_approved', icon: 'check' },
  { type: 'business_trip_extension_requested', icon: 'calendar' },
  { type: 'business_trip_extension_approved', icon: 'calendar' },
  { type: 'business_trip_extension_rejected', icon: 'close' },
  { type: 'news_post_created', icon: 'news' },
  { type: 'workspace_created', icon: 'grid' },
  { type: 'workspace_updated', icon: 'grid' },
  { type: 'workspace_member_added', icon: 'users' },
  { type: 'card_created', icon: 'checklist' },
  { type: 'card_member_added', icon: 'checklist' },
  { type: 'card_completed', icon: 'check' },
  { type: 'card_rejected', icon: 'close' },
  { type: 'card_comment_created', icon: 'mail' },
  { type: 'card_comment_mention', icon: 'mail' },
  { type: 'card_deadline_approaching', icon: 'clock' },
];

describe('notificationMeta', () => {
  afterEach(async () => {
    await i18n.changeLanguage('uz-Latn');
  });

  it('maps every known notification_type code to a resolved title + icon', () => {
    for (const { type, icon } of CONTRACT) {
      const meta = notificationMeta(type);
      expect(meta.icon).toBe(icon);
      // A mapped code must resolve to a real title, never a raw catalog key
      // path and never the last-resort generic fallback.
      expect(meta.title).not.toContain('.');
      expect(meta.title).not.toBe(i18n.t('notifications.generic'));
      expect(meta.title.length).toBeGreaterThan(0);
    }
  });

  it('resolves the uz-Latn title verbatim for a known code', () => {
    expect(notificationMeta('order_act_created').title).toBe('Yangi buyruq');
    expect(notificationMeta('order_act_signed').title).toBe('Buyruq tasdiqlandi');
  });

  it('switches the resolved title when the app language changes', async () => {
    expect(notificationMeta('order_act_created').title).toBe('Yangi buyruq');

    await i18n.changeLanguage('ru');
    expect(notificationMeta('order_act_created').title).toBe('Новый приказ');

    await i18n.changeLanguage('en');
    expect(notificationMeta('order_act_created').title).toBe('New order');

    await i18n.changeLanguage('uz-Cyrl');
    expect(notificationMeta('order_act_created').title).toBe('Янги буйруқ');
  });

  it('uses a family prefix fallback for an unmapped variant of a known family', () => {
    expect(notificationMeta('order_act_something_new')).toEqual({
      title: 'Buyruq',
      icon: 'orders',
    });
    expect(notificationMeta('business_trip_future_variant')).toEqual({
      title: 'Xizmat safari',
      icon: 'briefcase',
    });
    expect(notificationMeta('card_future_variant')).toEqual({
      title: 'Vazifa',
      icon: 'checklist',
    });
  });

  it('falls back to the generic title + bell icon for a completely unknown type', () => {
    expect(notificationMeta('totally_unknown')).toEqual({
      title: 'Bildirishnoma',
      icon: 'bell',
    });
    expect(notificationMeta('')).toEqual({ title: 'Bildirishnoma', icon: 'bell' });
  });
});
