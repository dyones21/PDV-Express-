export interface Business {
  id: string;
  name: string;
  ownerEmail?: string;
  ownerUid?: string;
  createdAt: string;
  active?: boolean;
  slug?: string;
}

export interface Seller {
  id: string;
  name: string;
  role: 'owner' | 'seller';
  pinHash?: string;
  pinSalt?: string;
  active: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  cpf?: string;
  address?: string;
  referencePoint?: string;
  active?: boolean;
  nextVisitReminder?: string; // YYYY-MM-DD
  totalDebt?: number;
  totalPurchased?: number;
  lastPurchaseDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  stockQuantity?: number;
  unit: string; // 'un' | 'kg' | 'peça' | 'bandeja'
  active: boolean;
  category?: string;
  sortOrder?: number;
  imageUrl?: string;
}

export interface PublicCatalogItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  imageUrl?: string;
  active: boolean;
}

export interface PublicCatalog {
  businessName: string;
  active: boolean;
  slug?: string;
  updatedAt?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  unit?: string;
}

export type PaymentStatus = 'paid' | 'pending' | 'partial' | 'cancelled';
export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'outro';

export interface Sale {
  id: string;
  customerId: string | null;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerReferencePoint?: string;
  sellerId: string;
  sellerName: string;
  items: SaleItem[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
  saleDate: string; // YYYY-MM-DD
  createdAt: string; // ISO String
  hasPendingWrites?: boolean; // Firestore offline sync status
  latitude?: number;
  longitude?: number;
  isCancelled?: boolean;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
}

export interface Payment {
  id: string;
  saleId?: string;
  customerId: string;
  customerName: string;
  amount: number;
  remainingDebtAfter?: number;
  sellerId: string;
  sellerName: string;
  paymentMethod: PaymentMethod;
  paymentDate: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

export interface DailySummary {
  totalSold: number;
  totalReceivedImmediate: number;
  totalPendingToday: number;
  totalDebtAllTime: number;
  totalSalesCount: number;
  totalPendingSalesCount: number;
}
