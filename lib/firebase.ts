import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import configJson from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: configJson.apiKey,
  authDomain: configJson.authDomain,
  projectId: configJson.projectId,
  storageBucket: configJson.storageBucket,
  messagingSenderId: configJson.messagingSenderId,
  appId: configJson.appId,
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with robust multi-tab offline persistence and ignoreUndefinedProperties
let firestoreDb: ReturnType<typeof getFirestore>;

try {
  if (typeof window !== 'undefined') {
    firestoreDb = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    }, configJson.firestoreDatabaseId || '(default)');
  } else {
    firestoreDb = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
    }, configJson.firestoreDatabaseId || '(default)');
  }
} catch {
  // If already initialized
  firestoreDb = getFirestore(app, configJson.firestoreDatabaseId || '(default)');
}

export const db = firestoreDb;
export const auth = getAuth(app);

// Default Business ID for the MEI artisan cheese operation
export const DEFAULT_BUSINESS_ID = 'queijaria-artesanal-01';

// Ensure user has auth session (anonymous or authenticated) for firestore rules access
export async function ensureAuthSession(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(null);
    }, 800);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          unsubscribe();
          resolve(cred.user);
        } catch {
          unsubscribe();
          resolve(null);
        }
      }
    });
  });
}
