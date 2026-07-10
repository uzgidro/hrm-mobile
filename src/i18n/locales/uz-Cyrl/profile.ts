// Uzbek Cyrillic transliteration of the profile feature strings.
// See uz-Latn/profile.ts for the meaning of each key.
export default {
  title: 'Профил',
  userFallback: 'Фойдаланувчи',
  reference: 'Маълумотнома',
  orgFallback: 'Ташкилот',
  branchFallback: 'Жорий филиал',

  sectionAppearance: 'Кўриниш',
  sectionLanguage: 'Тил',
  sectionSettings: 'Созламалар',

  themeSystem: 'Тизим',
  themeLight: 'Ёруғ',
  themeDark: 'Тунги',

  onlySubordinates: 'Фақат бўйсунувчилар',
  onlySubordinatesHint: 'Жамоа ва рўйхатларда фақат сизга бириктирилганлар',
  changePin: 'PIN кодни ўзгартириш',
  biometrics: 'Биометрик кириш',
  biometricsHint: 'Бармоқ изи ёки юз билан тез очиш',

  logout: 'Чиқиш',
  logoutConfirm: 'Тизимдан чиқишни хоҳлайсизми?',
  logoutYes: 'Ҳа, чиқиш',

  version: 'Дастур версияси {{version}}',

  editTitle: 'Маълумотларни ўзгартириш',
  editNote: 'Иш маълумотлари (бўлим, лавозим, иш вақти) фақат кадрлар бўлими томонидан ўзгартирилади.',

  sectionPersonal: 'Шахсий',
  sectionContact: 'Контакт',
  sectionDocuments: 'Ҳужжатлар',

  fieldName: 'Ф.И.О.',
  fieldAddress: 'Манзил',
  fieldMaritalStatus: 'Оилавий ҳолати',
  fieldPhone: 'Телефон',
  fieldInternalPhone: 'Ички телефон',
  fieldPassportSeries: 'Паспорт серия',
  fieldPassportNumber: 'Паспорт рақами',
  fieldPassportIssuedBy: 'Паспорт берилган жой',
  fieldJshir: 'ЖШИР',
  fieldPinfl: 'ПИНФЛ',
  fieldInn: 'ИНН',
  fieldPensionAccount: 'Пенсия ҳисоб рақами',

  maritalStatus: {
    single: 'Турмуш қурмаган',
    married: 'Турмуш қурган',
    divorced: 'Ажрашган',
    widowed: 'Бева',
  },

  errorTitle: 'Хато',
  nameRequired: 'Ф.И.О. киритилиши шарт',
  savedTitle: 'Сақланди',
  savedMessage: 'Маълумотлар янгиланди',
  saveErrorTitle: 'Хатолик',
} as const;
