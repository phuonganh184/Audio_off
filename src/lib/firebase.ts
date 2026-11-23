import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const QUOTA_COOLDOWN_KEY = 'truyen_audio_firestore_quota_until';
const QUOTA_COOLDOWN_MS = 15 * 60 * 1000;
let memoryQuotaCooldownUntil = 0;

export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  const raw =
    error instanceof Error
      ? `${(error as { code?: string }).code || ''} ${error.message}`
      : String(error);
  if (/resource-exhausted|quota\s*limit\s*exceeded|quota\s*exceeded/i.test(raw)) {
    return true;
  }
  if (error instanceof Error && error.message.startsWith('{')) {
    try {
      const parsed = JSON.parse(error.message) as { error?: string };
      if (
        parsed?.error &&
        /resource-exhausted|quota\s*limit\s*exceeded|quota\s*exceeded/i.test(parsed.error)
      ) {
        return true;
      }
    } catch {
      // Ignore JSON parse error
    }
  }
  return false;
}

export function getFirestoreQuotaCooldownUntil(): number {
  let stored = 0;
  try {
    stored = Number(sessionStorage.getItem(QUOTA_COOLDOWN_KEY)) || 0;
  } catch {
    // Ignore storage errors
  }
  return Math.max(memoryQuotaCooldownUntil, stored);
}

export function isFirestoreQuotaCooldownActive(): boolean {
  return Date.now() < getFirestoreQuotaCooldownUntil();
}

export function markFirestoreQuotaExceeded(): number {
  const until = Date.now() + QUOTA_COOLDOWN_MS;
  memoryQuotaCooldownUntil = until;
  try {
    sessionStorage.setItem(QUOTA_COOLDOWN_KEY, String(until));
  } catch {
    // Ignore storage errors
  }
  return until;
}

export function clearFirestoreQuotaCooldown(): void {
  memoryQuotaCooldownUntil = 0;
  try {
    sessionStorage.removeItem(QUOTA_COOLDOWN_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  if (isQuotaExceededError(error)) {
    markFirestoreQuotaExceeded();
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline or unreachable — operating in local offline mode.');
    }
    return false;
  }
}
