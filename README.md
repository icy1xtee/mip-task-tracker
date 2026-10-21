# mip

Приватное веб-приложение для двух партнёров: дела, идеи для совместного досуга, бюджет с
прогнозом баланса, фактические расходы с аналитикой, общие ссылки и короткий обзор.
React + TypeScript + Vite, Firebase Auth, Cloud Firestore и Firebase Hosting. Своего сервера нет.

Дизайн — по прототипу `.claude/design-prototype/mip — прототип и дизайн-система.html`.

## Локальный запуск

Требуется Node.js ≥ 22.12 (`nvm use`).

```bash
npm install
cp .env.example .env.local   # заполнить значения из Firebase Console
npm run dev                  # http://localhost:5173
```

Без заполненного `.env.local` приложение покажет экран со списком недостающих переменных.

| Команда              | Что делает                                                     |
| -------------------- | -------------------------------------------------------------- |
| `npm run dev`        | dev-сервер                                                     |
| `npm run check`      | typecheck + lint + тесты + production build                    |
| `npm run test`       | unit-тесты (финансовая логика, форматирование, экраны)         |
| `npm run test:rules` | тесты Firestore Rules на эмуляторе (нужна Java 21)             |
| `npm run emulators`  | эмуляторы Auth + Firestore для локальной проверки (нужна Java) |
| `npm run build`      | production build в `dist/`                                     |

### Работа на эмуляторах (без реальных данных)

1. Установите JRE 21 (например, `brew install openjdk@21` или Temurin) и запустите `npm run emulators`.
2. Запустите dev-сервер с флагом эмуляторов, `VITE_FIREBASE_PROJECT_ID=demo-mip VITE_FIREBASE_EMULATORS=true npm run dev`
   (остальные `VITE_FIREBASE_*` могут быть любыми непустыми).
3. Создайте пользователя эмулятора с UID из allowlist:
   ```bash
   curl -X POST "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake" \
     -H "Authorization: Bearer owner" -H "Content-Type: application/json" \
     -d '{"localId":"<UID из firestore.rules>","email":"dev@example.com","password":"dev-password"}'
   ```

## Настройка Firebase

1. Создайте проект в [Firebase Console](https://console.firebase.google.com/), тариф Spark.
2. **Web app**: Project settings → General → Your apps → Add app (Web). Значения конфига
   перенесите в `.env.local` (`VITE_FIREBASE_*`).
3. **Authentication** → Sign-in method → включите **Email/Password**.
4. **Аккаунты**: Authentication → Users → Add user. Регистрации в интерфейсе нет.
   По возможности снимите Authentication → Settings → User actions → «Enable create (sign-up)».
5. **Firestore Database** → Create database (production mode, регион `europe-west3` / `eur3`).
6. **UID allowlist**: скопируйте «User UID» (Authentication → Users) в список в `firestore.rules`
   (функция `isMember`). Второго партнёра — добавить в тот же список.
7. Привяжите CLI: `npx firebase login`, `npx firebase use --add` (alias `default`).

Правила закрыты по умолчанию: даже вошедший пользователь не из allowlist ничего не прочитает.
Кроме доступа они проверяют структуру каждого документа (поля, типы, enum, целые копейки, даты).

## Деплой

Перед деплоем:

- в `firestore.rules` — реальные UID;
- `npm run check` и `npm run test:rules` проходят;
- `.firebaserc` указывает на нужный проект.

```bash
npm run deploy:rules     # Firestore Rules и индексы
npm run deploy:hosting   # build + Firebase Hosting (SPA rewrite на index.html)
```

## Принятые решения

- **Деньги** — целые копейки, **даты событий** — строки `YYYY-MM-DD` (без UTC-сдвигов).
- **Прогноз** на конец дня: остаток счёта на дату фиксации (конец дня) + фактические операции
  после неё + неоплаченные плановые и регулярные операции до выбранной даты. Выполненная
  операция учитывается один раз — фактом; пропущенная не учитывается. Раньше даты фиксации
  баланса прогноз по счёту не строится.
- **Отметка «Оплачено»** создаёт фактическую операцию в той же транзакции Firestore; дата факта —
  дата плана, а если платёж отмечен заранее — сегодня. Экземпляр повтора хранится под id
  `<правило>_<дата>`, поэтому двойная отметка с двух телефонов невозможна. Удаление факта,
  созданного из плана, возвращает платёж в план.
- **Регулярные операции**: неделя / месяц / год; если в месяце нет нужного числа — последний день
  месяца; 29 февраля в невисокосный год — 28 февраля.
- **Обзор**: прогноз показывается на ближайшую дату с крупной операцией (от 10 000 ₽, в пределах
  60 дней), иначе — на конец месяца. В «Предстоящих платежах» есть и прошедшие неотмеченные.
- **Идеи**: статусы из ТЗ (`wishlist`, `booked`, `completed`, `archived`) + флаг «нужна бронь» для
  вариантов макета «Нужна бронь / Не нужна». Случайный выбор — только из `wishlist`,
  равномерно через `crypto.getRandomValues`.
- **Ссылки**: типы ТЗ + «Папка» из макета (`workspace`→Notion, `document`, `spreadsheet`, `folder`, `other`).
- **Фактические расходы**: графики строятся только из сохранённых трат; месяцы до первой траты не
  показываются; сравнение и среднее — только если есть данные. Прогноз «если темп сохранится» —
  простая пропорция по дням, только для текущего месяца.
- **Категории** — константный набор из ТЗ; доходы — отдельная категория «Доход».
- **Офлайн**: данные из кэша показываются, но запись не начинается — показывается ошибка и
  плашка «Нет соединения».
- Не реализовано (нет в макете): поле «кто делает» у задач (`assignee` хранится как `null`),
  теги ссылок (`tags` — пустой список), настройки.
- TypeScript закреплён на 6.0: `typescript-eslint` пока не поддерживает TS 7.
