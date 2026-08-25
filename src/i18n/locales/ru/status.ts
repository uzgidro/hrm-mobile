// Russian translation of the status namespace. Keep the key set identical to
// uz-Latn/status.ts (a parity test enforces this).
export default {
  // ── Order-act (decree) statuses ─────────────────────────────────────────────
  orderDraft: 'Черновик',
  orderPendingApproval: 'Ожидает согласования',
  orderPendingSubmitter: 'На подтверждении вводящего',
  orderPendingLeadership: 'Ожидает подписи руководства',
  orderPendingChancellery: 'Ожидает канцелярию',
  orderApproved: 'Согласовано',
  orderConfirmed: 'Зарегистрировано',
  orderApplied: 'Применено',
  orderChangesRequested: 'Запрошены изменения',
  orderRejected: 'Отклонено',
  orderPending: 'Ожидается',
  orderSigned: 'Подписано',

  // ── Letter type labels ──────────────────────────────────────────────────────
  letterTypeNotification: 'Уведомление',
  letterTypeApplication: 'Заявление',
  letterTypeBusinessTrip: 'Командировка',
  letterTypeDefault: 'Письмо',

  // ── Letter statuses ─────────────────────────────────────────────────────────
  letterRejected: 'Отклонено',
  letterRegistered: 'Зарегистрировано',
  letterPendingRegistration: 'Ожидает регистрации',
  letterPendingAgreement: 'На согласовании',
  letterCancelled: 'Отменено',
  letterSignedStatus: 'Подписано',
  letterInChancellery: 'В канцелярии',
  letterInLeadership: 'У руководства',
  letterPending: 'Ожидается',
  letterTripArrived: 'Ожидается отчёт',
  letterTripOngoing: 'Командировка продолжается',
  letterTripLeadershipPending: 'Ожидает утверждения руководителя',
  letterTripGuvohnomaReview: 'На утверждении гувохномы',
  letterTripExtensionReview: 'Ожидает утверждения продления',
  letterReportSubmitted: 'Отчёт отправлен',
  letterReturned: 'Возвращён',
  letterReportReturned: 'Отчёт возвращён',
  letterReportReview: 'Отчёт у руководства',
  letterReportApproved: 'Завершено',

  // ── Signing-timeline status texts ───────────────────────────────────────────
  timelineApproved: 'Утвердил',
  timelineSigned: 'Подписал',
  timelineAgreed: 'Согласен',
  timelineRejected: 'Отклонил',
  timelinePending: 'Ожидается',

  // ── Timeline role fallbacks ─────────────────────────────────────────────────
  roleLeadership: 'Руководство',
  roleChief: 'Начальник',
  roleCoordinator: 'Согласующий',
  roleSigner: 'Подписант',

  // ── Order category translations ─────────────────────────────────────────────
  categoryLeave: 'Трудовой отпуск',
  categoryBusinessTrip: 'Командировка',
  categorySickLeave: 'Больничный лист',
  categoryDefault: 'Приказ',

  // ── Shared fallbacks ────────────────────────────────────────────────────────
  unknown: 'Неизвестно',
  noPosition: 'Должность не указана',
} as const;
