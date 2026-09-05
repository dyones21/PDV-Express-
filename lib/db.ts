import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  increment,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  SnapshotMetadata,
  writeBatch,
} from 'firebase/firestore';
import { db, DEFAULT_BUSINESS_ID, ensureAuthSession } from './firebase';
import { Customer, Product, Sale, Payment, Seller, Business } from '@/types';
import { hashPin, generateSalt } from './security';

export { DEFAULT_BUSINESS_ID };

export function isFirestoreSentinel(val: any): boolean {
  if (!val || typeof val !== 'object') return false;
  if ('_methodName' in val) return true;
  const name = val.constructor?.name;
  if (name && (name === 'FieldValue' || name.includes('FieldValue') || name.includes('Transform') || name === 'Timestamp')) return true;
  return false;
}

/**
 * Recursively cleans any data object received from Firestore or local storage,
 * ensuring no FieldValue sentinel objects ({_methodName, ar} or {_methodName, _operand})
 * can ever leak into React components as children.
 */
export function sanitizeDocData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'object') {
    // If it's a Firestore FieldValue sentinel
    if ('_methodName' in (obj as any)) {
      const sentinel = obj as any;
      if (typeof sentinel._operand === 'number') return sentinel._operand as any;
      if (typeof sentinel.ar === 'number') return sentinel.ar as any;
      return 0 as any;
    }

    // If it's a Firestore Timestamp with toDate()
    if (typeof (obj as any).toDate === 'function') {
      try {
        return (obj as any).toDate().toISOString() as any;
      } catch {
        return '' as any;
      }
    }

    // Array
    if (Array.isArray(obj)) {
      return obj.map(sanitizeDocData) as any;
    }

    // Plain object
    const result: any = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = sanitizeDocData(val);
    }
    return result as T;
  }

  return obj;
}

/**
 * Safely parses strings, returning fallback if object or undefined
 */
export function sanitizeString(val: any, fallback = ''): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return fallback;
}

/**
 * Safely parses numbers from Firestore documents, guarding against
 * sentinel objects ({_methodName, ar}) or NaN/strings.
 */
export function sanitizeNumber(val: any, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (val && typeof val === 'object') {
    if ('_operand' in val && typeof val._operand === 'number') return val._operand;
    if ('ar' in val && typeof val.ar === 'number') return val.ar;
    return fallback;
  }
  if (typeof val === 'string') {
    const parsed = Number(val);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

/**
 * Strips all undefined values recursively to ensure Firestore never throws undefined errors
 */
export function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !isFirestoreSentinel(value) &&
        !(value instanceof Date)
      ) {
        result[key] = cleanUndefined(value);
      } else if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          item !== null && typeof item === 'object' && !isFirestoreSentinel(item) && !(item instanceof Date)
            ? cleanUndefined(item)
            : item
        );
      } else {
        result[key] = value;
      }
    }
  }
  return result as T;
}

// Helpers to get sub-collections for a specific business
export function getBusinessRef(businessId = DEFAULT_BUSINESS_ID) {
  return doc(db, 'businesses', businessId);
}

export function getCustomersCol(businessId = DEFAULT_BUSINESS_ID) {
  return collection(db, 'businesses', businessId, 'customers');
}

export function getProductsCol(businessId = DEFAULT_BUSINESS_ID) {
  return collection(db, 'businesses', businessId, 'products');
}

export function getSalesCol(businessId = DEFAULT_BUSINESS_ID) {
  return collection(db, 'businesses', businessId, 'sales');
}

export function getPaymentsCol(businessId = DEFAULT_BUSINESS_ID) {
  return collection(db, 'businesses', businessId, 'payments');
}

export function getSellersCol(businessId = DEFAULT_BUSINESS_ID) {
  return collection(db, 'businesses', businessId, 'sellers');
}

// Initial Seeding for first-time use
export async function ensureDefaultBusinessData(
  businessId = DEFAULT_BUSINESS_ID,
  businessName?: string
): Promise<void> {
  try {
    await ensureAuthSession();
    const bRef = getBusinessRef(businessId);
    const bSnap = await getDoc(bRef);

    if (!bSnap.exists()) {
      // Create business doc
      await setDoc(bRef, cleanUndefined({
        id: businessId,
        name: businessName || 'Meu Negócio',
        createdAt: new Date().toISOString(),
        active: true,
      }));
    } else if (businessName && bSnap.data()?.name !== businessName) {
      await updateDoc(bRef, cleanUndefined({
        name: businessName,
      }));
    }

    // Check sellers
    const sellersSnap = await getDocs(getSellersCol(businessId));
    if (sellersSnap.empty) {
      // Default seller 1: "Vendedor Principal" (PIN: 1234)
      const salt1 = generateSalt();
      const hash1 = await hashPin('1234', salt1);
      const seller1Ref = doc(getSellersCol(businessId), 'vendedor-principal');
      await setDoc(seller1Ref, cleanUndefined({
        name: 'João (Vendedor)',
        role: 'owner',
        pinHash: hash1,
        pinSalt: salt1,
        active: true,
        createdAt: new Date().toISOString(),
      }));

      // Default seller 2: "Ajudante" (PIN: 5678)
      const salt2 = generateSalt();
      const hash2 = await hashPin('5678', salt2);
      const seller2Ref = doc(getSellersCol(businessId), 'ajudante-rota');
      await setDoc(seller2Ref, cleanUndefined({
        name: 'Lucas (Ajudante)',
        role: 'seller',
        pinHash: hash2,
        pinSalt: salt2,
        active: true,
        createdAt: new Date().toISOString(),
      }));
    }

    // Check products
    const prodSnap = await getDocs(getProductsCol(businessId));
    if (prodSnap.empty) {
      const defaultProducts: Array<Omit<Product, 'id'>> = [
        { name: 'Produto Exemplo 1', price: 35.0, costPrice: 20.0, stockQuantity: 20, unit: 'un', active: true, category: 'Geral', sortOrder: 1 },
        { name: 'Produto Exemplo 2', price: 45.0, costPrice: 28.0, stockQuantity: 15, unit: 'un', active: true, category: 'Geral', sortOrder: 2 },
      ];

      for (const p of defaultProducts) {
        await addDoc(getProductsCol(businessId), cleanUndefined(p));
      }
    }

    // Check customers
    const custSnap = await getDocs(getCustomersCol(businessId));
    if (custSnap.empty) {
      const sampleCustomers = [
        {
          name: 'Dona Maria (Casa Amarela)',
          phone: '(11) 98765-4321',
          address: 'Rua das Flores, 142',
          referencePoint: 'Em frente ao mercadinho do Zé',
          totalDebt: 35.0,
          totalPurchased: 105.0,
          lastPurchaseDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        },
        {
          name: 'Seu Antônio (Padaria)',
          phone: '(11) 97654-3210',
          address: 'Av. Central, 850',
          referencePoint: 'Ao lado da farmácia',
          totalDebt: 0.0,
          totalPurchased: 240.0,
          lastPurchaseDate: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        },
        {
          name: 'Cláudia (Sobrado Verde)',
          phone: '(11) 99123-8899',
          address: 'Rua Bahia, 55',
          referencePoint: 'Portão preto alto',
          totalDebt: 45.0,
          totalPurchased: 90.0,
          lastPurchaseDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        },
      ];

      for (const c of sampleCustomers) {
        const cRef = await addDoc(getCustomersCol(businessId), cleanUndefined(c));
        // Create initial pending sample sale if debt > 0
        if (c.totalDebt > 0) {
          await addDoc(getSalesCol(businessId), cleanUndefined({
            customerId: cRef.id,
            customerName: c.name,
            customerPhone: c.phone,
            customerAddress: c.address,
            customerReferencePoint: c.referencePoint,
            sellerId: 'vendedor-principal',
            sellerName: 'João (Vendedor)',
            items: [
              {
                productId: 'sample',
                productName: 'Produto Exemplo 1',
                quantity: 1,
                unitPrice: c.totalDebt,
                subtotal: c.totalDebt,
                unit: 'un',
              },
            ],
            totalAmount: c.totalDebt,
            paidAmount: 0,
            remainingAmount: c.totalDebt,
            paymentStatus: 'pending',
            paymentMethod: 'dinheiro',
            notes: 'Ficou para acertar na próxima passada de sexta-feira',
            saleDate: c.lastPurchaseDate,
            createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          }));
        }
      }
    }
  } catch (err) {
    console.warn('ensureDefaultBusinessData notice:', err);
  }
}

/**
 * Provisions a fresh business without any sample products, customers, sales or payments.
 * Creates the business document and a single 'owner' seller with the user's name and 4-digit PIN.
 */
export async function provisionNewBusiness(
  businessId: string,
  businessName: string,
  ownerName: string,
  ownerPin: string,
  ownerEmail?: string,
  ownerUid?: string
): Promise<void> {
  await ensureAuthSession();
  const bRef = getBusinessRef(businessId);
  const bSnap = await getDoc(bRef);

  if (!bSnap.exists()) {
    await setDoc(bRef, cleanUndefined({
      id: businessId,
      name: businessName,
      createdAt: new Date().toISOString(),
      active: false,
      ownerEmail: ownerEmail || undefined,
      ownerUid: ownerUid || undefined,
    }));
  }

  // Cria UM único vendedor (o dono, usando o nome e PIN informados no cadastro, role: 'owner')
  const cleanPin = ownerPin.trim();
  const salt = generateSalt();
  const hash = await hashPin(cleanPin, salt);
  const sellerRef = doc(getSellersCol(businessId));
  await setDoc(sellerRef, cleanUndefined({
    name: ownerName.trim(),
    role: 'owner',
    pinHash: hash,
    pinSalt: salt,
    active: true,
    createdAt: new Date().toISOString(),
  }));
}

/**
 * Deletes all documents from products, customers, sales, and payments subcollections
 * for the specified business, keeping sellers and the business doc intact.
 */
export async function clearBusinessTestData(businessId = DEFAULT_BUSINESS_ID): Promise<void> {
  await ensureAuthSession();

  const collectionsToClear = [
    getProductsCol(businessId),
    getCustomersCol(businessId),
    getSalesCol(businessId),
    getPaymentsCol(businessId),
  ];

  for (const colRef of collectionsToClear) {
    const snap = await getDocs(colRef);
    if (snap.empty) continue;

    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const chunk = docs.slice(i, i + 400);
      const batch = writeBatch(db);
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      await batch.commit();
    }
  }
}

// ----------------- CUSTOMERS -----------------

export function subscribeCustomers(
  businessId = DEFAULT_BUSINESS_ID,
  callback: (customers: Customer[], metadata: SnapshotMetadata) => void
) {
  const q = query(getCustomersCol(businessId), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const customers: Customer[] = snapshot.docs.map((docSnap) => {
        const cleanData = sanitizeDocData(docSnap.data());
        return {
          id: docSnap.id,
          ...cleanData,
          name: sanitizeString(cleanData.name, 'Cliente'),
          phone: sanitizeString(cleanData.phone, ''),
          cpf: sanitizeString(cleanData.cpf, ''),
          address: sanitizeString(cleanData.address, ''),
          referencePoint: sanitizeString(cleanData.referencePoint, ''),
          totalDebt: sanitizeNumber(cleanData.totalDebt, 0),
          totalPurchased: sanitizeNumber(cleanData.totalPurchased, 0),
        } as Customer;
      });
      callback(customers, snapshot.metadata);
    },
    (err) => console.warn('subscribeCustomers error:', err)
  );
}

export async function addCustomer(
  businessId = DEFAULT_BUSINESS_ID,
  customerData: Omit<Customer, 'id' | 'createdAt' | 'totalDebt' | 'totalPurchased'>
): Promise<string> {
  await ensureAuthSession();
  const docRef = await addDoc(getCustomersCol(businessId), cleanUndefined({
    active: true,
    ...customerData,
    totalDebt: 0,
    totalPurchased: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  return docRef.id;
}

export async function updateCustomer(
  businessId = DEFAULT_BUSINESS_ID,
  customerId: string,
  updates: Partial<Customer>
): Promise<void> {
  await ensureAuthSession();
  const docRef = doc(getCustomersCol(businessId), customerId);
  await updateDoc(docRef, cleanUndefined({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));
}

// ----------------- PRODUCTS -----------------

export function subscribeProducts(
  businessId = DEFAULT_BUSINESS_ID,
  callback: (products: Product[]) => void
) {
  const q = query(getProductsCol(businessId), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const products: Product[] = snapshot.docs.map((docSnap) => {
        const cleanData = sanitizeDocData(docSnap.data());
        return {
          id: docSnap.id,
          ...cleanData,
          name: sanitizeString(cleanData.name, 'Sem nome'),
          unit: sanitizeString(cleanData.unit, 'un'),
          category: sanitizeString(cleanData.category, 'Geral'),
          stockQuantity: sanitizeNumber(cleanData.stockQuantity, 0),
          price: sanitizeNumber(cleanData.price, 0),
          costPrice: sanitizeNumber(cleanData.costPrice, 0),
        } as Product;
      });
      callback(products);
    },
    (err) => console.warn('subscribeProducts error:', err)
  );
}

export async function addProduct(
  businessId = DEFAULT_BUSINESS_ID,
  productData: Omit<Product, 'id'>
): Promise<string> {
  await ensureAuthSession();
  const docRef = await addDoc(getProductsCol(businessId), cleanUndefined(productData));
  return docRef.id;
}

export async function updateProduct(
  businessId = DEFAULT_BUSINESS_ID,
  productId: string,
  updates: Partial<Product>
): Promise<void> {
  await ensureAuthSession();
  const docRef = doc(getProductsCol(businessId), productId);
  await updateDoc(docRef, cleanUndefined(updates));
}

export async function restockProduct(
  businessId = DEFAULT_BUSINESS_ID,
  productId: string,
  addedQuantity: number,
  newCostPrice?: number,
  newSalePrice?: number
): Promise<void> {
  await ensureAuthSession();
  const docRef = doc(getProductsCol(businessId), productId);
  const updates: Record<string, any> = {
    stockQuantity: increment(addedQuantity),
  };
  if (newCostPrice !== undefined && newCostPrice > 0) {
    updates.costPrice = newCostPrice;
  }
  if (newSalePrice !== undefined && newSalePrice > 0) {
    updates.price = newSalePrice;
  }
  await updateDoc(docRef, cleanUndefined(updates));
}

// ----------------- SALES -----------------

export function subscribeSales(
  businessId = DEFAULT_BUSINESS_ID,
  callback: (sales: Sale[], metadata: SnapshotMetadata) => void
) {
  const q = query(getSalesCol(businessId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const sales: Sale[] = snapshot.docs.map((docSnap) => {
        const cleanData = sanitizeDocData(docSnap.data());
        return {
          id: docSnap.id,
          hasPendingWrites: docSnap.metadata.hasPendingWrites,
          ...cleanData,
          customerName: sanitizeString(cleanData.customerName, 'Cliente Avulso'),
          sellerName: sanitizeString(cleanData.sellerName, 'Vendedor'),
          notes: sanitizeString(cleanData.notes, ''),
          totalAmount: sanitizeNumber(cleanData.totalAmount, 0),
          paidAmount: sanitizeNumber(cleanData.paidAmount, 0),
          remainingAmount: sanitizeNumber(cleanData.remainingAmount, 0),
          items: Array.isArray(cleanData.items)
            ? cleanData.items.map((item: any) => ({
                ...item,
                productName: sanitizeString(item.productName, 'Produto'),
                unit: sanitizeString(item.unit, 'un'),
                quantity: sanitizeNumber(item.quantity, 1),
                unitPrice: sanitizeNumber(item.unitPrice, 0),
                subtotal: sanitizeNumber(item.subtotal, 0),
              }))
            : [],
        } as Sale;
      });
      callback(sales, snapshot.metadata);
    },
    (err) => console.warn('subscribeSales error:', err)
  );
}

export async function recordSale(
  businessId = DEFAULT_BUSINESS_ID,
  saleData: Omit<Sale, 'id' | 'createdAt' | 'hasPendingWrites'>
): Promise<string> {
  await ensureAuthSession();
  const nowIso = new Date().toISOString();
  
  // 1. Create Sale Doc
  const docRef = await addDoc(getSalesCol(businessId), cleanUndefined({
    ...saleData,
    createdAt: nowIso,
  }));

  // 2. If tied to customer, update customer metrics
  if (saleData.customerId) {
    try {
      const cRef = doc(getCustomersCol(businessId), saleData.customerId);
      await updateDoc(cRef, cleanUndefined({
        totalDebt: increment(Number(saleData.remainingAmount || 0)),
        totalPurchased: increment(Number(saleData.totalAmount || 0)),
        lastPurchaseDate: saleData.saleDate,
        updatedAt: nowIso,
      }));
    } catch (e: any) {
      console.error('Erro ao atualizar saldo do cliente:', e);
      throw new Error(`A venda foi gravada, mas houve erro ao atualizar o saldo do cliente: ${e?.message || e}`);
    }
  }

  // 3. If paid partially or fully on the spot, record initial payment entry
  if (saleData.paidAmount > 0) {
    try {
      await addDoc(getPaymentsCol(businessId), cleanUndefined({
        saleId: docRef.id,
        customerId: saleData.customerId || 'avulso',
        customerName: saleData.customerName,
        amount: saleData.paidAmount,
        remainingDebtAfter: saleData.remainingAmount,
        sellerId: saleData.sellerId,
        sellerName: saleData.sellerName,
        paymentMethod: saleData.paymentMethod,
        paymentDate: saleData.saleDate,
        notes: saleData.paymentStatus === 'paid' ? 'Pago à vista no ato da venda' : 'Entrada paga no ato da venda',
        createdAt: nowIso,
      }));
    } catch (e) {
      console.warn('Initial payment record warning:', e);
    }
  }

  // 4. Update Product Stock (Decrement stockQuantity)
  if (saleData.items && saleData.items.length > 0) {
    for (const item of saleData.items) {
      try {
        if (item.productId && item.productId !== 'sample') {
          const pRef = doc(getProductsCol(businessId), item.productId);
          const qty = Number(item.quantity || 0);
          if (qty > 0) {
            await updateDoc(pRef, cleanUndefined({
              stockQuantity: increment(-qty),
            }));
          }
        }
      } catch (e: any) {
        console.error('Erro ao decrementar estoque do produto na venda:', e);
      }
    }
  }

  return docRef.id;
}

export async function cancelSale(
  businessId = DEFAULT_BUSINESS_ID,
  saleId: string,
  cancelledBySellerName: string,
  reason?: string
): Promise<void> {
  await ensureAuthSession();
  const sRef = doc(getSalesCol(businessId), saleId);
  const sSnap = await getDoc(sRef);
  if (!sSnap.exists()) {
    throw new Error('Venda não encontrada');
  }

  const saleData = sSnap.data() as Sale;
  if (saleData.isCancelled || saleData.paymentStatus === 'cancelled') {
    throw new Error('Esta venda já está cancelada');
  }

  const nowIso = new Date().toISOString();

  // 1. Mark Sale as cancelled
  await updateDoc(sRef, cleanUndefined({
    isCancelled: true,
    paymentStatus: 'cancelled',
    cancelledAt: nowIso,
    cancelledBy: cancelledBySellerName || 'Dono',
    cancellationReason: reason || 'Cancelada pelo responsável',
  }));

  // 2. Return quantities to product stock
  if (saleData.items && saleData.items.length > 0) {
    for (const item of saleData.items) {
      try {
        if (item.productId && item.productId !== 'sample') {
          const pRef = doc(getProductsCol(businessId), item.productId);
          const qty = Number(item.quantity || 0);
          if (qty > 0) {
            await updateDoc(pRef, cleanUndefined({
              stockQuantity: increment(qty),
            }));
          }
        }
      } catch (e) {
        console.error('Erro ao restaurar estoque no cancelamento da venda:', e);
      }
    }
  }

  // 3. If there was open debt (remainingAmount > 0) for a customer, deduct from customer balance
  if (saleData.customerId && saleData.customerId !== 'avulso') {
    try {
      const cRef = doc(getCustomersCol(businessId), saleData.customerId);
      const remainingToDeduct = Number(saleData.remainingAmount || 0);
      const totalToDeduct = Number(saleData.totalAmount || 0);

      await updateDoc(cRef, cleanUndefined({
        totalDebt: increment(-remainingToDeduct),
        totalPurchased: increment(-totalToDeduct),
        updatedAt: nowIso,
      }));
    } catch (e: any) {
      console.error('Erro ao reverter saldo do cliente no cancelamento:', e);
      throw new Error(`Venda cancelada, mas houve erro ao reverter saldo do cliente: ${e?.message || e}`);
    }
  }
}

// ----------------- PAYMENTS / FIADO SETTLEMENT -----------------

export function subscribePayments(
  businessId = DEFAULT_BUSINESS_ID,
  callback: (payments: Payment[], metadata: SnapshotMetadata) => void
) {
  const q = query(getPaymentsCol(businessId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const payments: Payment[] = snapshot.docs.map((docSnap) => {
        const cleanData = sanitizeDocData(docSnap.data());
        return {
          id: docSnap.id,
          ...cleanData,
          customerName: sanitizeString(cleanData.customerName, ''),
          sellerName: sanitizeString(cleanData.sellerName, ''),
          notes: sanitizeString(cleanData.notes, ''),
          amount: sanitizeNumber(cleanData.amount, 0),
          remainingDebtAfter: sanitizeNumber(cleanData.remainingDebtAfter, 0),
        } as Payment;
      });
      callback(payments, snapshot.metadata);
    },
    (err) => console.warn('subscribePayments error:', err)
  );
}

export interface SalePaymentUpdate {
  saleId: string;
  newPaidAmount: number;
  newRemainingAmount: number;
  newStatus: 'paid' | 'partial';
}

export async function recordPayment(
  businessId = DEFAULT_BUSINESS_ID,
  paymentData: {
    customerId: string;
    customerName: string;
    amount: number;
    sellerId: string;
    sellerName: string;
    paymentMethod: Sale['paymentMethod'];
    paymentDate: string;
    notes?: string;
    saleId?: string; // Optional target sale
  },
  saleUpdates?: SalePaymentUpdate[]
): Promise<string> {
  await ensureAuthSession();
  const nowIso = new Date().toISOString();

  // 1. Record payment doc
  const payRef = await addDoc(getPaymentsCol(businessId), cleanUndefined({
    ...paymentData,
    createdAt: nowIso,
  }));

  // 2. Deduct from customer total debt
  if (paymentData.customerId && paymentData.customerId !== 'avulso') {
    try {
      const cRef = doc(getCustomersCol(businessId), paymentData.customerId);
      await updateDoc(cRef, cleanUndefined({
        totalDebt: increment(-Number(paymentData.amount || 0)),
        updatedAt: nowIso,
      }));
    } catch (e: any) {
      console.error('Erro ao deduzir dívida do cliente no pagamento:', e);
      throw new Error(`Pagamento registrado, mas houve erro ao abater a dívida do cliente: ${e?.message || e}`);
    }
  }

  // 3. Update settled sales (using pre-calculated updates without reading Firestore)
  if (saleUpdates && saleUpdates.length > 0) {
    for (const update of saleUpdates) {
      try {
        const sRef = doc(getSalesCol(businessId), update.saleId);
        await updateDoc(sRef, cleanUndefined({
          paidAmount: update.newPaidAmount,
          remainingAmount: update.newRemainingAmount,
          paymentStatus: update.newStatus,
          updatedAt: nowIso,
        }));
      } catch (e: any) {
        console.error(`Erro ao atualizar venda ${update.saleId}:`, e);
        throw new Error(`Pagamento registrado, mas houve erro ao atualizar a venda: ${e?.message || e}`);
      }
    }
  }

  return payRef.id;
}

// ----------------- SELLERS -----------------

export function subscribeSellers(
  businessId = DEFAULT_BUSINESS_ID,
  callback: (sellers: Seller[]) => void
) {
  const q = query(getSellersCol(businessId), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const sellers: Seller[] = snapshot.docs.map((docSnap) => {
        const cleanData = sanitizeDocData(docSnap.data());
        return {
          id: docSnap.id,
          ...cleanData,
          name: sanitizeString(cleanData.name, 'Vendedor'),
          role: cleanData.role === 'owner' ? 'owner' : 'seller',
          active: cleanData.active !== false,
        } as Seller;
      });
      callback(sellers);
    },
    (err) => console.warn('subscribeSellers error:', err)
  );
}

export async function addSeller(
  businessId = DEFAULT_BUSINESS_ID,
  sellerData: { name: string; role: 'owner' | 'seller'; pin: string }
): Promise<string> {
  await ensureAuthSession();
  const salt = generateSalt();
  const pinHash = await hashPin(sellerData.pin, salt);

  const docRef = await addDoc(getSellersCol(businessId), cleanUndefined({
    name: sellerData.name,
    role: sellerData.role,
    pinHash,
    pinSalt: salt,
    active: true,
    createdAt: new Date().toISOString(),
  }));

  return docRef.id;
}

export async function updateSeller(
  businessId = DEFAULT_BUSINESS_ID,
  sellerId: string,
  updates: Partial<Seller> | { active?: boolean }
): Promise<void> {
  await ensureAuthSession();
  const docRef = doc(getSellersCol(businessId), sellerId);
  await updateDoc(docRef, cleanUndefined(updates));
}

