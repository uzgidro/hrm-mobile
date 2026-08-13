# Аудит дублирования кода — hrm-mobile (13.08.2026)

Метод: 6 параллельных агентов по независимым срезам (экраны / data-layer / домен / компоненты+стили / механические клоны / формы+i18n+роутинг). Каждый был слеп к находкам остальных — пересечения ниже помечены, они служат подтверждением (две независимые находки одного и того же = высокая достоверность).

Кодовая база: ~31.6k строк, `src/features` — 120 файлов / 18.4k строк.

---

## Главный вывод

**Проблема НЕ в отсутствии абстракций, а в разрыве их применения (adoption gap).**

Нужные общие компоненты уже написаны — их просто обходят стороной:

| Общий компонент/функция | Используют | Хендролят вручную |
|---|---|---|
| `src/components/ScreenHeader.tsx` | 15 файлов | **40 файлов** |
| `src/components/EmployeeAvatar.tsx` | 7 файлов | **~16 файлов** |
| `employeesListQuery()` | 1 (канон) | **6 инлайн-копий** |
| `getApiErrorMessage()` (`src/api/errors.ts`) | много | **3 хука парсят `detail` руками** |

То есть значительная часть «избыточности» лечится не новыми абстракциями, а миграцией на существующие. Это дешевле и безопаснее, чем проектировать новое.

---

## P0 — БАГ, не стилистика (чинить первым)

### B1. `authStore.ts` дублирует роль-хелперы и ломается на массиве ролей
**Файлы:** `src/store/authStore.ts:60-70` (сломанная копия) vs `src/utils/roles.ts:12-17,28-49` (канон).

`authStore` сравнивает поле напрямую:
```ts
user?.employee?.multi_org_employee_role === 'ministr'   // :61
user?.employee?.multi_org_employee_role === 'hr'        // :69
```
Но поле типизировано `string | string[]` (`src/types/index.ts:36`), и `roles.ts:12-17` `getMultiOrgRoles()` специально обрабатывает массив — с комментарием «may arrive as a string or an array depending on endpoint». CLAUDE.md прямо требует: «always resolve via `getMultiOrgRoles()`, never read the field directly».

**Последствие:** когда бэкенд отдаёт роль массивом, проверка молча даёт `false` → HR/министр теряют права. Затронуто:
- `EmployeeDetailScreen.tsx:9,36` — просмотр PII (паспорт, ЖШШИР, адрес) чужого сотрудника
- `OrderDetailView.tsx:150` — HR-действия по приказу
- `CreateOrderScreen.tsx:35` — какие поля приказа показывать
- `LeaveDetailScreen.tsx:19` — HR-обзор отпуска
- `ProjectDetailScreen.tsx:59` — удаление воркспейса

Причём в тех же файлах `isDeputy`/`isSiteMasterAdmin` импортируются **правильно** из `roles.ts` — то есть баг соседствует со здоровым кодом.

**Фикс:** удалить 3 функции из `authStore.ts`, перевести 5 импортёров на `@/utils/roles`. ~11 строк, режет риск молчаливого отказа в правах.

**Проверено вручную:** да, оба файла прочитаны, расхождение подтверждено.

---

## P1 — Массовая миграция на существующее (дёшево, много строк)

### A1. Back-header: 40 файлов хендролят вместо `ScreenHeader` ⭐ самая массовая
**Подтверждено метрикой:** `grep -rl ScreenHeader` → 15 файлов; `grep -rl chevronLeft` → 40 файлов.

Повторяемый блок (~6 строк JSX + стиль на файл):
```tsx
<View style={styles.header}>
  <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
    <Icon name="chevronLeft" size={24} color={colors.text} />
  </TouchableOpacity>
  <Text style={styles.headerTitle}>...</Text>
  <View style={{ width: 36 }} />
</View>
```

**Дрейф уже есть** — тап-таргет «назад» разъехался по приложению:
- `DocumentsListScreen.tsx:230` — `width: 32, marginLeft: -6`
- `TeamScreen.tsx:372` — `width: 36, marginRight: 4`
- `BirthdaysScreen.tsx:151` — `width: 36`
- `MyTimesheetScreen.tsx:276` — `width: 40`
- `CreateLetterScreen.tsx:258` — `padding: 4`

Существующий API: `<ScreenHeader title count? right? onBack? />` + `<HeaderAction icon onPress color? />`.

**Экономия:** ~6-8 строк × 40 ≈ 250-300 строк + единый тап-таргет.
**Риск:** низкий на большинстве экранов; create-экраны (`CreateOrderScreen`, `CreateLetterScreen`) требуют pill-кнопки «Создать» со спиннером и подзаголовка — либо расширить `ScreenHeader` (`subtitle?`, submit-слот), либо оставить эти два как есть.

### A2. Аватар с инициалами: ~16 файлов вместо `EmployeeAvatar` ⭐ (нашли 2 агента независимо)
`src/components/EmployeeAvatar.tsx` — мемоизированный, на `expo-image` с disk/memory-кэшем. Его собственный комментарий описывает ровно ту проблему, которая осталась: «Previously each screen defined its own copy and rendered a plain RN `<Image>` per list row (no caching, unmemoized)».

Используют корректно (7): `AttendanceDetailScreen`, `TeamScreen`, `PhoneDirectoryScreen`, `HolidaysScreen`, `MyDutyScreen` (+тест, +сам файл).

Хендролят (16): `HomeScreen.tsx:49-53`, `BirthdaysScreen.tsx:107-111`, `EmployeesListScreen.tsx:145-151`, `EmployeeDetailScreen.tsx:78-82`, `VisitorsListScreen.tsx:135-139`, `MyKpiScreen.tsx:113-117`, `VisitorDetailView.tsx:123-128`, `NewsScreen.tsx:29-33`, `KpiTeamScreen.tsx:122-126`, **`LeaveDetailScreen.tsx:34-43` (целый локальный компонент `EmpAvatar`)**, `WorkLeavesScreen.tsx:70-74`, `TeamLeavesScreen.tsx:164-168`, `ProfileScreen.tsx:92-96`, `ProjectFormScreen.tsx:140-144`, `ProjectDetailScreen.tsx:185-189`, `ProjectsListScreen.tsx:71-75`.

**Экономия:** ~110 строк + возврат кэширования картинок (реальный перф, не косметика — это списки).
**Риск:** низкий. Два исключения: `HomeScreen` использует 2-буквенные инициалы (нужен проп или остаётся кастомным), project-чипы меньше по размеру (проп `size` уже есть).

### A3. `unwrapList<T>` определён 5 раз (нашли 2 агента)
Байт-идентичная чистая функция:
```ts
function unwrapList<T>(data: unknown): T[] {
  return (Array.isArray(data) ? data : ((data as { items?: T[] })?.items ?? [])) as T[];
}
```
`dashboard/api/queries.ts:23`, `documents/api/queries.ts:16`, `letters/api/queries.ts:38`, `orders/api/queries.ts:32`, `leaves/api/queries.ts:21` (последняя — специализированная копия под `WorkLeave`, классический признак copy-paste-and-specialize).

Плюс **~13 мест инлайнят тот же тернарник** без хелпера, включая `TeamScreen.tsx:141` — то есть в *экране*, хотя это забота api-слоя.

**Фикс:** одна чистая функция в `src/api/response.ts` (или `src/utils/api.ts`). **Чистая → юнит-тестируемая**, что по правилу RNTL 14 особенно ценно.
**Экономия:** ~60 строк. **Риск:** минимальный, все копии идентичны.

### A4. Инлайн-переписывание `employeesListQuery` в 6 местах
Канон: `src/features/employees/api/queries.ts:33-37`. Копии: `AttendanceDetailScreen.tsx:134`, `TeamScreen.tsx:131`, `BirthdaysScreen.tsx:42-45`, `dashboard/api/queries.ts:113-115`, `ProjectFormScreen.tsx:52-54`, `leaves/api/queries.ts:81-84`.

Ключ кэша общий (`employeesQueryKey`), так что кэш не двоится — но `staleTime` и поведение могут разъехаться при тюнинге канона.
**Риск:** низкий.

### A5. Ручной парсинг `detail` вместо `getApiErrorMessage` (нарушение CLAUDE.md)
`useDecreeActions.ts:40-44`, `useLetterActions.ts:39-41`, `useCardActions.ts:33-35` — каждый переписывает разбор `response.data.detail` (включая случай массива `[{msg}]`), который `src/api/errors.ts:20-37` уже делает. CLAUDE.md: «use it in catch blocks instead of hand-parsing `detail`».
**Фикс:** однострочная замена. **Риск:** нулевой — `getApiErrorMessage(e, fallback)` принимает фича-специфичный fallback.

---

## P2 — Новые извлечения (абстракции реально нет)

### N1. `SearchBox` — 8-10 экранов (нашли 2 агента)
Идентичный блок: иконка поиска + `TextInput` + кнопка очистки при непустом вводе, плюс байт-идентичный стиль `searchBox`/`searchInput`.
`OrdersListScreen.tsx:149`, `LettersListScreen.tsx:133`, `TeamLeavesScreen.tsx:112`, `WorkLeavesScreen.tsx:221`, `KpiTeamScreen.tsx:58`, `EmployeesListScreen.tsx:88`, `PhoneDirectoryScreen.tsx:93`, `BirthdaysScreen.tsx:77` (+ Visitors, Documents).
Дрейф: `height: 44` vs `46`.
**→** `src/components/SearchBox.tsx` — `<SearchBox value onChangeText placeholder />`. Сам предикат фильтрации оставить в экранах (поля разные).
**Экономия:** ~270 строк. **Риск:** низкий, чистая презентация.

### N2. `FilterChip` — 3 копии, отличаются ТОЛЬКО именем функции
`LettersListScreen.tsx:219` (`FilterChip`), `OrdersListScreen.tsx:234` (`OrderChip`), `EmployeesListScreen.tsx:168` (`EmpChip`). Диff двух тел — только идентификатор.
**→** `src/components/FilterChip.tsx`. **Риск:** очень низкий.

### N3. `MonthNavigator` — 4 экрана + 1 вариант
`MyDutyScreen.tsx:108-115`, `MyDutyGridScreen.tsx:131-138`, `MyTimesheetScreen.tsx:113-120`, `EmployeeCalendarScreen.tsx:134-137` (+ вариант `ChairmanTasksScreen.tsx:65-73`). Стили идентичны кроме фона (`c.bg` vs `c.card` в Grid — латентная несогласованность).
**→** `src/components/MonthNavigator.tsx` — `<MonthNavigator month onChange />`. **Риск:** низкий.

### N4. `leaveStatus.ts` отсутствует — статус отпуска классифицируется 7 раз ⚠️
Для приказов есть `orderStatus.ts`, для писем `letterStatus.ts`, для тикетов `supportStatus.ts` — **для отпусков канона нет**, поэтому каждый экран изобрёл свой:
`WorkLeavesScreen.tsx:24-32`, `TeamLeavesScreen.tsx:21-32`, `LeaveDetailScreen.tsx:25-32`, `HomeScreen.tsx:28-32`, `TeamScreen.tsx:216-227` (`STATUS_MAP`), `NavRail.tsx:64` (инлайн), `leaves/utils.ts:10-16`.

**Опасное расхождение:** 6 копий — про **отображение**, а `leaves/utils.ts:10-16` — про **права** (`canActOnLeave`, `canDeleteLeave`), и она НЕ знает про `signed`/`tasdiqlangan`. То есть «pending для показа» и «pending для прав» — уже две разные семантики. Добавление нового статус-кода на бэке требует правки 7 файлов; пропуск одного = молча неверный цвет либо молча неверные права.

**→** `src/utils/leaveStatus.ts` по образцу `orderStatus.ts`: `leaveStatusMeta(status)`, `leaveStatusGroup(status)`. **Риск:** средний — надо аккуратно свести display- и permission-семантику, не расширив права. Делать отдельной задачей с тестами.

### N5. `StatusBadge` — 12 файлов
Идентичная пара стилей `badge`/`badgeText` + идентичный JSX `<View style={[styles.badge,{backgroundColor:sc.bg}]}><Text style={[styles.badgeText,{color:sc.fg}]}>`.
**→** `src/components/StatusBadge.tsx` (`label`, `kind`). **Риск:** низкий для презентации; унификацию *логики* цветов (leaves/kpi vs orders/letters) делать отдельно и осторожнее.

### N6. `FormParts.tsx` дублирован orders↔letters
`orders/components/FormParts.tsx` (53 стр.) vs `letters/components/FormParts.tsx` (46 стр.) — `Field` идентичен, `Selector` отличается только опциональным `onClear`. Третья копия `Field` — `ProfileEditScreen.tsx:213`.
**→** `src/components/FormField.tsx` (надмножество). **Риск:** низкий, чистая презентация.

### N7. Календарная сетка продублирована 3 раза
`src/components/DatePicker.tsx` (91), `src/components/DateTimePicker.tsx` (176), `src/features/leaves/components/LeaveDateTimePicker.tsx` (153). Идентичны: `WEEK_DAY_INDEXES = [1,2,3,4,5,6,0]`, расчёт сетки (`daysInMonth`/`firstDow`/`cells`), `changeHour`/`changeMinute`.

**Дрейф = латентный баг темы:** `DateTimePicker.tsx:61` использует `colors.onPrimary`, а `LeaveDateTimePicker.tsx:52` хардкодит `'#fff'` — при смене темы/контраста форк не последует.

**→** Минимум: чистый `src/utils/calendarGrid.ts` (`buildMonthCells`, `stepHour`, `stepMinute`) — **чистые функции, тестируемые**. Максимум: слить компоненты (`mode`, `minDate`).
**Риск:** средний для слияния компонентов (ручная UI-настройка, нужен визуальный QA) — сетку вынести можно сразу, слияние отдельной задачей.

### N8. i18n: `errorTitle` продублирован в 9 неймспейсах ×4 локали
`auth`, `chairman`, `leaves`, `news`, `profile`, `projects`, `visitors` (+`letters`/`orders` как `validationTitle`) — 36 лишних ключей, 34 места вызова. Написание даже разъехалось: «Xato» vs «Xatolik». Комментарий в `components.ts` сам документирует правильный паттерн («Generic labels... reuse the `common` section»).
**→** `common.errorTitle`, удалить локальные. Плюс `chairman.save`/`news.save` = `common.save` (8 лишних ключей), плюс 5 мёртвых ключей в `assistant` (20 записей).
**Риск:** низкий, но правки в 4 локалях атомарно (parity-тест).

### N9. `LetterDetailView` ≈ `OrderDetailView` ≈ `VisitorDetailView`
~550 строк общего скелета. Комментарии в коде сами признают: «Mirrors OrderDetailView (T13) 1:1» (`LetterDetailView.tsx:36`). Общее: `renderRoot`-свитч `embedded`, ветка загрузки, карточка статус+заголовок, `Section`/`KV`, карточка причины отказа. Плюс `DetailParts.tsx` в orders и letters ~90% идентичны.

**→** Извлекать **по частям** в `src/components/`: `DetailScreenShell`, `StatusHeaderCard`, `DetailSection`, `KeyValueRow`, `RejectionCard`. Бизнес-логику (trip-флоу писем, ознакомители приказов) оставить слотами.
**Риск:** средний-высокий, если пытаться слить целиком. Скелет — безопасно, экшн-бары — нет.

### N10. `OrdersListScreen` ≈ `LettersListScreen` (~200 строк)
Комментарий `LettersListScreen.tsx:92`: «Mirrors OrdersListScreen (T15) 1:1». Совпадают: табы, `actionCount`, фильтр+сортировка, чипы из данных, поиск, **эффект авто-выбора в split-view с идентичным комментарием**.

**Рекомендация агента (разделяю):** сразу вынести только **чистую** `selectSplitId(items, currentId, isSplit)` (`OrdersListScreen.tsx:103-112` / `LettersListScreen.tsx:93-102`) — она чистая, тестируемая, и уже помечена в коде как дубль. Полное слияние в generic-компонент **отложить** до появления третьего потребителя: семантика чипов/фильтров различается.

---

## Явные НЕ-находки (не рефакторить)

Ценность аудита в том числе в том, что агенты честно отвергли:

1. **`xKeys` query-key фабрики (~15 файлов)** — выглядят как дубль, но форма реально разная (`kpi` 5 веток, `timesheet` 8, `letters`/`orders` держат легаси-ключ ради обратной совместимости с комментариями-почему). Generic-фабрика **скрыла бы** эти пояснения. Оставить.
2. **Параллельная пагинация** — проверено: `fetchAllEmployees`/`fetchAllAttendanceEvents` переиспользуются везде корректно, ручных постраничных циклов в фичах **нет** (grep по `for (let page`, `page++` → 0). Здесь дисциплина работает.
3. **`canAccessPage` в табах И в экранах** — не дубль, а defense-in-depth (скрыть таб + закрыть экран от deep-link). Так и надо.
4. **`COLORS` legacy-экспорт** — миграция на `useTheme()` фактически завершена, импортёров 0. Можно просто удалить мёртвый экспорт.
5. **`letterStatus` vs `orderStatus` таблицы** — не сливать: у писем ветвление по стадиям отчёта с намеренно выверенным порядком case'ов. Общий у них `statusColor` — и он уже переиспользуется.
6. **Конфиг-массив вместо 45 `<Stack.Screen>`** — спорно: CLAUDE.md называет `_layout.tsx` единственным источником правды по навигации, а литеральные строки грепаются лучше. Не трогать без обсуждения.
7. **`Alert.alert` в `onError` (11 мест)** — не механический дубль, а **вопрос поведения**: глобальный `MutationCache.onError` уже тостит любую ошибку мутации, то есть возможно двойное уведомление. Разбираться отдельно (`skipErrorToast`), не «выносить в хелпер».

---

## Сводка и порядок работ

| # | Что | Мест | ~строк | Риск |
|---|---|---|---|---|
| **B1** | authStore role-helpers (**БАГ прав**) | 5 импортёров | ~11 | низкий фикс, высокая ценность |
| A1 | Миграция на `ScreenHeader` | 40 | ~280 | низкий |
| A2 | Миграция на `EmployeeAvatar` | 16 | ~110 | низкий (+перф) |
| A3 | `unwrapList` → общая | 5 (+13 инлайн) | ~60 | минимальный |
| A5 | `getApiErrorMessage` вместо ручного парсинга | 3 | ~15 | нулевой |
| A4 | `employeesListQuery` вместо инлайна | 6 | ~20 | низкий |
| N1 | `SearchBox` | 8-10 | ~270 | низкий |
| N2 | `FilterChip` | 3 | ~45 | очень низкий |
| N3 | `MonthNavigator` | 5 | ~55 | низкий |
| N5 | `StatusBadge` | 12 | ~30 | низкий |
| N6 | `FormField` (FormParts) | 3 | ~100 | низкий |
| N8 | i18n `common.errorTitle` + мёртвые ключи | 9 нс × 4 | 64 ключа | низкий |
| N4 | `leaveStatus.ts` (⚠️ display vs права) | 7 | ~60 | **средний** |
| N7 | `calendarGrid.ts` (+ слияние пикеров) | 3 | ~140 | средний |
| N9 | Detail-скелет по частям | 3 | ~550 | средний |
| N10 | `selectSplitId` (только чистая часть) | 2 | ~20 | низкий |

**Итого потенциально: ~1800-2000 строк** (≈6% кодовой базы), причём около половины — миграция на уже существующее.

### Рекомендуемый порядок
1. **B1** — это баг прав, а не рефакторинг. Отдельно и первым.
2. **Волна «применить существующее»**: A5 → A3 → A4 → A2 → A1. Механические, низкорисковые, дают больше половины эффекта. A1 (40 файлов) разбить на 3-4 подхода.
3. **Волна «дешёвые новые компоненты»**: N2 → N3 → N1 → N5 → N6 → N8.
4. **Волна «с головой»** (каждое — отдельная задача с тестами): N4 (семантика прав!) → N7 → N10 → N9.

### Принципы для исполнения
- Извлекать в первую очередь **чистые функции** (`src/utils/*`) — по RNTL 14 хуки не тестируются, а чистые функции тестируются, поэтому именно они дают и переиспользование, и покрытие.
- Компоненты общего пользования — только в `src/components/` (правило «нет кросс-фича импортов»).
- N10/N9: не абстрагировать два вызова в generic — ждать третьего потребителя.
- Каждая волна: TDD → ревью → коммит, отдельная ветка, без авто-мержа.
