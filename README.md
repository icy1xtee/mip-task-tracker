# Вместе

Приватное веб-приложение для двух партнёров: дела, идеи для совместного досуга, бюджет с
прогнозом баланса, общие ссылки и короткий обзор. React + TypeScript + Vite, Firebase Auth,
Cloud Firestore и Firebase Hosting. Своего сервера нет.

> Статус: каркас (этапы 0–1). Разделы реализуются по [.claude/initial-prompt.md](.claude/initial-prompt.md).

## Локальный запуск

Требуется Node.js ≥ 22.12 (`nvm use`).

```bash
npm install
cp .env.example .env.local   # заполнить значения из Firebase Console
npm run dev                  # http://localhost:5173
```

Без заполненного `.env.local` приложение покажет экран со списком недостающих переменных.

| Команда          | Что делает                                  |
| ---------------- | ------------------------------------------- |
| `npm run dev`    | dev-сервер                                  |
| `npm run check`  | typecheck + lint + тесты + production build |
| `npm run test`   | unit-тесты (Vitest)                         |
| `npm run build`  | production build в `dist/`                  |
| `npm run format` | Prettier                                    |

## Настройка Firebase

1. Создайте проект в [Firebase Console](https://console.firebase.google.com/).
2. **Web app**: Project settings → General → Your apps → Add app (Web). Значения конфига
   перенесите в `.env.local` (`VITE_FIREBASE_*`). Web-конфиг не секретный, но коммитить
   `.env.local` не нужно.
3. **Authentication** → Sign-in method → включите **Email/Password**.
4. **Единственный аккаунт**: Authentication → Users → Add user — email и пароль общей
   учётной записи. Регистрации в интерфейсе нет и не будет.
5. **Firestore Database** → Create database (production mode).
6. **UID allowlist**: скопируйте «User UID» созданного пользователя (Authentication → Users)
   и вставьте его в `firestore.rules` вместо `REPLACE_WITH_SHARED_ACCOUNT_UID`.
   Чтобы позже добавить второго пользователя, допишите его UID в тот же список.
7. Привяжите локальный CLI к проекту:
   ```bash
   cp .firebaserc.example .firebaserc   # указать project id
   npx firebase login
   ```

Даже вошедший пользователь, чьего UID нет в allowlist, не получит доступ к данным:
правила закрыты по умолчанию и не разрешают доступ «любому `request.auth != null`».

## Деплой

Перед деплоем проверьте:

- в `firestore.rules` стоит реальный UID, а не placeholder;
- `.firebaserc` указывает на нужный проект;
- `npm run check` проходит.

```bash
npm run deploy:rules     # Firestore Rules и индексы
npm run deploy:hosting   # build + Firebase Hosting (SPA rewrite на index.html)
```

## Принятые решения

- Деньги хранятся в копейках (целые числа), даты-события — строками `YYYY-MM-DD`.
- TypeScript закреплён на 6.0: `typescript-eslint` пока не поддерживает TS 7.
- Дизайн-токены в `src/index.css` временные (по брифу) и будут заменены по макетам из
  `.claude/design-prototype/`.
