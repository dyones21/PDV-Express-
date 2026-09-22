import { Timestamp } from 'firebase/firestore';

export interface Business {
  id: string;
  name: string;
  ownerEmail?: string;
  ownerUid?: string;
  createdAt: string;
  active?: boolean;
  trialEndsAt?: Timestamp;
  slug?: string;
  orderWhatsapp?: string;
  logoUrl?: string;
}

export interface BusinessNotice {
  id: string;
  title: string;
  message: string;
  type: 'payment_reminder' | 'update' | 'general';
  createdAt: string;
  read: boolean;
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
  priceTableId?: string;
  nextVisitReminder?: string; // YYYY-MM-DD
  totalDebt?: number;
  totalPurchased?: number;
  lastPurchaseDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PriceTable {
  id: string;
  name: string;
  discountPercent: number; // 0 a 100
  active: boolean;
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
  category?: string;
  imageUrl?: string;
  active: boolean;
  inStock?: boolean;
}

export interface PublicCatalog {
  businessName: string;
  active: boolean;
  slug?: string;
  orderWhatsapp?: string;
  logoUrl?: string;
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
  discountType?: 'percent' | 'fixed';
  discountValue?: number; // valor digitado (ex: 10 para 10%, ou 5 para R$5)
  discountAmount?: number; // valor final em R$ já calculado, para referência/histórico
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentBreakdown?: { method: PaymentMethod; amount: number }[];
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
  nextVisitDate?: string; // YYYY-MM-DD (data de retorno ou próxima visita combinada)
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
  paymentBreakdown?: { method: PaymentMethod; amount: number }[];
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
