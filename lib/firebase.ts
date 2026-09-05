import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import configJson from '../firebase-applet-config.json';

export const TARGET_PROJECT_ID = 'pdvexpress-c286f';
export const TARGET_DATABASE_ID = '(default)';

const firebaseConfig = {
  apiKey: configJson.apiKey,
  authDomain: configJson.authDomain || 'pdvexpress-c286f.firebaseapp.com',
  projectId: TARGET_PROJECT_ID,
  storageBucket: configJson.storageBucket || 'pdvexpress-c286f.firebasestorage.app',
  messagingSenderId: configJson.messagingSenderId,
  appId: configJson.appId,
};

// Initialize Firebase App exclusivamente com o projeto default pdvexpress-c286f
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const ACTIVE_DATABASE_ID = TARGET_DATABASE_ID;

// Inicializa o Firestore exclusivamente usando o banco (default) do projeto pdvexpress-c286f
let firestoreDb: ReturnType<typeof getFirestore>;

try {
  if (typeof window !== 'undefined') {
    const settings = {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    };
    firestoreDb = initializeFirestore(app, settings, TARGET_DATABASE_ID);
  } else {
    const settings = { ignoreUndefinedProperties: true };
    firestoreDb = initializeFirestore(app, settings, TARGET_DATABASE_ID);
  }
} catch {
  try {
    firestoreDb = getFirestore(app, TARGET_DATABASE_ID);
  } catch {
    firestoreDb = getFirestore(app, TARGET_DATABASE_ID);
  }
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
 * Possui fallback inteligente por ownerUid na coleção 'businesses' caso o mapeamento ainda não tenha sincronizado.
 */
export async function resolveBusinessId(uid: string): Promise<string | null> {
  if (!uid) return null;
  try {
    const docRef = doc(db, 'userBusinessMap', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (typeof data?.businessId === 'string' && data.businessId) {
        return data.businessId;
      }
    }

    // Fallback: verificar se já existe negócio criado com ownerUid == uid
    const q = query(collection(db, 'businesses'), where('ownerUid', '==', uid));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      const bDoc = querySnap.docs[0];
      const foundBId = bDoc.id;
      // Auto-repara o mapeamento no userBusinessMap para acessos futuros rápidos
      try {
        await setDoc(docRef, {
          businessId: foundBId,
          businessName: bDoc.data()?.name || 'Meu Negócio',
          role: 'owner',
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Auto-reparo do userBusinessMap não pôde ser gravado:', e);
      }
      return foundBId;
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
        businessName: typeof data?.businessName === 'string' && data.businessName ? data.businessName : 'Meu Negócio',
        role: data?.role === 'seller' ? 'seller' : 'owner',
      };
    }

    // Fallback por businesses
    const q = query(collection(db, 'businesses'), where('ownerUid', '==', uid));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      const bDoc = querySnap.docs[0];
      return {
        businessId: bDoc.id,
        businessName: bDoc.data()?.name || 'Meu Negócio',
        role: 'owner',
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
 * Se o campo active não estiver definido ou for conta do próprio dono, considera ativo.
 */
export async function getBusinessActiveStatus(businessId: string): Promise<boolean> {
  if (!businessId) return true;
  try {
    const docRef = doc(db, 'businesses', businessId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Se for o dono do negócio e estiver active: false, ativa automaticamente
      if (data?.active === false && data?.ownerUid === auth.currentUser?.uid) {
        try {
          await updateDoc(docRef, { active: true });
          return true;
        } catch {}
      }
      return data?.active !== false;
    }
    return true;
  } catch (err) {
    console.warn('Erro ao verificar status active do negócio:', err);
    return true;
  }
}


