# Архитектура: Structured Modules — Vertical Slices

## Обзор

UI Tren строится как Nuxt 4 приложение с вертикальными feature slices. Каждый предметный модуль содержит собственные компоненты, composables, API-функции и типы представления. Общие технические детали — Telegram bridge, Nuxt BFF, HTTP normalization и UI primitives — вынесены в shared infrastructure и не содержат предметного поведения.

Паттерн выбран для четырёх связанных, но независимо развиваемых областей: аутентификации, расписания программ, выполнения активной тренировки и истории. Он сохраняет высокую скорость разработки небольшой команды и предотвращает смешивание сложной state machine тренировки с формами расписания.

## Обоснование решения

- **Тип проекта:** mobile-first Telegram Mini App.
- **Tech stack:** TypeScript, Nuxt 4, Vue 3 Composition API, Nuxt UI 4.
- **Ключевой фактор:** предметные экраны имеют разные lifecycle и error-handling rules, но используют один Laravel API.
- **Deployment:** один Nuxt service; microservices и строгая многослойная DDD-структура не оправданы.

## Структура каталогов

```text
app/
├── app.vue                         # UApp, NuxtPage, глобальный application shell
├── assets/css/main.css             # Tailwind CSS и Nuxt UI imports
├── layouts/                        # Компоновка экранов Mini App
├── pages/                          # Тонкие route composition surfaces
├── middleware/                     # Navigation guards без предметной логики
├── features/
│   ├── auth/
│   │   ├── components/             # Состояния запуска и ошибки Telegram auth
│   │   ├── composables/            # Дедуплицированный auth lifecycle
│   │   ├── api/                    # Вызовы локального BFF auth endpoint
│   │   └── model/                  # Auth state и публичные types
│   ├── training-programs/
│   │   ├── components/             # Week schedule и program editor
│   │   ├── composables/            # Queries и mutations расписания
│   │   ├── api/                    # Typed program operations
│   │   └── model/                  # Form/view models и mappings
│   ├── workout-sessions/
│   │   ├── components/             # Active workout и set editor
│   │   ├── composables/            # Session state machine orchestration
│   │   ├── api/                    # Start/save/complete/skip/reopen/cancel
│   │   └── model/                  # Status unions и transition helpers
│   └── workout-history/
│       ├── components/             # История и детали terminal sessions
│       ├── composables/            # Cursor pagination
│       ├── api/                    # History reads
│       └── model/                  # Presentation mappings
├── components/ui/                  # Project-level Nuxt UI wrappers без feature imports
├── composables/                    # Только действительно cross-feature composables
├── plugins/                        # Client-only Telegram initialization
└── utils/                          # Чистые универсальные helpers

server/
├── api/                            # Same-origin BFF routes для browser
│   ├── auth.post.ts                # initData -> Laravel token -> secure cookie
│   └── api-tren/[...path].ts       # Проверяемый proxy к разрешённым API routes
└── utils/api-tren/                 # Backend client, cookie и error mapping

shared/
├── types/api-tren.ts               # Wire contracts без Vue/Nitro imports
└── utils/                          # Чистые helpers для app и server

public/                             # Статические assets
tests/
├── unit/                           # Vitest
├── nuxt/                           # @nuxt/test-utils
└── e2e/                            # Playwright mobile/Telegram scenarios
```

Создавать каталоги следует по мере появления соответствующего кода. Пустые layers и абстракции заранее не нужны.

## Правила зависимостей

- ✅ `pages` и `layouts` могут компоновать публичные exports feature-модулей.
- ✅ Feature component может зависеть от `composables`, `model`, project UI и `shared`.
- ✅ Feature `api` вызывает только локальные BFF endpoints через общий transport adapter.
- ✅ `server/api` зависит от `server/utils/api-tren` и `shared` contracts.
- ✅ Cross-feature orchestration размещается в route-level composition или выделенном application composable с явными public APIs.
- ❌ Feature-модуль не импортирует внутренние файлы другого feature-модуля.
- ❌ `components/ui`, `shared` и transport infrastructure не импортируют feature-модули.
- ❌ Vue-компоненты не собирают backend URL, Authorization header и Laravel envelopes вручную.
- ❌ Client bundle не получает Laravel Sanctum token, если используется BFF cookie flow.
- ❌ Telegram bot token никогда не попадает в Nuxt public runtime config.

## Коммуникация модулей

- Feature-модуль экспортирует только минимальный public surface: route component, typed composable и необходимые types.
- Server state передаётся через typed composables и результаты Nuxt data fetching; глобальный store не является копией backend cache.
- После mutation возвращённый Laravel resource заменяет локальное состояние соответствующей сущности.
- Смена active workout отражается через единый cache key/composable, а не через прямые изменения состояния в нескольких компонентах.
- Telegram lifecycle (`ready`, theme, viewport, resume) приходит через один client-only adapter и не используется напрямую в feature components.

## Поток данных и аутентификация

1. Client-only Telegram adapter получает сырой `initData`.
2. Browser отправляет `initData` на same-origin `POST /api/auth` Nuxt BFF.
3. BFF вызывает Laravel `POST /api/auth` и сохраняет Bearer token в `HttpOnly`, `Secure`, `SameSite` cookie.
4. Browser вызывает только same-origin BFF; server adapter добавляет Authorization header к запросу Laravel.
5. BFF нормализует transport errors, но сохраняет `status`, domain `code`, validation `errors` и server message.
6. При `401` cookie очищается; разрешена одна контролируемая re-authentication, без бесконечного retry loop.

Proxy не должен принимать произвольный upstream URL. Разрешён только настроенный private `apiBase`, а forwarded path ограничивается известным `/api` contract.

## Обработка ошибок

- `401`: очистить auth state и выполнить не более одной повторной аутентификации.
- `404`: считать локальный resource устаревшим, refetch parent collection и закрыть недействительный экран.
- `409`: различать lock conflict и state conflict по `code`; заблокировать дубликаты и refetch authoritative resource.
- `422`: сопоставить Laravel `errors` с form fields; domain error без `errors` показать как предметное сообщение.
- `429`: учитывать `Retry-After`, не запускать быстрые автоматические повторы.
- Network/`5xx`: автоматически retry только idempotent reads; mutation outcome может быть неизвестен и требует refetch.

## Ключевые принципы

1. **Backend authoritative:** UI не воспроизводит server state transitions оптимистически.
2. **Feature locality:** код одной пользовательской области находится рядом и имеет малый public API.
3. **Secure boundary:** Telegram и Sanctum secrets изолированы от компонентов и client persistence.
4. **Typed wire contract:** API payloads отделены от editable form/view models явными mapping functions.
5. **Nuxt-native state:** `useFetch`, `useAsyncData`, `useState` и keyed refresh предпочтительнее дополнительного state framework без доказанной необходимости.
6. **Mobile resilience:** active session восстанавливается при запуске и resume, mutations сериализуются.

## Примеры кода

### Public composable feature-модуля

```ts
// app/features/training-programs/composables/useTrainingPrograms.ts
import type { TrainingProgram } from '#shared/types/api-tren'

export function useTrainingPrograms() {
  return useFetch<TrainingProgram[]>('/api/api-tren/training-programs', {
    key: 'training-programs',
    transform: response => response.data,
  })
}
```

Компонент использует composable и не знает Laravel base URL либо правила token forwarding.

### Server-side adapter с сохранением ошибки

```ts
// server/utils/api-tren/request.ts
export async function requestApiTren<T>(event: H3Event, path: string, options = {}) {
  const token = getCookie(event, 'api_tren_session')

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' })
  }

  return await $fetch<T>(path, {
    ...options,
    baseURL: useRuntimeConfig(event).apiBase,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
}
```

Production implementation обязана дополнительно нормализовать `$fetch` errors, ограничить forwarded paths и не логировать token.

## Anti-patterns

- ❌ Один глобальный store, содержащий auth, расписание, active workout и историю.
- ❌ Fetching и mutations непосредственно внутри крупных page components.
- ❌ Persistent Bearer token в `localStorage`.
- ❌ Общий proxy, позволяющий клиенту задавать upstream host.
- ❌ Blind retry для workout mutations и `409 Conflict`.
- ❌ Дублирование wire DTO как editable form state без mapping/validation boundary.
- ❌ Импорт feature internals через длинные относительные пути.
- ❌ Создание пустых repository/service layers только ради схемы каталогов.

