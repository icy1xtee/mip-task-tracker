import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { readFirebaseConfig } from './config';

export const firebaseConfig = readFirebaseConfig(import.meta.env);

type FirebaseServices = { app: FirebaseApp; auth: Auth; db: Firestore };

let services: FirebaseServices | null = null;

/** Единственная точка инициализации Firebase. Бросает, если конфиг не задан. */
export function getFirebase(): FirebaseServices {
  if (services) return services;
  if (!firebaseConfig.ok) {
    throw new Error(`Firebase не настроен: не заданы ${firebaseConfig.missing.join(', ')}`);
  }
  const app = initializeApp(firebaseConfig.options);
  services = { app, auth: getAuth(app), db: getFirestore(app) };
  return services;
}
