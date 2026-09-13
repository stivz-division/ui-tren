# Контракт API Tren

> Источники: https://github.com/stivz-division/api-tren, https://core.telegram.org/bots/webapps
> Создано: 2026-09-13
> Обновлено: 2026-09-13
> Проверенная ветка backend: `master`, состояние GitHub на 2026-09-12

## Обзор

Laravel 13 API обслуживает Telegram Mini App для планирования недельных программ и фиксации фактического выполнения тренировок. Все пути ниже имеют prefix `/api`. Кроме `/auth`, endpoints защищены Laravel Sanctum и требуют `Authorization: Bearer <token>`.

Laravel JSON resources возвращаются в envelope `{ "data": ... }`. Domain errors возвращаются без envelope как `{ "code": string, "message": string }`. Validation errors используют стандартный Laravel envelope `422` с `message` и `errors`.

## Аутентификация Telegram

### `POST /api/auth`

Request body:

```json
{
  "init_data": "<raw Telegram.WebApp.initData>"
}
```

Успех: `200 OK`, `Cache-Control: no-store`.

```json
{
  "token": "<opaque Sanctum token>",
  "token_type": "Bearer"
}
```

Контракт и ограничения:

- Передавать сырой `Telegram.WebApp.initData`; `initDataUnsafe` нельзя считать доверенным источником.
- Backend проверяет Telegram HMAC signature, наличие `auth_date` и `user`, freshness и корректность user fields.
- Максимальный размер `init_data`: 10 240 bytes.
- Default TTL: 300 секунд; future leeway: 30 секунд, оба значения конфигурируются backend.
- Rate limit: 10 запросов в минуту на IP.
- Каждый успешный login удаляет прежние Sanctum tokens пользователя. Нельзя запускать параллельную повторную аутентификацию из нескольких компонентов.
- Ошибка проверки возвращает `401`; превышение limit — `429`.
- Не логировать и не помещать в URL `init_data`, Bearer token или bot token.

Официальная документация Telegram требует проверять `initData` на backend и не доверять `initDataUnsafe`. Bot token остаётся только на Laravel стороне.

## Общие типы

```ts
type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7
// 1 = Monday, ..., 7 = Sunday

type WorkoutSessionStatus = 'in_progress' | 'completed' | 'cancelled'
type WorkoutExerciseStatus = 'pending' | 'completed' | 'skipped'

interface WorkoutSet {
  position: number
  repetitions: number
  working_weight_kg: number
}

interface PlannedSetInput {
  repetitions: number
  working_weight_kg: number
}

interface Exercise {
  id: number
  name: string
}

interface PlannedExercise {
  exercise_id: number
  position: number
  sets: WorkoutSet[]
}

interface PlannedExerciseInput {
  exercise_id: number
  sets: PlannedSetInput[]
}

interface TrainingProgram {
  id: number
  weekday: Weekday
  name: string
  exercises: PlannedExercise[]
}

interface WorkoutExercise {
  exercise_id: number
  name: string
  position: number
  status: WorkoutExerciseStatus
  planned_sets: WorkoutSet[]
  sets: WorkoutSet[]
}

interface WorkoutSession {
  id: number
  training_program_id: number
  program_name: string
  scheduled_weekday: Weekday
  status: WorkoutSessionStatus
  started_at: string
  completed_at: string | null
  cancelled_at: string | null
  exercises: WorkoutExercise[]
}

interface DataEnvelope<T> {
  data: T
}

interface DomainError {
  code: string
  message: string
}

interface ValidationError {
  message: string
  errors: Record<string, string[]>
}
```

Timestamps сериализуются как `DATE_ATOM`/RFC 3339. Workout clock backend использует `Europe/Moscow`; UI должен явно выбрать политику отображения timezone.

## Планирование тренировок

Все endpoints требуют Bearer token.

### Каталог упражнений

`GET /api/exercises` возвращает доступные для планирования упражнения:

```json
{
  "data": [
    { "id": 10, "name": "Жим лёжа" }
  ]
}
```

Frontend использует этот каталог для выбора упражнений и разрешения `exercise_id` в человекочитаемое имя. Production mock-каталог не используется.

| Method | Path | Успех | Ответ |
|---|---|---:|---|
| `GET` | `/training-programs` | 200 | `{ data: TrainingProgram[] }` |
| `POST` | `/training-programs` | 201 | `{ data: TrainingProgram }` |
| `PUT` | `/training-programs/{trainingProgramId}` | 200 | `{ data: TrainingProgram }` |
| `DELETE` | `/training-programs/{trainingProgramId}` | 204 | пустое body |
| `GET` | `/training-programs/weekdays/{weekday}` | 200 | `{ data: TrainingProgram }` |

### Создание программы

```ts
interface CreateTrainingProgramInput {
  weekday: Weekday
  name?: string | null
  exercises: PlannedExerciseInput[]
}
```

- На один weekday допускается одна программа.
- Если `name` отсутствует или равен `null`, backend использует `Тренировка`.
- `exercises` — упорядоченный непустой list; `exercise_id` должны существовать и не повторяться.
- У каждого упражнения от 1 до 100 подходов.
- `repetitions` — integer не меньше 1.
- `working_weight_kg` — число от 0 до 1 000 000 000, максимум два decimal знака.
- Position вычисляет backend по порядку массива; отправлять `position` во входных данных нельзя.

### Обновление программы

```ts
interface UpdateTrainingProgramInput {
  name: string
  exercises: PlannedExerciseInput[]
}
```

`PUT` полностью заменяет имя и упражнения. `name` обязателен. Field `weekday` запрещён: перенос программы на другой день не поддерживается.

### Удаление и поиск по дню

- `DELETE` необратимо удаляет программу и возвращает `204`.
- `GET /weekdays/{weekday}` требует integer `1..7`; отсутствие программы возвращает `training_program_not_found` (`404`), а не `{ data: null }`.

## Выполнение тренировок

| Method | Path | Назначение |
|---|---|---|
| `GET` | `/workout-sessions/active` | Получить active session или `{ data: null }` |
| `PUT` | `/workout-sessions/active` | Начать либо продолжить сессию выбранной программы |
| `PUT` | `/workout-sessions/{sessionId}/exercises/{exerciseId}/sets` | Полностью заменить draft sets упражнения |
| `POST` | `/workout-sessions/{sessionId}/exercises/{exerciseId}/complete` | Завершить упражнение с итоговым списком sets |
| `POST` | `/workout-sessions/{sessionId}/exercises/{exerciseId}/skip` | Пропустить упражнение и очистить sets |
| `POST` | `/workout-sessions/{sessionId}/exercises/{exerciseId}/reopen` | Снова разрешить редактирование |
| `POST` | `/workout-sessions/{sessionId}/complete` | Завершить session |
| `POST` | `/workout-sessions/{sessionId}/cancel` | Отменить session |

Все успешные mutations, кроме удаления программы, возвращают полную актуальную сущность в `{ data: ... }`. UI должен заменять локальное состояние этим ответом.

### Старт сессии

```json
{
  "training_program_id": 42
}
```

- Одновременно допускается одна active session.
- Повторный start той же программы возвращает существующую active session.
- Попытка начать другую программу при active session возвращает `active_workout_session_already_exists` (`409`).

### Сохранение и завершение упражнения

```ts
interface SaveWorkoutSetsInput {
  sets: PlannedSetInput[]
}
```

- `PUT .../sets` полностью заменяет текущий list; пустой list допустим; максимум 100 sets.
- `POST .../complete` принимает ту же форму, но требует минимум один set.
- Completed или skipped exercise нельзя редактировать до `reopen`.
- `skip` очищает фактические sets.
- `reopen` восстанавливает planned sets для skipped exercise; для completed сохраняет зафиксированные sets и возвращает его в editable state.

### Завершение сессии

Session можно завершить только когда каждое упражнение имеет status `completed` или `skipped`. Автозавершения нет. `complete` и `cancel` должны считаться серверными state transitions; UI не меняет status оптимистически до ответа.

## История

### `GET /api/workout-sessions`

Query:

- `per_page`: optional integer `1..50`, default `15`.
- `cursor`: optional opaque string, максимум 2048 characters. Не конструировать и не декодировать на клиенте.

Ответ содержит только terminal sessions (`completed` и `cancelled`), новые сначала:

```ts
interface WorkoutSessionHistoryPage {
  data: WorkoutSession[]
  links: {
    prev: string | null
    next: string | null
  }
  meta: {
    per_page: number
    prev_cursor: string | null
    next_cursor: string | null
  }
}
```

Для следующей страницы передавать возвращённый `meta.next_cursor` либо использовать `links.next`. После полного refresh старые cursors следует отбросить.

## Domain errors

| Code | HTTP | Действие UI |
|---|---:|---|
| `training_program_not_found` | 404 | Обновить расписание и закрыть устаревший экран |
| `training_program_already_exists` | 409 | Показать существующую программу выбранного дня |
| `training_program_mutation_in_progress` | 409 | Заблокировать дублирование, затем refetch |
| `exercise_not_found` | 422 | Обновить каталог/форму; не повторять прежний payload |
| `exercise_already_planned` | 422 | Подсветить duplicate exercise |
| `training_program_must_contain_exercise` | 422 | Потребовать хотя бы одно упражнение |
| `invalid_weekday` | 422 | Исправить значение дня |
| `workout_session_not_found` | 404 | Refetch active session |
| `workout_exercise_not_found` | 404 | Refetch session |
| `active_workout_session_already_exists` | 409 | Открыть текущую active session |
| `workout_session_mutation_in_progress` | 409 | Не повторять параллельно; затем refetch |
| `workout_session_not_in_progress` | 409 | Refetch session/history |
| `workout_exercise_not_editable` | 409 | Обновить status; предложить reopen |
| `workout_session_has_pending_exercises` | 409 | Показать незавершённые упражнения |
| `invalid_training_program_snapshot` | 409 | Не запускать session; обновить программу |
| `workout_exercise_has_no_sets` | 422 | Добавить хотя бы один set |

Некоторые внутренние exceptions не имеют публичного stable code. Для неизвестного ответа UI должен использовать status и безопасное fallback message.

## Паттерн Nuxt-интеграции

1. Инициализировать Telegram bridge только на client side и вызвать `ready()` после загрузки обязательного shell UI.
2. Дедуплицировать auth одним shared promise/composable: повторный успешный login отзывает предыдущий token.
3. Предпочитать same-origin Nuxt BFF: принять `initData`, обменять его на Sanctum token, хранить token в `HttpOnly`, `Secure`, `SameSite` cookie и проксировать Laravel requests server-side.
4. Если используется прямой CSR-доступ, подтвердить Laravel CORS и хранить token в memory/session scope, не в persistent `localStorage`.
5. Автоматически retry только idempotent reads при network/5xx. Для mutations, `409` и `422` нужен refetch либо действие пользователя.
6. Сериализовать mutations на одну active session и отключать повторную отправку действия до завершения request.
7. При Telegram resume/visibility regain обновлять active session; aggressive polling не требуется.

## Известные пробелы backend

- Planning resource содержит только `exercise_id`, без названия упражнения.
- Нет `/me`, logout/revoke или profile endpoint.
- CORS, deployment origin и cookie policy не определены публичным контрактом.
- Нет API versioning, ETag или optimistic concurrency token.
- История не поддерживает filter по date/status.
- Политика отображения времени `Europe/Moscow` в timezone пользователя не зафиксирована.

Эти пункты нельзя молча компенсировать догадками frontend. Их нужно закрыть backend-контрактом или отдельным согласованным решением.

## Источники

- Backend repository: https://github.com/stivz-division/api-tren
- Telegram Mini Apps: https://core.telegram.org/bots/webapps
