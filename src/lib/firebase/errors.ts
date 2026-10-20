import { FirebaseError } from 'firebase/app';

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Неверный email или пароль.',
  'auth/invalid-email': 'Некорректный email.',
  'auth/user-disabled': 'Учётная запись отключена.',
  'auth/too-many-requests': 'Слишком много попыток. Подождите немного и попробуйте снова.',
  'auth/network-request-failed': 'Нет соединения с сетью. Проверьте интернет.',
  'permission-denied':
    'Нет доступа к данным. Проверьте, что UID аккаунта добавлен в Firestore Rules.',
  unavailable: 'Сервис временно недоступен или нет сети. Изменения не сохранены.',
  'deadline-exceeded': 'Сервер долго не отвечает. Попробуйте ещё раз.',
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return MESSAGES[error.code] ?? 'Что-то пошло не так. Попробуйте ещё раз.';
  }
  return 'Что-то пошло не так. Попробуйте ещё раз.';
}
