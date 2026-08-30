import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  SnapshotMetadata,
} from 'firebase/firestore';
import { db, DEFAULT_BUSINESS_ID, ensureAuthSession } from './firebase';
import { Customer, Product, Sale, Payment, Seller, Business } from '@/types';
import { hashPin, generateSalt } from './security';

export { DEFAULT_BUSINESS_ID };

/**
 * Strips all undefined values recursively to ensure Firestore never throws undefined errors
 */
export function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = cleanUndefined(value);
      } else if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          item !== null && typeof item === 'object' ? cleanUndefined(item) : item
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
export async function ensureDefaultBusinessData(businessId = DEFAULT_BUSINESS_ID): Promise<void> {
  try {
    await ensureAuthSession();
    const bRef = getBusinessRef(businessId);
    const bSnap = await getDoc(bRef);

    if (!bSnap.exists()) {
      // Create business doc
      await setDoc(bRef, cleanUndefined({
        id: businessId,
        name: 'Meu Negócio',
        createdAt: new Date().toISOString(),
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
      const customers: Customer[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Customer[];
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
      const products: Product[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Product[];
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
  newCostPrice?: number
): Promise<void> {
  await ensureAuthSession();
  const docRef = doc(getProductsCol(businessId), productId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data() as Product;
    const currentStock = Number(data.stockQuantity !== undefined ? data.stockQuantity : 0);
    const updates: Partial<Product> = {
      stockQuantity: currentStock + addedQuantity,
    };
    if (newCostPrice !== undefined && newCostPrice > 0) {
      updates.costPrice = newCostPrice;
    }
    await updateDoc(docRef, cleanUndefined(updates));
  }
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
      const sales: Sale[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        hasPendingWrites: docSnap.metadata.hasPendingWrites,
        ...docSnap.data(),
      })) as Sale[];
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
      const cSnap = await getDoc(cRef);
      if (cSnap.exists()) {
        const data = cSnap.data() as Customer;
        const currentDebt = Number(data.totalDebt || 0);
        const currentPurchased = Number(data.totalPurchased || 0);
        
        await updateDoc(cRef, cleanUndefined({
          totalDebt: currentDebt + Number(saleData.remainingAmount || 0),
          totalPurchased: currentPurchased + Number(saleData.totalAmount || 0),
          lastPurchaseDate: saleData.saleDate,
          updatedAt: nowIso,
        }));
      }
    } catch (e) {
      console.warn('Customer balance update warning (offline safe):', e);
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
          const pSnap = await getDoc(pRef);
          if (pSnap.exists()) {
            const pData = pSnap.data() as Product;
            const currentStock = Number(pData.stockQuantity !== undefined ? pData.stockQuantity : 0);
            const newStock = Math.max(0, currentStock - Number(item.quantity || 0));
            await updateDoc(pRef, cleanUndefined({
              stockQuantity: newStock,
            }));
          }
        }
      } catch (e) {
        console.warn('Product stock decrement warning (offline safe):', e);
      }
    }
  }

  return docRef.id;
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
      const payments: Payment[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Payment[];
      callback(payments, snapshot.metadata);
    },
    (err) => console.warn('subscribePayments error:', err)
  );
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
  }
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
      const cSnap = await getDoc(cRef);
      if (cSnap.exists()) {
        const cData = cSnap.data() as Customer;
        const currentDebt = Number(cData.totalDebt || 0);
        const newDebt = Math.max(0, currentDebt - paymentData.amount);
        await updateDoc(cRef, cleanUndefined({
          totalDebt: newDebt,
          updatedAt: nowIso,
        }));
      }
    } catch (e) {
      console.warn('Customer balance reduction warning:', e);
    }
  }

  // 3. If specific saleId is provided or if we can auto-settle pending sales for customer
  try {
    if (paymentData.saleId) {
      const sRef = doc(getSalesCol(businessId), paymentData.saleId);
      const sSnap = await getDoc(sRef);
      if (sSnap.exists()) {
        const sData = sSnap.data() as Sale;
        const currentRemaining = Number(sData.remainingAmount || 0);
        const currentPaid = Number(sData.paidAmount || 0);
        const newRemaining = Math.max(0, currentRemaining - paymentData.amount);
        const newPaid = currentPaid + paymentData.amount;
        const newStatus = newRemaining === 0 ? 'paid' : 'partial';

        await updateDoc(sRef, cleanUndefined({
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          paymentStatus: newStatus,
        }));
      }
    } else if (paymentData.customerId) {
      // Auto-apply payment against oldest pending sales for this customer
      const qPending = query(
        getSalesCol(businessId),
        where('customerId', '==', paymentData.customerId),
        where('paymentStatus', 'in', ['pending', 'partial']),
        orderBy('createdAt', 'asc')
      );
      const pendingSnaps = await getDocs(qPending);
      let moneyLeft = paymentData.amount;

      for (const sDoc of pendingSnaps.docs) {
        if (moneyLeft <= 0) break;
        const sData = sDoc.data() as Sale;
        const remaining = Number(sData.remainingAmount || 0);
        const paidNow = Math.min(moneyLeft, remaining);
        const newRemaining = remaining - paidNow;
        const newPaid = Number(sData.paidAmount || 0) + paidNow;
        const newStatus = newRemaining === 0 ? 'paid' : 'partial';

        await updateDoc(sDoc.ref, cleanUndefined({
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          paymentStatus: newStatus,
        }));

        moneyLeft -= paidNow;
      }
    }
  } catch (e) {
    console.warn('Auto-settle sales warning (offline safe):', e);
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
      const sellers: Seller[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Seller[];
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

