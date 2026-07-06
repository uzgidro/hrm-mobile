# План рефакторинга HRM Mobile

Дата: 2026-07-06. Основан на аудите кодовой базы и исследовании индустриальных практик
(bulletproof-react, официальные рекомендации Expo, TkDodo/TanStack Query, Obytes starter).

## 1. Текущее состояние (аудит)

**Метрики:** app/ — 7 986 строк в 34 файлах; src/ — 2 429 строк в 20 файлах.

| Проблема | Факты |
|---|---|
| God-файлы | 13 экранов >350 строк (`order-detail` 451, `create-order` 426, `team` 419…) — запросы + бизнес-логика + UI + стили в одном файле |
| Разнобой data-fetching | 74 вызова `useQuery/useMutation` против 77 сырых `apiClient.*` в обработчиках; мутации почти нигде не через `useMutation` |
| Query keys | 40+ ad-hoc строковых ключей по экранам, централизованы только 2 (`employeesQueryKey`, `attendanceQueryKey`) |
| Обработка ошибок | 44 одинаковых `Alert.alert('Xatolik', e?.response?.data?.detail …)`; нет error boundary, toast-системы, телеметрии |
| Типизация | 70 `any` (catch-блоки, `styles: any`, `as any` на router.push) |
| Дублирование | list-boilerplate в 7 экранах; 3 create-формы на ~80% идентичны; статус-хелперы и `MONTHS_UZ`/`DAYS_UZ` переопределяются по файлам; inline-компоненты (`Card`, `EmployeeAvatar`, `LeaveCard`) внутри экранов |
| Конфигурация | `API_BASE_URL` и `ONLYOFFICE_SERVER_URL` захардкожены — нельзя переключить окружение без правки кода |
| Тесты | 0 тестов, нет jest/линтера |
| Мёртвый код | `src/hooks/useApi.ts` (`useGet`/`usePost`) — 0 использований |
| Терминология | mehmon(23)/visitor(36), loyiha(29)/project(11) — смешение в именах файлов и типов |
| QueryClient | `new QueryClient()` без `defaultOptions` (staleTime, retry) |

**Что уже хорошо (не трогаем):** single-flight refresh токена в `client.ts`; миграция темы завершена (111 `useTheme`, 0 `COLORS` в app/); чистые Zustand-сторы; нет console.log; ролевая модель централизована в `roles.ts`.

## 2. Целевая архитектура

Консенсус индустрии для Expo Router-приложений такого масштаба (~35 экранов) —
**feature-based структура, `app/` только для роутов** (официальная рекомендация Expo + bulletproof-react):

```
app/                        # ТОЛЬКО роуты — тонкие файлы 5–20 строк
  (tabs)/orders.tsx         # export default OrdersScreen (импорт из features)
src/
  features/
    orders/                 # api/ (queries+mutations), components/, screens/, utils/
    letters/
    leaves/
    attendance/
    employees/
    visitors/               # ← унифицированное имя вместо mehmon-*
    projects/               # ← вместо loyiha-*
    auth/  profile/  notifications/  dashboard/
  components/               # общие UI-примитивы (StatusBadge, EmptyState, …)
  lib/                      # apiClient, queryClient, storage, toast
  stores/                   # zustand (auth, prefs)
  config/                   # env.ts (типизированный доступ к EXPO_PUBLIC_*)
  theme/  types/  utils/
```

Ключевые правила:
- **Запрет cross-feature импортов** (композиция на уровне роутов), enforce через ESLint.
- **`queryOptions`-фабрики** per-feature (паттерн TkDodo, v5): ключ + queryFn + staleTime в одном объекте — иерархические ключи дают fuzzy-инвалидацию.
- **Все мутации через `useMutation`**; инвалидация — глобально в `MutationCache.onSuccess` через `meta: { invalidates: [...] }`.
- **Глобальные ошибки — в `QueryCache.onError`** (toast), а не 44 Alert.alert.
- **Auth через `Stack.Protected`** (доступен с SDK 53) вместо императивного `router.replace` в useEffect — убирает мигание экрана, чистит историю, блокирует deep-link на защищённые роуты.
- **Env через `EXPO_PUBLIC_*`** + EAS environments; типизированный `config/env.ts` с валидацией на старте.

## 3. Фазы реализации

Порядок выбран так, чтобы сначала подстелить сетку безопасности (тесты на чистую логику,
env, глобальные ошибки), затем делать механическую реструктуризацию, и только потом —
рискованные изменения потоков. Каждая фаза — отдельный PR (или серия), приложение
работоспособно после каждой.

### Фаза 0 — Фундамент и сетка безопасности (~2–3 дня)

1. **Тулинг**: `eslint-config-expo` + prettier; скрипты `lint`, `typecheck` (`tsc --noEmit`) в package.json.
2. **Тесты на чистую логику** (до любых перестановок!): jest-expo + первые unit-тесты на `roles.ts` (canAccessPage — критично для web parity), `orderStatus.ts`, `letterStatus.ts`, `attendance.ts`. Это страховка на весь рефакторинг.
3. **Env**: `.env.local`/`.env.example`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_ONLYOFFICE_URL`; типизированный `src/config/env.ts`; профили в `eas.json` привязать к EAS environments.
4. **QueryClient defaults**: staleTime/gcTime/retry в `defaultOptions`; `QueryCache.onError` (пока с Alert, toast в фазе 3).
5. **Удалить мёртвый код**: `src/hooks/useApi.ts`.

Критерий готовности: `npm run lint && npm run typecheck && npm test` зелёные; сборка preview работает с env.

### Фаза 1 — Структура: тонкие роуты + features (~3–5 дней, механическая)

1. Создать `src/features/*`; перенести содержимое каждого экрана из `app/*.tsx` в `features/<feature>/screens/`, в `app/` оставить re-export (5–20 строк).
2. Разнести по фичам существующие utils (`orderStatus` → `features/orders/utils` и т.д.), общие компоненты — в `src/components`.
3. Вынести дублируемые константы дат (`MONTHS_UZ`, `DAYS_UZ`, `DAYS_SHORT`) в `src/utils/date.ts`, настроить dayjs-локаль в одном месте.
4. ESLint-правило против cross-feature импортов.
5. **Терминология**: переименовать mehmon→visitors, loyiha→projects в коде/файлах фич (маршруты `app/mehmon-*` можно сохранить как алиасы, чтобы не ломать push-роутинг `routeForNotification`).

Риск: низкий (перемещения без изменения логики). Проверка — typecheck + ручной smoke всех вкладок.

### Фаза 2 — Data layer: queryOptions + мутации (~4–6 дней)

1. Per-feature `api/queries.ts` с `queryOptions`-фабриками — заменить все 40+ ad-hoc ключей. Единая карта ключей = предсказуемая инвалидация.
2. Перевести 77 сырых `apiClient.*` вызовов из обработчиков на `useMutation` (per-feature `api/mutations.ts`).
3. `MutationCache.onSuccess` + `meta.invalidates` — убрать ручные `invalidateQueries` из экранов.
4. Нормализация ошибок в axios-интерцепторе: типизированный `ApiError` с извлечением `detail` (включая массив `{msg}`) — одна функция вместо 44 копий парсинга.
5. `catch (e: any)` → `catch (e: unknown)` + `getApiErrorMessage(e)`.

Риск: средний. Мигрировать по фичам, после каждой — smoke критичных потоков (подпись приказа/письма, создание заявки).

### Фаза 3 — Ошибки и UX-обвязка (~2–3 дня)

1. Лёгкая toast-система (`src/lib/toast.ts` + host в `_layout`) — заменить Alert.alert для не-блокирующих ошибок/успехов (Alert оставить для подтверждений действий).
2. `QueryCache.onError` → toast только для фоновых refetch (когда `data !== undefined`); ошибки первичной загрузки — inline error-state.
3. Error boundary на уровне корневого layout (+ экран «Qayta urinish»).
4. Общие компоненты состояний: `<LoadingView />`, `<EmptyState />`, `<ErrorState />`, `<ScreenList />` (обёртка FlatList + pull-to-refresh) — убрать 84 inline ActivityIndicator и list-boilerplate 7 экранов.

### Фаза 4 — Auth-поток и навигация (~2–3 дня)

1. Переписать `AuthLoader` на **`Stack.Protected`**: guard по `isAuthenticated` из authStore; bootstrap (чтение токена, `auth/me`, офлайн-фолбэк на кэш) — в отдельный hook, управляющий splash screen.
2. Сохранить текущую семантику 1:1: офлайн-фолбэк на `cached_user`, logout при 401/403 — покрыто ручным чек-листом.
3. Убрать `as any` на `router.push` (typed routes уже включены) — типизированные params во всех 22 `useLocalSearchParams`.

Риск: **высокий** (вход в приложение). Делать отдельным PR, тестировать: холодный старт с/без токена, протухший refresh, офлайн-старт, deep link из push.

### Фаза 5 — Декомпозиция god-файлов (~5–8 дней, инкрементально)

Приоритет по размеру × частоте изменений:
1. `order-detail` (451) и `create-order` (426): вынести workflow-логику указов (approve/forward/register/acknowledge) в `features/orders/hooks`, пикеры подписантов — в компоненты фичи.
2. Общие form-примитивы для 3 create-форм (`useFormScreen`-паттерн: поля, PickerModal-состояние, submit+invalidate+toast).
3. `team` (419), `attendance-detail` (368): вынести секции в компоненты, расчёты цветов/статусов — в utils фичи.
4. Извлечь inline-компоненты (`EmployeeAvatar`, `StatusBadge`, `Card`) в общие.

Правило: экран ≤ ~200 строк — только композиция; логика в hooks, представление в components.

### Фаза 6 — Тесты и качество (постоянно + ~3–4 дня на установку)

1. MSW v2 для тестов data-layer (интерцепторы + нормализация ошибок гоняются по-настоящему).
2. RNTL-тесты для 3–5 сложных экранов/форм (renderWithProviders c QueryClient).
3. 3–5 Maestro-флоу для критичных путей: логин, подпись приказа, создание заявки на отпуск, гостевой QR. Опционально — запуск на EAS Workflows.
4. Снэпшот-тесты не используем (рекомендация Expo).

Целевое соотношение ~70/20/10 (unit / component / E2E).

## 4. Сознательно отложено

- **Unistyles/NativeWind/Tamagui** — текущая тема (`ThemeProvider` + `useThemedStyles`) полностью мигрирована и работает; смена styling-библиотеки не окупается. Пересмотреть только если понадобятся breakpoints/анимация темы без re-render.
- **i18n-библиотека** — приложение одноязычное (узбекский). Дешёвая подготовка: при декомпозиции экранов выносить строки в `features/*/strings.ts` — тогда будущая миграция на i18next механическая.
- **zod-валидация ответов / OpenAPI-кодоген (Orval, Hey API)** — стоит делать только если у бэкенда есть поддерживаемая OpenAPI-спека; проверить у команды бэкенда. До тех пор — ручные типы в `types/`.
- **ExperimentalStack** (Expo Router v56) — альфа, в проде не использовать.

## 5. Сквозные ограничения

- **Web parity — жёсткое требование**: `roles.ts`, видимость страниц и цепочки согласования зеркалят веб 1:1. Любое изменение этих модулей — только механический рефакторинг с тестами, без изменения поведения.
- Push-роутинг (`routeForNotification`) завязан на пути роутов — при переименованиях сохранять старые пути или обновлять маппинг синхронно с бэкендом-пейлоадами.
- Каждая фаза = независимый PR, приложение рабочее после каждого мерджа; никакого «большого взрыва».

## 6. Оценка

| Фаза | Объём | Риск |
|---|---|---|
| 0. Фундамент | 2–3 дня | низкий |
| 1. Структура | 3–5 дней | низкий |
| 2. Data layer | 4–6 дней | средний |
| 3. Ошибки/UX | 2–3 дня | низкий |
| 4. Auth/навигация | 2–3 дня | высокий |
| 5. God-файлы | 5–8 дней | средний |
| 6. Тесты | 3–4 дня + постоянно | низкий |

Итого ~4–6 недель одним разработчиком при инкрементальной поставке.

## 7. Источники

- bulletproof-react: https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md
- Expo — структура проекта: https://expo.dev/blog/expo-app-folder-structure-best-practices , https://docs.expo.dev/router/reference/src-directory/
- Expo — protected routes: https://docs.expo.dev/router/advanced/protected/ , https://expo.dev/blog/simplifying-auth-flows-with-protected-routes
- TkDodo (TanStack Query): https://tkdodo.eu/blog/the-query-options-api , https://tkdodo.eu/blog/automatic-query-invalidation-after-mutations , https://tkdodo.eu/blog/react-query-error-handling
- Expo env vars: https://docs.expo.dev/guides/environment-variables/ , https://docs.expo.dev/eas/environment-variables/
- Тестирование: https://docs.expo.dev/develop/unit-testing/ , https://docs.expo.dev/eas/workflows/examples/e2e-tests/
- Референс-стартер (тот же стек): https://starter.obytes.com/getting-started/project-structure/
