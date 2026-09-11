// Russian translation of the common API-error fallbacks.
// See uz-Latn/errors.ts for the meaning of each key.
export default {

  // Server `code` -> text. `src/api/errors.ts` looks these up BEFORE falling
  // back to the server's own sentence, which is always Uzbek.
  forbidden: 'Нет доступа',
  not_authorized: 'У вас нет прав на это действие',
  extension_not_later: 'Новая дата возвращения должна быть позже текущей',
  not_found: 'Не найдено',
  invalid_addressee: 'Адресатом должен быть руководитель или кадры — выберите из списка',
  invalid_management_signer: 'Выбранный сотрудник не относится к руководству этого филиала',
  letter_author_required: 'Выберите автора документа',
  signer_not_found: 'Выбранный адресат не найден',
  not_home_branch_hr: 'Возвращение подтверждают только кадры своего филиала',
  trip_finalized: 'Командировка завершена — изменить нельзя',
  trip_not_registered: 'Командировка ещё не зарегистрирована',
  employee_required: 'Для этого действия нужна карточка сотрудника',
  no_branch: 'К учётной записи не привязан филиал',
  validation_error: 'Введённые данные некорректны',
  invalid_date_range: 'Некорректный диапазон дат',
  search_too_long: 'Слишком длинный поисковый запрос',
  generic: 'Произошла ошибка',
  saveFailed: 'Ошибка при сохранении',
  sendFailed: 'Ошибка при отправке запроса',
  refreshFailed: 'Не удалось обновить данные',
  actionFailed: 'Не удалось выполнить действие',
} as const;
