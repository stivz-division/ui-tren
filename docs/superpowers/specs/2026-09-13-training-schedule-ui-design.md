# Интерфейс недельного расписания тренировок — дизайн

## Цель

Реализовать mobile-first Telegram Mini App на существующем Nuxt 4 scaffold: главную с состояниями тренировки и отдыха, список программ, создание, просмотр, редактирование и удаление программы, а также запуск активной тренировочной сессии. Выполнение самой сессии остаётся за границами задачи.

## Границы и подтверждённые зависимости

- Laravel API остаётся неизменным и является источником истины.
- Production UI загружает каталог через `GET /api/exercises` с `{ data: Array<{ id: number; name: string }> }` и не содержит статических названий или идентификаторов.
- При временной недоступности каталога создание и добавление упражнений показывают действие повторной загрузки. Уже сохранённые `exercise_id` отображаются безопасной подписью `Упражнение №<id>`, если имя не удалось разрешить.
- Mock-каталог используется только в unit/component/E2E tests. Production bundle не содержит продуктового статического каталога.
- После успешного `PUT /api/workout-sessions/active` приложение открывает минимальный route активной сессии, отображающий authoritative response. Полный сценарий выполнения не входит в эту реализацию.

## Архитектурное решение

Используется закреплённая проектом схема Structured Modules — Vertical Slices.

- `app/pages` содержит только route composition.
- `app/features/auth` управляет Telegram bootstrap и повторной аутентификацией.
- `app/features/training-programs` содержит компоненты, form model, mappings, query/mutation orchestration и feature API.
- `app/features/workout-sessions` содержит только запуск сессии и экран передачи управления будущему сценарию выполнения.
- `app/components/ui` содержит shell, navigation и header без предметных зависимостей.
- `shared/types` хранит wire DTO; editable draft отделён от API response.
- `server/api` реализует узкий same-origin BFF и не принимает произвольный upstream URL.

Дополнительный state framework не добавляется. Nuxt `useState`, `useAsyncData`, keyed refresh и небольшие composables достаточны для auth lifecycle, query cache, form drafts и scroll restoration.

## Аутентификация и BFF

Выбран same-origin BFF вместо прямого CSR-доступа:

1. Client-only Telegram adapter читает `window.Telegram.WebApp.initData`, вызывает `ready()` после готовности shell и передаёт строку в `POST /api/auth` Nuxt.
2. Nuxt вызывает Laravel `POST /api/auth` через server-only `runtimeConfig.apiBase`.
3. Полученный Bearer token сохраняется в server-managed `HttpOnly`, `Secure` в production, `SameSite=Lax` cookie. Ответ браузеру не содержит token.
4. Feature-клиенты вызывают только same-origin `/api/api-tren/...`; proxy разрешает фиксированный набор training-program, exercise-catalog и active-session путей.
5. При `401` BFF очищает cookie. Client auth coordinator выполняет один повторный Telegram bootstrap и один retry исходного запроса; повторный `401` становится пользовательской ошибкой без цикла.

Это осознанное отклонение от требования держать token в JavaScript memory. Оно уменьшает поверхность XSS-кражи token и соответствует `.ai-factory/ARCHITECTURE.md`. `initData`, Bearer token и auth request body никогда не логируются.

Имя Telegram-пользователя берётся из `initDataUnsafe.user.first_name` только для приветствия. Эти данные не участвуют в аутентификации или авторизации; при отсутствии имени используется приветствие без имени.

## Маршруты и навигация

- `/` — главная.
- `/programs` — список программ.
- `/programs/new` — создание.
- `/programs/:id` — просмотр.
- `/programs/:id/edit` — редактирование.
- `/workout-session` — минимальный экран принятой от backend active session.

`AppShell` ограничивает контент шириной 480 px, учитывает `safe-area-inset-*`, использует `min-height: 100dvh` и резервирует место под fixed bottom navigation. Навигация видна только на двух верхнеуровневых routes и содержит «Главная» и «Программа». Активная вкладка выделяется иконкой и подписью.

Detail/create/edit routes открываются как полноэкранные route-поверхности с явной кнопкой «Назад». Telegram BackButton синхронизируется с router и modal sheet.

## Server state и data flow

`useTrainingPrograms` загружает `GET /api/training-programs`, нормализует envelope и сортирует данные по `weekday`. Одна query-state модель различает `idle`, `pending`, `success` и `error`; loading skeleton резервирует высоту карточек.

После create/update/delete обновляется единый cache key программ:

- create добавляет authoritative response и сортирует список;
- update заменяет сущность ответом backend;
- delete удаляет сущность после `204` и выполняет фоновый refresh;
- conflict `training_program_already_exists` сохраняет draft и обновляет список занятых дней;
- неизвестный outcome mutation не применяется оптимистически.

Главная вычисляет текущий weekday и локализованную дату через единственную константу `APP_TIME_ZONE = 'Europe/Moscow'`. Чистый helper ищет следующую программу по циклическому расстоянию `1..6`, поэтому переход воскресенье → понедельник корректен.

## Editable form model

Create и edit используют один `ProgramForm` и один типизированный draft:

```ts
interface ProgramDraft {
  weekday: Weekday | null
  name: string
  exercises: ExerciseDraft[]
}

interface ExerciseDraft {
  key: string
  exerciseId: number | null
  sets: SetDraft[]
}

interface SetDraft {
  key: string
  repetitions: string
  workingWeightKg: string
}
```

Строковые numeric fields сохраняют промежуточный пользовательский ввод. Mapper принимает точку и запятую, проверяет целое `repetitions >= 1`, вес `0..1_000_000_000` максимум с двумя decimal знаками и создаёт JSON number только после успешной validation.

Create payload содержит `weekday`, `name`, ordered `exercises` и ordered `sets` без `position`. Edit payload содержит только `name` и полностью заменяющий список `exercises`; `weekday` read-only и в payload не попадает.

Добавление подхода клонирует заполненные значения предыдущей строки, иначе добавляет пустые строки. Упражнение всегда имеет `1..100` подходов. Последняя строка не удаляется. Duplicate exercise не выбирается. Native drag-and-drop дополняется кнопками «Переместить выше/ниже» с доступными labels и live announcement.

Draft хранится через route-keyed `useState` до успешного submit или подтверждённого discard. Navigation guard, browser unload и Telegram BackButton запрашивают подтверждение при dirty-state. Возврат на список восстанавливает scroll position.

## Представление программ

`GroupedSetSummary` группирует только соседние sets с одинаковыми `repetitions` и нормализованным весом. Вес форматируется без `.0`, максимум с двумя decimal знаками. Получившиеся группы соединяются `, `.

Карточки программ показывают только созданные программы. Названия упражнений разрешаются через catalog lookup; при недоступности каталога используется нейтральный fallback по `exercise_id`, не являющийся product catalog.

Главная имеет два взаимоисключающих состояния:

- today program: «Сегодня тренировка», название, число упражнений, CTA запуска и компактная следующая программа;
- rest day: «Сегодня отдыхаем», пояснение и ближайшая будущая программа с относительной датой.

Ни один экран не показывает длительность тренировки, калории, streaks или аналитику.

## Удаление

`DeleteProgramSheet` — modal bottom sheet с focus trap, initial focus на «Нет» и возвратом focus на trigger. «Нет», backdrop, Escape и Telegram Back закрывают sheet. Подтверждение запускает ровно один DELETE, блокирует обе кнопки и показывает progress. После `204` route заменяется на `/programs`, cache обновляется, показывается короткое подтверждение.

## Ошибки и доступность

Transport adapter нормализует ошибки в discriminated union со `status`, `code`, безопасным `message`, `fieldErrors` и optional `retryAfter`.

- `401`: один re-auth и один retry.
- `404`: «Программа не найдена» и возврат к списку.
- `409 already_exists`: field-level сообщение дня, refresh occupied weekdays, draft сохраняется.
- `409 mutation_in_progress`: фиксированный пользовательский текст и ручной retry.
- `422`: paths Laravel сопоставляются с draft fields, focus переводится на первую ошибку.
- `429`, network, `5xx`: безопасное сообщение; автоматический retry допустим только для reads.

Все controls имеют visible labels, touch target минимум 44×44 px, расстояние минимум 8 px, `:focus-visible` и состояние, различимое не только цветом. Icon-only controls получают `aria-label`; async/validation messages используют `role="alert"` или `aria-live`. Motion отключается при `prefers-reduced-motion`.

## Визуальное направление

- Тёплый белый canvas, графитовый основной текст, серый secondary, один зелёный accent и красный только для destructive/error.
- Карточки плоские, с тонкой рамкой, radius 18 px и без тяжёлых shadows.
- Горизонтальные поля 20 px, spacing по шкале 4/8 px, системный sans-serif, основной текст не меньше 16 px.
- Outline icons из одного Lucide-набора через Nuxt UI.
- Tabular numbers для sets.
- Градиенты референсов не повторяются, поскольку актуальные требования явно запрещают gradients.
- Центральная кнопка «Создать» из старого rest-day PNG не используется.

## Проверка

Vitest покрывает pure helpers, payload mappings, set operations, grouping, next-program rollover и error mapping. Vue Test Utils / Nuxt test-utils покрывают states главной, списка, формы и delete sheet. Playwright использует stub Telegram bridge и route mocks Laravel API для keyboard flow, widths 320/375/430 px, safe areas, длинных названий и увеличенного текста.

Перед завершением запускаются format check, ESLint, Nuxt typecheck, unit/component tests, Playwright и production build. Реальный Telegram WebView требует доступного deployment URL и bot configuration; если их нет в окружении, проверка отмечается как внешняя непроведённая acceptance dependency, а готовность не заявляется как полностью подтверждённая.

## Осознанные отклонения от PNG

- Только две нижние вкладки; центральной кнопки создания нет.
- CTA используют сплошной зелёный фон без gradients.
- Упражнения без доступного catalog endpoint не получают вымышленных названий.
- Поля формы перестраиваются на 320 px без горизонтального scroll, даже если пропорции отличаются от PNG.
- Состояния ошибок, skeletons, empty state, discard confirmation и delete sheet добавляются сверх предоставленных изображений, поскольку обязательны функциональными требованиями.
