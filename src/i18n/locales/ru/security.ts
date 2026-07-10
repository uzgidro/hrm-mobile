// Russian translation of the security (app-lock) feature strings.
// See uz-Latn/security.ts for the meaning of each key.
export default {
  unlockTitle: 'Введите PIN-код',

  setupTitle: 'Установите PIN-код',
  setupConfirmTitle: 'Подтвердите PIN-код',
  setupSubtitle: 'Введите 4-значный PIN-код для защиты приложения',
  setupConfirmSubtitle: 'Введите PIN-код ещё раз',

  changeTitle: 'Изменить PIN-код',
  changeCurrentTitle: 'Введите текущий PIN-код',
  changeNewTitle: 'Введите новый PIN-код',
  changeConfirmTitle: 'Подтвердите новый PIN-код',
  changeSuccess: 'PIN-код изменён',

  attemptsLeft_one: 'Неверный PIN-код. Осталась {{count}} попытка.',
  attemptsLeft_few: 'Неверный PIN-код. Осталось {{count}} попытки.',
  attemptsLeft_many: 'Неверный PIN-код. Осталось {{count}} попыток.',
  mismatch: 'PIN-коды не совпадают. Попробуйте ещё раз.',

  forceLogoutTitle: 'Попытки исчерпаны',
  forceLogoutMessage: 'В целях безопасности вы вышли из системы. Войдите снова.',

  biometricPrompt: 'Подтвердите, чтобы открыть приложение',

  biometricTitle: 'Биометрический вход',
  biometricMessage: 'Разблокировать приложение отпечатком пальца или по лицу?',
  biometricLater: 'Позже',
  biometricEnable: 'Включить',
} as const;
