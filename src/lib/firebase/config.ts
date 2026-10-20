import type { FirebaseOptions } from 'firebase/app';

const ENV_KEYS = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
} as const satisfies Partial<Record<keyof FirebaseOptions, string>>;

export type FirebaseConfigResult =
  { ok: true; options: FirebaseOptions } | { ok: false; missing: string[] };

export function readFirebaseConfig(env: Record<string, string | undefined>): FirebaseConfigResult {
  const options: FirebaseOptions = {};
  const missing: string[] = [];

  for (const [field, envKey] of Object.entries(ENV_KEYS)) {
    const value = env[envKey]?.trim();
    if (value) {
      options[field as keyof typeof ENV_KEYS] = value;
    } else {
      missing.push(envKey);
    }
  }

  return missing.length > 0 ? { ok: false, missing } : { ok: true, options };
}
