// Russian translation of the profile feature strings.
// See uz-Latn/profile.ts for the meaning of each key.
export default {
  title: 'Профиль',
  userFallback: 'Пользователь',
  reference: 'Справка',
  orgFallback: 'Организация',
  branchFallback: 'Текущий филиал',

  sectionAppearance: 'Оформление',
  sectionLanguage: 'Язык',
  sectionSettings: 'Настройки',

  themeSystem: 'Система',
  themeLight: 'Светлая',
  themeDark: 'Тёмная',

  onlySubordinates: 'Только подчинённые',
  onlySubordinatesHint: 'В команде и списках только закреплённые за вами',
  changePin: 'Изменить PIN-код',
  biometrics: 'Вход по биометрии',
  biometricsHint: 'Быстрый вход по отпечатку или лицу',

  logout: 'Выйти',
  logoutConfirm: 'Выйти из системы?',
  logoutYes: 'Да, выйти',

  version: 'Версия приложения {{version}}',

  editTitle: 'Изменить данные',
  editNote: 'Рабочие данные (отдел, должность, рабочее время) изменяются только отделом кадров.',

  sectionPersonal: 'Личное',
  sectionContact: 'Контакты',
  sectionDocuments: 'Документы',

  fieldName: 'Ф.И.О.',
  fieldAddress: 'Адрес',
  fieldMaritalStatus: 'Семейное положение',
  fieldPhone: 'Телефон',
  fieldInternalPhone: 'Внутренний телефон',
  fieldPassportSeries: 'Серия паспорта',
  fieldPassportNumber: 'Номер паспорта',
  fieldPassportIssuedBy: 'Кем выдан паспорт',
  fieldJshir: 'ЖШШИР',
  fieldPinfl: 'ПИНФЛ',
  fieldInn: 'ИНН',
  fieldPensionAccount: 'Номер пенсионного счёта',

  maritalStatus: {
    single: 'Не в браке',
    married: 'В браке',
    divorced: 'В разводе',
    widowed: 'Вдовец / вдова',
  },

  errorTitle: 'Ошибка',
  nameRequired: 'Необходимо указать Ф.И.О.',
  savedTitle: 'Сохранено',
  savedMessage: 'Данные обновлены',
  saveErrorTitle: 'Ошибка',
} as const;
