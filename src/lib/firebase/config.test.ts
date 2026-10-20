import { describe, expect, it } from 'vitest';
import { readFirebaseConfig } from './config';

const FULL_ENV = {
  VITE_FIREBASE_API_KEY: 'key',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo',
  VITE_FIREBASE_STORAGE_BUCKET: 'demo.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '1',
  VITE_FIREBASE_APP_ID: '1:1:web:1',
};

describe('readFirebaseConfig', () => {
  it('собирает конфиг из VITE_FIREBASE_* переменных', () => {
    const result = readFirebaseConfig(FULL_ENV);
    expect(result).toEqual({
      ok: true,
      options: expect.objectContaining({ projectId: 'demo', apiKey: 'key' }),
    });
  });

  it('перечисляет отсутствующие и пустые переменные', () => {
    const result = readFirebaseConfig({
      ...FULL_ENV,
      VITE_FIREBASE_API_KEY: ' ',
      VITE_FIREBASE_APP_ID: undefined,
    });
    expect(result).toEqual({
      ok: false,
      missing: ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_APP_ID'],
    });
  });
});
