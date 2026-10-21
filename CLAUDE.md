# mip — CLAUDE.md

Адаптивное SPA для двух партнёров: дела, идеи досуга, бюджет с прогнозом, ссылки, обзор.
Полное ТЗ — [.claude/initial-prompt.md](.claude/initial-prompt.md) (рабочее название там «Вместе»,
в макете и интерфейсе — **mip**). ТЗ — источник истины по функциональности и модели данных.

**Визуальный источник истины — прототип** `.claude/design-prototype/mip — прототип и дизайн-система.html`
(бандл: внутри gzip+base64 манифест; основной исходник — `Main.dc.html` с CSS, разметкой всех экранов
и логикой). Его CSS перенесён в [src/styles/mip.css](src/styles/mip.css) почти дословно — классы
(`.btn`, `.row`, `.panel`, `.cal`, …) и токены (`--sage`, `--clay`, …) совпадают с прототипом.
Новые экраны и элементы собирай из этих классов; новые классы — в конец `mip.css`.

## Команды

```bash
npm run dev          # Vite dev-сервер (нужен .env.local, см. .env.example)
npm run check        # typecheck + lint + test + build — запускай перед завершением задачи
npm run test         # Vitest: чистая логика (lib/, features/*/…View.ts)
npm run test:rules   # тесты firestore.rules на эмуляторе (нужна Java в PATH)
npm run emulators    # эмуляторы Auth + Firestore (demo-mip) для ручной проверки UI
npm run format       # Prettier
```

Деплой (`npm run deploy:*`, `firebase deploy`) — только по явной просьбе пользователя.

## Стек и архитектура

- React 19 + TypeScript 6 + Vite 8. Стили — CSS дизайн-системы (`mip.css`, подключён вне
  слоёв, чтобы утилиты Tailwind 4 с совпадающими именами вроде `.block` его не перебивали).
  Tailwind оставлен для редких утилит (`sr-only`); токены доступны и как `bg-surface` и т.п.
- React Router 8 (declarative mode, маршруты в `src/app/App.tsx`): `/`, `/tasks`, `/ideas`,
  `/budget`, `/budget/actual`, `/links`, `/login`.
- Firebase Auth + Cloud Firestore (persistent cache) + Hosting. **Своего backend нет.**
- Radix (`radix-ui`: Dialog, AlertDialog, DropdownMenu), react-hook-form + zod, date-fns.
- Иконки — пути из прототипа в `components/ui/Icon.tsx` (lucide/recharts не используются:
  графики — HTML/CSS как в макете).

```
src/
  app/                 App (роутер, провайдеры), экран ошибки конфигурации
  styles/mip.css       дизайн-система из прототипа
  components/ui/       Button, Field/inputs, Segmented/Chips, Tag, TaskCheck, RowMenu, Panel
                       (боковая панель / bottom sheet), ConfirmDialog, toast, States (DataView)
  components/layout/   AppShell (сайдбар 232 → рейка 72 → topbar+tabbar), chrome.ts (заголовок и «+» на телефоне)
  features/<name>/     Page + api.ts (Firestore) + формы + *View.ts (чистая логика экрана, с тестами)
  lib/finance/         recurrence, plan (развёртка плана), forecast, analytics, categories
  lib/firebase/        client (init, эмуляторы), db (useCollection, write-guard), parse, errors
  lib/format/          money, dates, plural, url; lib/forms.ts — zod-поля форм
tests/rules/           тесты Firestore Rules (@firebase/rules-unit-testing)
```

## Правила кода

- **Деньги** — только целые копейки (`*Minor`). Ввод: `parseRublesToMinor`, вывод: `formatMoney` /
  `formatSignedMoney` (неразрывный пробел, минус «−» U+2212). Никаких float в расчётах.
- **Календарные даты** — `IsoDate` (`YYYY-MM-DD`), сравниваются как строки; в `Date` — только через
  `parseIsoDate`/`toIsoDate`. Audit-поля — `serverTimestamp()` (`created()` / `touched()` из `db.ts`).
- **Firestore не вызывается из компонентов** — только `features/<name>/api.ts`. Чтение —
  `useCollection` (realtime, отписка при размонтировании). **Каждая запись — через `write()`**:
  офлайн она не начинается, без подтверждения сервера за 15 с — ошибка, а не «сохранено».
- Отметка плана «оплачено» — `runTransaction` + детерминированный id экземпляра
  `<ruleId>_<date>`; связанные изменения — `writeBatch`. Прогноз берёт факт вместо выполненного плана.
- Экран: `DataView` (loading/error) → содержимое / `EmptyState`. Формы — `Panel`, удаление —
  `useConfirmDelete`, обратимые смены статуса — тост с «Отменить».
- Один primary CTA на экран (в `PageHeader`; на телефоне его роль у «+» через `usePageChrome`).
  Никаких фиктивных кнопок. Внешние ссылки — `ExternalLink` (новая вкладка, `noopener noreferrer`).
- Файлы компонентов экспортируют только компоненты (fast refresh): хелперы — в `*View.ts`/`*Meta.ts`.
- macOS: файловая система не различает регистр — не заводи `fooView.ts` рядом с `FooView.tsx`.

## Безопасность

- `firestore.rules`: deny-by-default, доступ только UID из allowlist (`isMember()`), плюс валидация
  каждого документа (точный набор полей, типы, enum, целые копейки, даты, серверное время,
  `createdAt` неизменен). Меняешь поля модели → меняй правила и `tests/rules`, гоняй `npm run test:rules`.
- Новая коллекция = новый явный `match`. Новый составной запрос = индекс в `firestore.indexes.json`.
- Секреты не коммитить: `.env.local` в `.gitignore`.

## Статус этапов (раздел 9 ТЗ)

- [x] Этап 0–1: каркас, дизайн-система из прототипа, layout, вход, Firebase, rules.
- [x] Этап 2: CRUD дел, идей (рандомайзер, статусы), ссылок.
- [x] Этап 3: счета, разовые и регулярные операции, отметки экземпляров, прогноз.
- [x] Этап 4: фактические операции, аналитика по категориям и месяцам.
- [ ] Этап 5: деплой новых rules и hosting (по просьбе пользователя), ручная проверка на устройствах.

## Нюансы окружения

- TypeScript закреплён на `~6.0`: typescript-eslint пока не поддерживает TS 7.
- `@hookform/resolvers` на v5: v6 конфликтует по optional peer `effect`.
- `npm audit` ругается на `@grpc/grpc-js` внутри firebase — это Node-транспорт Firestore,
  в браузерный бандл не попадает; `audit fix --force` откатывает firebase до v9 — не делать.
- Java в системе нет. Для `test:rules`/`emulators` нужна JRE 21 в PATH (например, Temurin).
- Heredoc в shell может превращать ` ` в буквальный символ — ESLint ловит это как
  `no-irregular-whitespace`; в исходниках держи escape-последовательности.
