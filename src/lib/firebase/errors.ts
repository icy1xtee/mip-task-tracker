import { FirebaseError } from 'firebase/app';
import { WriteError } from './db';

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Неверный email или пароль.',
  'auth/invalid-email': 'Некорректный email.',
  'auth/user-disabled': 'Учётная запись отключена.',
  'auth/too-many-requests': 'Слишком много попыток. Подождите немного и попробуйте снова.',
  'auth/network-request-failed': 'Нет соединения с сетью. Проверьте интернет.',
  'permission-denied':
    'Нет доступа к данным. Проверьте, что UID аккаунта добавлен в Firestore Rules.',
  unavailable: 'Нет связи с сервером. Изменения не сохранены.',
  'deadline-exceeded': 'Сервер долго не отвечает. Попробуйте ещё раз.',
  'not-found': 'Запись уже удалена на другом устройстве.',
  aborted: 'Запись изменилась на другом устройстве. Попробуйте ещё раз.',
};

const WRITE_MESSAGES: Record<WriteError['code'], string> = {
  offline: 'Нет соединения. Изменения не сохранены — попробуйте, когда сеть вернётся.',
  timeout:
    'Сервер не подтвердил сохранение. Проверьте соединение: изменение может примениться позже.',
  conflict: 'Это уже отмечено на другом устройстве.',
};

const FALLBACK = 'Не удалось сохранить. Проверьте соединение и попробуйте ещё раз.';

export function getErrorMessage(error: unknown): string {
  if (error instanceof WriteError)
    return error.message !== error.code ? error.message : WRITE_MESSAGES[error.code];
  if (error instanceof FirebaseError) return MESSAGES[error.code] ?? FALLBACK;
  return FALLBACK;
}

export function getLoadErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code === 'permission-denied')
    return MESSAGES['permission-denied']!;
  return 'Не удалось загрузить данные. Проверьте соединение и попробуйте ещё раз.';
}
