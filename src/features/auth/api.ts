import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirebase } from '@/lib/firebase/client';

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebase().auth, email, password);
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut(getFirebase().auth);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebase().auth, email);
}
