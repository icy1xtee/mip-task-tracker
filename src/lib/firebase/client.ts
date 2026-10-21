import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { readFirebaseConfig } from './config';

export const firebaseConfig = readFirebaseConfig(import.meta.env);

/** Локальные эмуляторы Auth + Firestore (npm run emulators). Только для разработки. */
const useEmulators = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === 'true';

type FirebaseServices = { app: FirebaseApp; auth: Auth; db: Firestore };

let services: FirebaseServices | null = null;

/** Единственная точка инициализации Firebase. Бросает, если конфиг не задан. */
export function getFirebase(): FirebaseServices {
  if (services) return services;
  if (!firebaseConfig.ok) {
    throw new Error(`Firebase не настроен: не заданы ${firebaseConfig.missing.join(', ')}`);
  }
  const app = initializeApp(firebaseConfig.options);
  // Локальный кэш в IndexedDB: быстрый повторный старт и меньше платных чтений.
  const db = initializeFirestore(app, {
    localCache: useEmulators
      ? memoryLocalCache()
      : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  const auth = getAuth(app);
  if (useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  services = { app, auth, db };
  return services;
}
