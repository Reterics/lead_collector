import type { Auth } from 'firebase/auth';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import FirebaseDBModel from './models/FirebaseDBModel.ts';
import type { FirebaseError } from 'firebase/app';
import type { CommonCollectionData } from './services/firebase.tsx';

const refreshRate = {
  minutes: 60000,
  hours: 3600000,
};

const storageTTL = {
  hot: refreshRate.hours * 12,
  warm: refreshRate.hours * 24 * 2,
  cold: refreshRate.hours * 24 * 7,
};

export const firebaseCollections = {
  questionnaires:
    import.meta.env.VITE_FIREBASE_DB_QUESTIONNAIRES || 'questionnaires',
  users: import.meta.env.VITE_FIREBASE_DB_USERS || 'users',
};

export const firebaseModel = new FirebaseDBModel({
  ttl: {
    questionnaires: storageTTL.cold,
  },
});

const app = firebaseModel.getApp();
export const db = firebaseModel.getDB();

let _firebaseAuth: Auth | null = null;
let _firebaseAuthError: FirebaseError | null = null;
try {
  // Prefer IndexedDB persistence for cross-tab and Capacitor Android support,
  // with a fallback to browser local storage when IndexedDB is unavailable.
  _firebaseAuth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  });
} catch (err: unknown) {
  // If initializeAuth fails because Auth was already initialized or environment constraints,
  // fall back to getAuth(app) and keep the error for diagnostics.
  try {
    _firebaseAuth = getAuth(app);
  } catch (err2: unknown) {
    _firebaseAuthError = (err2 || err) as FirebaseError;
  }
}

export const firebaseAuth = _firebaseAuth;
export const firebaseAuthError = _firebaseAuthError;

export const getCollection = async <T extends CommonCollectionData>(
  table: string,
  force?: boolean,
) => {
  return (await firebaseModel.getAll(table, force)) as unknown as T[];
};

export const getById = (id: string, table: string) => {
  return firebaseModel.get(id, table);
};

export default app;
