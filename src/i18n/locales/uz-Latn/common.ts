// Shared, high-reuse labels (buttons, generic actions, generic states).
// Features should reuse these instead of re-declaring "Bekor" / "OK" etc.
export default {
  ok: 'OK',
  cancel: 'Bekor',
  save: 'Saqlash',
  delete: "O'chirish",
  edit: "O'zgartirish",
  add: "Qo'shish",
  create: 'Yaratish',
  send: 'Yuborish',
  search: 'Qidirish...',
  done: 'Tayyor',
  no: "Yo'q",
  confirm: 'Tasdiqlash',
  notFound: 'Topilmadi',
  all: 'Barchasi',
  retry: 'Qayta urinish',
  success: 'Muvaffaqiyat',
  errorTitle: 'Xatolik',
  listCount: '{{shown}} / {{total}}',
} as const;
