import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
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

// Default Business ID for the MEI artisan cheese operation (fallback de segurança)
export const DEFAULT_BUSINESS_ID = 'queijaria-artesanal-01';

/**
 * Verifica se já existe um usuário autenticado persistido no dispositivo.
 * Retorna o usuário ou null se não houver login prévio (sem criar sessão anônima).
 */
export async function ensureAuthSession(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(auth.currentUser);
      }
    }, 1500);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        unsubscribe();
        resolve(user);
      }
    });
  });
}

/**
 * Busca na coleção raiz 'userBusinessMap/{uid}' o ID do negócio vinculado ao usuário.
 * Retorna o businessId (string) ou null se não houver documento cadastrado.
 */
export async function resolveBusinessId(uid: string): Promise<string | null> {
  if (!uid) return null;
  try {
    const docRef = doc(db, 'userBusinessMap', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return typeof data?.businessId === 'string' && data.businessId ? data.businessId : null;
    }
    return null;
  } catch (err) {
    console.warn('Erro ao resolver businessId do usuário:', err);
    return null;
  }
}

export interface UserBusinessMapping {
  businessId: string;
  businessName: string;
  role: 'owner' | 'seller';
}

/**
 * Obtém dados completos do mapeamento de negócio do usuário (ID, Nome e Papel).
 */
export async function resolveUserBusiness(uid: string): Promise<UserBusinessMapping | null> {
  if (!uid) return null;
  try {
    const docRef = doc(db, 'userBusinessMap', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        businessId: typeof data?.businessId === 'string' && data.businessId ? data.businessId : DEFAULT_BUSINESS_ID,
        businessName: typeof data?.businessName === 'string' && data.businessName ? data.businessName : 'Queijaria Artesanal',
        role: data?.role === 'seller' ? 'seller' : 'owner',
      };
    }
    return null;
  } catch (err) {
    console.warn('Erro ao carregar dados do negócio:', err);
    return null;
  }
}

/**
 * Permite vincular o UID a um negócio na coleção userBusinessMap/{uid}.
 */
export async function setUserBusinessMap(
  uid: string,
  businessId: string,
  businessName: string,
  role: 'owner' | 'seller' = 'owner'
): Promise<void> {
  const docRef = doc(db, 'userBusinessMap', uid);
  await setDoc(
    docRef,
    {
      businessId,
      businessName,
      role,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Consulta o documento raiz businesses/{businessId} e retorna se o negócio está ativo (active === true).
 * Se o campo active não estiver definido, considera ativo por padrão (true).
 */
export async function getBusinessActiveStatus(businessId: string): Promise<boolean> {
  if (!businessId) return false;
  try {
    const docRef = doc(db, 'businesses', businessId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data?.active !== false;
    }
    return true;
  } catch (err) {
    console.warn('Erro ao verificar status active do negócio:', err);
    return true;
  }
}


