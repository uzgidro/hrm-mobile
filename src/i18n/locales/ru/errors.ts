// Russian translation of the common API-error fallbacks.
// See uz-Latn/errors.ts for the meaning of each key.
export default {
  generic: 'Произошла ошибка',
  saveFailed: 'Ошибка при сохранении',
  sendFailed: 'Ошибка при отправке запроса',
  refreshFailed: 'Не удалось обновить данные',
  actionFailed: 'Не удалось выполнить действие',
  timeout: 'Сервер не ответил (истекло время). Действие могло выполниться — обновите список.',
  network: 'Нет соединения с интернетом. Проверьте подключение.',
} as const;
