# Вместе — CLAUDE.md

Адаптивное SPA для двух партнёров: дела, идеи досуга, бюджет с прогнозом, ссылки, обзор.
Полное ТЗ — [.claude/initial-prompt.md](.claude/initial-prompt.md). Оно источник истины по
функциональности, ограничениям и Definition of Done; перед работой над разделом перечитай его часть.

Дизайн-макеты появятся в `.claude/design-prototype/`. Когда они там есть — это визуальный
источник истины: сначала изучи их, затем обнови токены в `src/index.css` и компоненты.

## Команды

```bash
npm run dev          # Vite dev-сервер (нужен .env.local, см. .env.example)
npm run check        # typecheck + lint + test + build — запускай перед завершением этапа
npm run test         # Vitest (чистая логика, environment: node)
npm run format       # Prettier (+ сортировка Tailwind-классов)
```

Деплой (`npm run deploy:*`, `firebase deploy`) — только по явной просьбе пользователя.

## Стек и архитектура

- React 19 + TypeScript 6 + Vite 8, Tailwind CSS 4 (токены через `@theme` в `src/index.css`).
- React Router 8 (declarative mode, маршруты в `src/app/App.tsx`).
- Firebase Auth (email/password) + Cloud Firestore + Firebase Hosting. **Своего backend нет и
  не будет**: «серверная часть» — это `firestore.rules`, `firestore.indexes.json`, `firebase.json`.
- Radix (`radix-ui`) для диалогов, lucide-react, date-fns (ru), recharts, react-hook-form + zod.
- Нет Redux/глобального стора, Cloud Functions, Express, Docker, Admin SDK в браузере.

```
src/
  app/              App (роутер, провайдеры), экран ошибки конфигурации
  components/ui/    примитивы: Button, Field/Input, Sheet, ConfirmDialog, StateViews, PageHeader
  components/layout AppShell (sidebar на md+, top bar + bottom nav на мобильном), navigation.ts
  features/<name>/  страница раздела + api.ts (Firestore-доступ) + хуки + формы раздела
  lib/firebase/     единственная инициализация (getFirebase), конфиг из env, перевод ошибок
  lib/format/       money.ts (копейки ↔ рубли), dates.ts (IsoDate YYYY-MM-DD)
  lib/finance/      (будет) чистые функции прогноза и генерации регулярных дат + тесты
```

## Правила кода

- **Деньги** — только целые копейки (`*Minor`). Ввод: `parseRublesToMinor`, вывод: `formatMoney`.
  Никаких float в расчётах.
- **Календарные даты** — строки `IsoDate` (`YYYY-MM-DD`), сравниваются как строки; в `Date`
  через `parseIsoDate`/`toIsoDate` (локальная зона). Audit-поля (`createdAt/updatedAt`) — Firestore
  `serverTimestamp()`.
- **Firestore не вызывается из компонентов.** Только через `features/<name>/api.ts` и хуки.
  Realtime-подписки — там, где нужна синхронизация двух устройств; всегда отписывайся.
- Связанные изменения (отметка плановой операции выполненной + создание транзакции) —
  в `writeBatch`/`runTransaction`, чтобы не было двойного учёта.
- Каждый экран: loading / error / empty / saving / подтверждение удаления
  (`LoadingState`, `ErrorState`, `EmptyState`, `ConfirmDialog`). Формы на телефоне — `Sheet`.
- Ошибки для пользователя — на русском через `getErrorMessage`. Офлайн не показывать «сохранено».
- UI только на русском. Один основной CTA на экран (`PageHeader action`). Никаких фиктивных
  кнопок. URL валидировать (только http/https), внешние ссылки — `target="_blank" rel="noopener noreferrer"`.
- Сущности и коллекции — строго по разделу 8 ТЗ (`tasks`, `activities`, `accounts`,
  `plannedEntries`, `recurringRules`, `recurringOccurrences`, `transactions`, `links`, `appSettings`).

## Безопасность

- `firestore.rules`: deny-by-default, доступ только UID из allowlist (`isMember()`).
  Не ослаблять до `request.auth != null`. При реализации сущности добавляй в её `match`
  валидацию полей и типов.
- Новая коллекция = новый явный `match` в rules. Новый составной запрос = индекс в
  `firestore.indexes.json` (только реально нужный).
- Секреты не коммитить: `.env.local` в `.gitignore`, в репозитории только `.env.example`.

## Статус этапов (раздел 9 ТЗ)

- [x] Этап 0–1: каркас, токены (временные), layout, вход, Firebase init, rules, state-компоненты, Vitest.
- [ ] Этап 2: CRUD задач, идей (с рандомайзером), ссылок.
- [ ] Этап 3: счета, плановые/регулярные операции, прогноз (тесты в `lib/finance`).
- [ ] Этап 4: фактические операции и аналитика.
- [ ] Этап 5: проверка, README, подготовка деплоя.

## Нюансы окружения

- TypeScript закреплён на `~6.0`: typescript-eslint пока не поддерживает TS 7.
- `@hookform/resolvers` на v5: v6 конфликтует по optional peer `effect`.
- `npm audit` ругается на `@grpc/grpc-js` внутри firebase — это Node-транспорт Firestore,
  в браузерный бандл не попадает; `audit fix --force` откатывает firebase до v9 — не делать.
- Java не установлена → Firebase Emulator недоступен; правила проверяются вручную/в консоли.
- Бандл ~900 kB (в основном Firebase). Разделы с recharts грузить через `React.lazy`.
