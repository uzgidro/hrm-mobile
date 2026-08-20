// Notification title + icon mapping. notificationMeta() derives a human-readable
// title from a backend notification_type code; titles are i18n-resolved at call
// time so they follow the current app language, while the type codes themselves
// are a backend contract and must stay unchanged.
import i18n from '@/i18n';
import { notificationMeta, routeForNotification } from '../notifications';

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
  { type: 'kpi_task_submitted', icon: 'checklist' },
  { type: 'kpi_task_confirmed', icon: 'check' },
  { type: 'kpi_task_rejected', icon: 'close' },
  { type: 'work_leave_requested', icon: 'calendar' },
  { type: 'work_leave_signed', icon: 'check' },
  { type: 'work_leave_rejected', icon: 'close' },
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

  it('uses the kpi family fallback for an unmapped kpi_* variant', () => {
    expect(notificationMeta('kpi_future_variant')).toEqual({ title: 'KPI', icon: 'target' });
  });
});

// KPI deep-links. The backend push payload is {type: kpi_task_*, kpi_entry_id};
// the in-app notification row carries the same kpi_entry_id FK.
describe('routeForNotification — kpi', () => {
  it('opens the entry detail when kpi_entry_id is present (push and in-app shapes)', () => {
    expect(routeForNotification({ type: 'kpi_task_submitted', kpi_entry_id: 5 })).toBe('/kpi-entry?id=5');
    expect(routeForNotification({ notification_type: 'kpi_task_confirmed', kpi_entry_id: 7 })).toBe('/kpi-entry?id=7');
  });

  it('falls back to the scorecard for a kpi type without an entry id', () => {
    expect(routeForNotification({ type: 'kpi_task_rejected' })).toBe('/kpi');
  });

  it('does not affect non-kpi routes', () => {
    expect(routeForNotification({ type: 'order_act_created', order_act_id: 3 })).toBe('/order-detail?id=3');
    expect(routeForNotification({ type: 'totally_unknown' })).toBeNull();
  });
});


// Ruxsat/otgul (work_leave) deep-links. The backend used to send
// {type: 'new_leave' | 'leave_signed' | 'leave_rejected', work_leave_id} — codes
// this router had never heard of, so tapping the push did nothing. Both sides
// now speak `work_leave_*` and the id opens the request card.
describe('routeForNotification — work_leave', () => {
  it('opens the leave detail when work_leave_id is present', () => {
    expect(routeForNotification({ type: 'work_leave_signed', work_leave_id: 42 })).toBe(
      '/leave-detail?id=42'
    );
    expect(
      routeForNotification({ notification_type: 'work_leave_requested', work_leave_id: 7 })
    ).toBe('/leave-detail?id=7');
  });

  it('falls back to the leave list for a work_leave type without an id', () => {
    expect(routeForNotification({ type: 'work_leave_rejected' })).toBe('/work-leaves');
  });

  it('does not shadow other deep-links', () => {
    expect(
      routeForNotification({ type: 'order_act_created', order_act_id: 3, work_leave_id: 9 })
    ).toBe('/order-detail?id=3');
  });
});

// 2026-08-19 da backendga qo'shilgan turlar. Ular xaritada bo'lmasa, xabar
// "Bildirishnoma" degan umumiy sarlavha bilan chiqardi va bosilganda hech
// qayerga olib bormasdi.
describe('yangi bildirishnoma turlari (2026-08-19)', () => {
  it('safar turlari o\'z sarlavhasini oladi', () => {
    expect(notificationMeta('trip_return_confirm_prompt').title).toBe('Safar yakunlandimi?');
    expect(notificationMeta('trip_self_finished').title).toBe('Xodim safarni yakunladi');
    expect(notificationMeta('trip_return_confirm_prompt').icon).toBe('briefcase');
  });

  it('tibbiy ko\'rik / buyruq muddati / mehmon / zoom turlari xaritada bor', () => {
    for (const type of [
      'medical_checkup_due', 'medical_checkup_due_hr', 'medical_result_recorded',
      'hr_order_soon', 'hr_order_expired', 'visitor_arrived', 'zoom_decision',
      'navbatchilik_assigned',
    ]) {
      expect(notificationMeta(type).title).not.toBe('Bildirishnoma');
    }
  });

  it('safar so\'rovi letter_id bilan xat tafsilotiga, idsiz ro\'yxatga boradi', () => {
    expect(routeForNotification({ type: 'trip_return_confirm_prompt', letter_id: 12 })).toBe(
      '/letter-detail?id=12'
    );
    // In-app qatorda letter_id bo'lmasligi mumkin — xatlar ro'yxatiga tushamiz
    // ('business_trip' prefiksi bu turlarga to'g'ri kelmaydi).
    expect(routeForNotification({ notification_type: 'trip_self_finished' })).toBe('/(tabs)/letters');
  });

  it('mehmon / texnik yordam / buyruq muddati turlari o\'z ekraniga boradi', () => {
    expect(routeForNotification({ type: 'visitor_arrived' })).toBe('/(tabs)/mehmonlar');
    expect(routeForNotification({ type: 'support_ticket_message' })).toBe('/texnik-yordam');
    expect(routeForNotification({ type: 'hr_order_soon' })).toBe('/work-leaves');
  });
});


// 2026-08-20 auditi: bildirishnoma RO'YXATI (in-app) backenddan letter_id,
// support_ticket_id, card_id, workspace_id bilan keladi, lekin mijoz ularning
// bir qismini o'qimasdi — loyiha/vazifa bildirishnomasi bosilganda hech qayerga
// olib bormasdi (ekranlar esa BOR), texnik yordam esa ro'yxatga tushardi.
describe("routeForNotification — loyiha / texnik yordam / xat", () => {
  it('loyiha vazifasini KARTA tafsilotiga, loyihani loyiha tafsilotiga ochadi', () => {
    expect(routeForNotification({ type: 'card_member_added', card_id: 12 })).toBe('/loyiha-card-detail?id=12');
    expect(routeForNotification({ type: 'workspace_member_added', workspace_id: 3 })).toBe('/loyiha-detail?id=3');
  });

  it("id bo'lmasa loyihalar ro'yxatiga tushadi (avval null edi)", () => {
    expect(routeForNotification({ type: 'workspace_deleted' })).toBe('/loyihalar');
    expect(routeForNotification({ type: 'card_deadline_approaching' })).toBe('/loyihalar');
  });

  it('texnik yordam murojaatini TAFSILOTGA ochadi', () => {
    expect(routeForNotification({ type: 'support_ticket_message', support_ticket_id: 9 }))
      .toBe('/texnik-yordam-detail?id=9');
    expect(routeForNotification({ type: 'support_ticket_created' })).toBe('/texnik-yordam');
  });

  it("xat turlari uchun zaxira yo'nalish — bildirgi va arizalar ro'yxati", () => {
    expect(routeForNotification({ type: 'letter_registered', letter_id: 4 })).toBe('/letter-detail?id=4');
    expect(routeForNotification({ type: 'letter_agreement_requested' })).toBe('/(tabs)/letters');
  });
});

describe('notificationMeta — nomsiz qolgan oilalar', () => {
  it("xat / texnik yordam / avtopark / tibbiy ko'rik uchun umumiy sarlavha bor", () => {
    // Avval bularning hammasi "Bildirishnoma" bo'lib chiqardi.
    expect(notificationMeta('letter_something_new').title).not.toBe(notificationMeta('totally_unknown').title);
    expect(notificationMeta('support_ticket_something').title).not.toBe(notificationMeta('totally_unknown').title);
    expect(notificationMeta('vehicle_something').title).not.toBe(notificationMeta('totally_unknown').title);
    expect(notificationMeta('medical_something').title).not.toBe(notificationMeta('totally_unknown').title);
  });

  it("eng ko'p uchraydigan turlar aniq sarlavhaga ega", () => {
    expect(notificationMeta('letter_agreement_requested').title).toBe("Kelishuv so'raldi");
    expect(notificationMeta('pending_action_digest').title).toBe('Sizni kutayotgan hujjatlar');
  });
});
