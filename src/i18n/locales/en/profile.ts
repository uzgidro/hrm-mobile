// English translation of the profile feature strings.
// See uz-Latn/profile.ts for the meaning of each key.
export default {
  title: 'Profile',
  userFallback: 'User',
  reference: 'Details',
  orgFallback: 'Organization',
  branchFallback: 'Current branch',

  sectionAppearance: 'Appearance',
  sectionLanguage: 'Language',
  sectionSettings: 'Settings',

  themeSystem: 'System',
  themeLight: 'Light',
  themeDark: 'Dark',

  onlySubordinates: 'Subordinates only',
  onlySubordinatesHint: 'Show only people assigned to you in the team and lists',
  changePin: 'Change PIN code',
  biometrics: 'Biometric login',
  biometricsHint: 'Quick unlock with fingerprint or face',

  logout: 'Log out',
  logoutConfirm: 'Do you want to log out?',
  logoutYes: 'Yes, log out',

  version: 'App version {{version}}',

  editTitle: 'Edit details',
  editNote: 'Work details (department, position, working hours) are changed only by the HR department.',

  sectionPersonal: 'Personal',
  sectionContact: 'Contact',
  sectionDocuments: 'Documents',

  fieldName: 'Full name',
  fieldAddress: 'Address',
  fieldMaritalStatus: 'Marital status',
  fieldPhone: 'Phone',
  fieldInternalPhone: 'Internal phone',
  fieldPassportSeries: 'Passport series',
  fieldPassportNumber: 'Passport number',
  fieldPassportIssuedBy: 'Passport issued by',
  fieldJshir: 'JSHSHIR',
  fieldPinfl: 'PINFL',
  fieldInn: 'INN',
  fieldPensionAccount: 'Pension account number',

  maritalStatus: {
    single: 'Single',
    married: 'Married',
    divorced: 'Divorced',
    widowed: 'Widowed',
  },

  errorTitle: 'Error',
  nameRequired: 'Full name is required',
  savedTitle: 'Saved',
  savedMessage: 'Details updated',
  saveErrorTitle: 'Error',
} as const;
