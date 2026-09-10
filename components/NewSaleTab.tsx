'use client';

import React, { useState, useRef } from 'react';
import { Customer, Product, SaleItem, PaymentStatus, PaymentMethod } from '@/types';
import { formatCurrency, formatCurrencyInput, parseCurrencyToNumber, formatPhone, getTodayDateString, formatDateBr } from '@/lib/format';
import { useSellerAuth } from '@/hooks/use-seller-auth';
import { useNetworkSync } from '@/hooks/use-network-sync';
import { useBusiness } from '@/context/BusinessContext';
import { recordSale, addCustomer, updateCustomer } from '@/lib/db';
import { 
  User, 
  Search, 
  Plus, 
  Minus, 
  Check, 
  ShoppingBag, 
  CreditCard, 
  Coins, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  Sparkles, 
  Share2,
  X,
  CalendarClock,
  AlertTriangle,
} from 'lucide-react';

interface NewSaleTabProps {
  customers: Customer[];
  products: Product[];
  onSaleCompleted: () => void;
  onSearchFocusChange?: (focused: boolean) => void;
}

export function NewSaleTab({ customers, products, onSaleCompleted, onSearchFocusChange }: NewSaleTabProps) {
  const { businessId } = useBusiness();
  const { activeSeller } = useSellerAuth();
  const { isOnline } = useNetworkSync();

  // State: Customer
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);

  // New Customer Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustRef, setNewCustRef] = useState('');

  // State: Cart Items (mapping productId -> quantity)
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customPriceOverrides, setCustomPriceOverrides] = useState<Record<string, number>>({});
  const [productSearch, setProductSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // State: Payment
  const [paymentOption, setPaymentOption] = useState<'paid_full' | 'pending_full' | 'partial'>('paid_full');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [partialPaidInput, setPartialPaidInput] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Helper para selecionar Cliente Avulso garantindo reset de fiado
  const handleSelectAnonymous = () => {
    setIsAnonymous(true);
    setSelectedCustomerId('');
    setPaymentOption('paid_full');
  };

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successSaleData, setSuccessSaleData] = useState<any | null>(null);

  // Safety ref: prevents duplicate sale if previous attempt finished saving in background/local cache
  const pendingSavedSaleRef = useRef<{ id: string; saleData: Record<string, any>; warnings?: string[] } | null>(null);

  // Next visit reminder in sale success modal
  const [selectedReminderDate, setSelectedReminderDate] = useState<string>('');
  const [reminderSkipped, setReminderSkipped] = useState(false);
  const [isCustomDatePickerOpen, setIsCustomDatePickerOpen] = useState(false);
  const [customDateInput, setCustomDateInput] = useState('');
  const [isSavingReminder, setIsSavingReminder] = useState(false);

  // Filtered active products
  const activeProducts = products.filter((p) => p.active !== false);

  const normalizeStr = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const filteredProducts = activeProducts.filter((p) => {
    if (!productSearch.trim()) return true;
    const term = normalizeStr(productSearch);
    return normalizeStr(p.name).includes(term);
  });

  // Produtos filtrados já selecionados (quantidade > 0) e não selecionados
  const selectedFilteredProducts = filteredProducts.filter((p) => (quantities[p.id] || 0) > 0);
  const unselectedFilteredProducts = filteredProducts.filter((p) => (quantities[p.id] || 0) <= 0);

  // Calculate items and total
  const selectedItems: SaleItem[] = [];
  let calculatedTotal = 0;

  activeProducts.forEach((p) => {
    const qty = quantities[p.id] || 0;
    if (qty > 0) {
      const unitPrice = customPriceOverrides[p.id] !== undefined ? customPriceOverrides[p.id] : p.price;
      const subtotal = qty * unitPrice;
      calculatedTotal += subtotal;
      selectedItems.push({
        productId: p.id,
        productName: p.name,
        quantity: qty,
        unitPrice,
        subtotal,
        unit: p.unit,
      });
    }
  });

  const handleQtyChange = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const renderProductCard = (prod: Product) => {
    const qty = quantities[prod.id] || 0;
    const currentPrice = customPriceOverrides[prod.id] !== undefined ? customPriceOverrides[prod.id] : prod.price;
    const isSelected = qty > 0;
    const stock = typeof prod.stockQuantity === 'number' ? prod.stockQuantity : 0;
    const isOverStock = qty > stock;

    return (
      <div
        key={prod.id}
        id={`product-card-${prod.id}`}
        className={`p-3 rounded-2xl border transition-all ${
          isSelected
            ? 'border-amber-500 bg-amber-50/50 shadow-sm'
            : 'border-neutral-200 bg-white hover:border-neutral-300'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-neutral-900 truncate">
              {typeof prod.name === 'string' && prod.name ? prod.name : 'Produto'}
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-600 mt-0.5 flex-wrap">
              <span className="font-semibold text-amber-900">
                {formatCurrency(currentPrice)}
              </span>
              <span className="text-neutral-400">/ {typeof prod.unit === 'string' && prod.unit ? prod.unit : 'peça'}</span>
              <span className="text-neutral-300">•</span>
              <span
                className={`text-[11px] font-semibold ${
                  stock <= 0
                    ? 'text-red-600'
                    : stock < 5
                    ? 'text-amber-700 font-bold'
                    : 'text-neutral-500'
                }`}
              >
                Estoque: {stock} {typeof prod.unit === 'string' && prod.unit ? prod.unit : 'un'}
              </span>
            </div>
          </div>

          {/* Large Quantity Stepper Buttons */}
          <div className="flex items-center gap-2">
            <button
              id={`btn-minus-${prod.id}`}
              type="button"
              disabled={qty === 0}
              onClick={() => handleQtyChange(prod.id, -1)}
              className="w-10 h-10 rounded-xl bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 text-neutral-800 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center font-bold text-lg transition active:scale-95 shadow-sm"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="w-8 text-center font-extrabold text-base text-neutral-900">
              {qty}
            </div>

            <button
              id={`btn-plus-${prod.id}`}
              type="button"
              onClick={() => handleQtyChange(prod.id, 1)}
              className="w-10 h-10 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white flex items-center justify-center font-bold text-lg transition active:scale-95 shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Overstock soft warning (does not block sale) */}
        {isSelected && isOverStock && (
          <div className="mt-2 text-[11px] text-amber-800 bg-amber-100/80 px-2 py-1 rounded-lg font-medium flex items-center gap-1">
            <span>⚠️</span>
            <span>Qtd ({qty}) excede o estoque cadastrado ({stock} {typeof prod.unit === 'string' && prod.unit ? prod.unit : 'un'}). A venda será permitida normalmente.</span>
          </div>
        )}

        {/* If selected, show subtotal line */}
        {isSelected && (
          <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs">
            <span className="text-amber-800 font-medium">Subtotal deste produto:</span>
            <span className="font-extrabold text-amber-950">
              {formatCurrency(qty * currentPrice)}
            </span>
          </div>
        )}
      </div>
    );
  };

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    try {
      const newId = await addCustomer(businessId, {
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
        address: newCustAddress.trim() || undefined,
        referencePoint: newCustRef.trim() || undefined,
      });

      setSelectedCustomerId(newId);
      setIsAnonymous(false);
      setShowNewCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
      setNewCustRef('');
    } catch (err: any) {
      alert('Erro ao cadastrar cliente: ' + err.message);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Filtered active customers for search (inactive customers should not appear in new sale selection)
  const activeCustomers = customers.filter((c) => c.active !== false);

  // Filtered customers for search
  const filteredCustomers = activeCustomers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const term = customerSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.address && c.address.toLowerCase().includes(term)) ||
      (c.referencePoint && c.referencePoint.toLowerCase().includes(term))
    );
  });

  // Calculate payment amounts
  let paidAmount = 0;
  let remainingAmount = 0;
  let paymentStatus: PaymentStatus = 'paid';

  if (paymentOption === 'paid_full') {
    paidAmount = calculatedTotal;
    remainingAmount = 0;
    paymentStatus = 'paid';
  } else if (paymentOption === 'pending_full') {
    paidAmount = 0;
    remainingAmount = calculatedTotal;
    paymentStatus = 'pending';
  } else {
    // Partial
    const parsedPartial = parseCurrencyToNumber(partialPaidInput);
    paidAmount = Math.min(calculatedTotal, Math.max(0, parsedPartial));
    remainingAmount = Math.max(0, calculatedTotal - paidAmount);
    paymentStatus = remainingAmount === 0 ? 'paid' : 'partial';
  }

  const getDeviceLocation = (): Promise<{ latitude?: number; longitude?: number }> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        resolve({});
        return;
      }
      const geoTimeoutMs = isOnline ? 8000 : 1500;
      const timeoutId = setTimeout(() => {
        resolve({});
      }, geoTimeoutMs);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          clearTimeout(timeoutId);
          console.warn('GPS não capturado (não bloqueante):', error);
          resolve({});
        },
        { enableHighAccuracy: true, timeout: geoTimeoutMs, maximumAge: 60000 }
      );
    });
  };

  const calculateDaysFromToday = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSelectReminderDays = async (days: number) => {
    if (!successSaleData?.customerId) return;
    const calculatedDate = calculateDaysFromToday(days);
    try {
      setIsSavingReminder(true);
      await updateCustomer(businessId, successSaleData.customerId, {
        nextVisitReminder: calculatedDate,
      });
      setSelectedReminderDate(calculatedDate);
    } catch (err: any) {
      console.warn('Erro ao salvar lembrete de visita:', err);
      setSelectedReminderDate(calculatedDate);
    } finally {
      setIsSavingReminder(false);
    }
  };

  const handleSaveCustomReminder = async (dateStr: string) => {
    if (!successSaleData?.customerId || !dateStr) return;
    try {
      setIsSavingReminder(true);
      await updateCustomer(businessId, successSaleData.customerId, {
        nextVisitReminder: dateStr,
      });
      setSelectedReminderDate(dateStr);
      setIsCustomDatePickerOpen(false);
    } catch (err: any) {
      console.warn('Erro ao salvar lembrete de visita:', err);
      setSelectedReminderDate(dateStr);
      setIsCustomDatePickerOpen(false);
    } finally {
      setIsSavingReminder(false);
    }
  };

  const handleSubmitSale = async () => {
    if (selectedItems.length === 0) {
      alert('Selecione pelo menos um produto para a venda.');
      return;
    }

    if (!isAnonymous && !selectedCustomerId) {
      alert('Selecione um cliente cadastrado ou clique em "Cliente Avulso".');
      return;
    }

    if (isAnonymous && paymentOption !== 'paid_full') {
      alert('Fiado só está disponível para clientes cadastrados, pois não é possível cobrar depois de um cliente avulso.');
      setPaymentOption('paid_full');
      return;
    }

    const currentCustomerId = isAnonymous ? null : selectedCustomerId;

    // If previous attempt already succeeded saving in background/local cache, use it without duplicating
    if (pendingSavedSaleRef.current) {
      const { id, saleData, warnings } = pendingSavedSaleRef.current;
      if (
        saleData.customerId === currentCustomerId &&
        saleData.totalAmount === calculatedTotal &&
        saleData.paidAmount === paidAmount
      ) {
        pendingSavedSaleRef.current = null;
        setSuccessSaleData({
          ...saleData,
          id,
          warnings: warnings || [],
          hasPendingWrites: !isOnline,
        });

        // Reset reminder states for new sale modal
        setSelectedReminderDate('');
        setReminderSkipped(false);
        setIsCustomDatePickerOpen(false);
        setCustomDateInput('');

        // Reset form
        setQuantities({});
        setCustomPriceOverrides({});
        setSelectedCustomerId('');
        setIsAnonymous(false);
        setPaymentOption('paid_full');
        setPartialPaidInput('');
        setNotes('');
        return;
      } else {
        pendingSavedSaleRef.current = null;
      }
    }

    try {
      setIsSubmitting(true);

      const customerName = isAnonymous
        ? 'Cliente Avulso (Rua)'
        : selectedCustomer?.name || 'Cliente';

      const fallbackSaleId = 'offline_' + Date.now();

      const baseSaleData = {
        customerId: currentCustomerId,
        customerName,
        customerPhone: selectedCustomer?.phone,
        customerAddress: selectedCustomer?.address,
        customerReferencePoint: selectedCustomer?.referencePoint,
        sellerId: activeSeller?.id || 'vendedor',
        sellerName: activeSeller?.name || 'Vendedor',
        items: selectedItems,
        totalAmount: calculatedTotal,
        paidAmount,
        remainingAmount,
        paymentStatus,
        paymentMethod: paymentOption === 'pending_full' ? 'dinheiro' : paymentMethod,
        notes: notes.trim() || undefined,
        saleDate: getTodayDateString(),
      };

      const saveOperation = async () => {
        // Capture GPS location if available (non-blocking with short timeout if offline)
        const locationCoords = await getDeviceLocation();

        const fullSaleData = {
          ...baseSaleData,
          latitude: locationCoords.latitude,
          longitude: locationCoords.longitude,
        };

        const { saleId, warnings } = await recordSale(businessId, fullSaleData);
        // Cache result in ref to avoid duplicates if timeout fires right before/during resolution
        pendingSavedSaleRef.current = { id: saleId, saleData: fullSaleData, warnings };
        return { saleId, saleData: fullSaleData, warnings };
      };

      let timeoutId: any;
      const timeoutMs = isOnline ? 15000 : 2000;

      const timeoutPromise = new Promise<{ isOfflineTimeout: true }>((resolve, reject) => {
        timeoutId = setTimeout(() => {
          if (!isOnline) {
            // Offline mode: treat as success after 2 seconds (safe in Firestore local cache)
            resolve({ isOfflineTimeout: true });
          } else {
            // Online mode: 15 seconds without confirmation is treated as failure
            reject(new Error('TIMEOUT_SAVE'));
          }
        }, timeoutMs);
      });

      try {
        const raceResult = await Promise.race([saveOperation(), timeoutPromise]);
        clearTimeout(timeoutId);

        let finalSaleId = fallbackSaleId;
        let finalSaleData: Record<string, any> = baseSaleData;
        let finalWarnings: string[] = [];
        let isAwaitingSync = !isOnline;

        if ('isOfflineTimeout' in raceResult) {
          isAwaitingSync = true;
          const currentSaved = pendingSavedSaleRef.current as { id: string; saleData: Record<string, any>; warnings?: string[] } | null;
          if (currentSaved) {
            finalSaleId = currentSaved.id;
            finalSaleData = currentSaved.saleData;
            finalWarnings = currentSaved.warnings || [];
          }
        } else {
          finalSaleId = raceResult.saleId;
          finalSaleData = raceResult.saleData;
          finalWarnings = raceResult.warnings || [];
          isAwaitingSync = !isOnline;
        }

        pendingSavedSaleRef.current = null;

        setSuccessSaleData({
          ...finalSaleData,
          id: finalSaleId,
          warnings: finalWarnings,
          hasPendingWrites: isAwaitingSync,
        });

        // Reset reminder states for new sale modal
        setSelectedReminderDate('');
        setReminderSkipped(false);
        setIsCustomDatePickerOpen(false);
        setCustomDateInput('');

        // Reset form
        setQuantities({});
        setCustomPriceOverrides({});
        setSelectedCustomerId('');
        setIsAnonymous(false);
        setPaymentOption('paid_full');
        setPartialPaidInput('');
        setNotes('');
      } catch (innerErr: any) {
        clearTimeout(timeoutId);
        if (innerErr?.message === 'TIMEOUT_SAVE') {
          // If the sale completed right as timeout fired
          const saved = pendingSavedSaleRef.current as { id: string; saleData: Record<string, any>; warnings?: string[] } | null;
          if (saved) {
            pendingSavedSaleRef.current = null;
            setSuccessSaleData({
              ...saved.saleData,
              id: saved.id,
              warnings: saved.warnings || [],
              hasPendingWrites: !isOnline,
            });
            setSelectedReminderDate('');
            setReminderSkipped(false);
            setIsCustomDatePickerOpen(false);
            setCustomDateInput('');
            setQuantities({});
            setCustomPriceOverrides({});
            setSelectedCustomerId('');
            setIsAnonymous(false);
            setPaymentOption('paid_full');
            setPartialPaidInput('');
            setNotes('');
            return;
          }
          alert('Não foi possível confirmar o salvamento. Verifique sua conexão e tente novamente.');
        } else {
          alert('Erro ao salvar venda: ' + innerErr.message);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareWhatsApp = (sale: any) => {
    let text = `📦 *Comprovante de Compra - PDV Express*\n\n` +
      `Olá, *${sale.customerName}*!\n` +
      `Aqui está o comprovante da sua compra:\n\n` +
      sale.items.map((i: any) => `• ${i.quantity}x ${i.productName} - ${formatCurrency(i.subtotal)}`).join('\n') +
      `\n\n*Total:* ${formatCurrency(sale.totalAmount)}\n` +
      (sale.paymentStatus === 'paid'
        ? `✅ *Status:* Pago à vista no ${sale.paymentMethod}`
        : sale.paymentStatus === 'partial'
        ? `⏳ *Status:* Pago ${formatCurrency(sale.paidAmount)} | Restante a receber: ${formatCurrency(sale.remainingAmount)}`
        : `⏳ *Status:* Fiado (A receber): ${formatCurrency(sale.remainingAmount)}`);

    if (selectedReminderDate) {
      text += `\n📅 *Retorno previsto:* ${formatDateBr(selectedReminderDate)}`;
    }

    text += `\n\n_Agradecemos a preferência!_`;

    const phone = sale.customerPhone ? sale.customerPhone.replace(/\D/g, '') : '';
    const url = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 pb-28 pt-2">
      {/* Title */}
      <div className="px-1">
        <h2 className="text-lg font-bold text-neutral-900 leading-tight flex items-center gap-2">
          <span>Nova Venda</span>
        </h2>
        <p className="text-xs text-neutral-500 font-medium">
          Operador atual: <span className="font-bold text-amber-900">{activeSeller?.name || 'Vendedor'}</span>
        </p>
      </div>

      {/* STEP 1: CLIENTE */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            1. Selecione o Cliente
          </label>
          <button
            id="btn-open-quick-customer-modal"
            type="button"
            onClick={() => setShowNewCustomerModal(true)}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Cliente
          </button>
        </div>

        {/* Option 1: Cliente Avulso (1-click) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            id="btn-client-anonymous"
            type="button"
            onClick={handleSelectAnonymous}
            className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition active:scale-95 ${
              isAnonymous
                ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-500/20'
                : 'border-neutral-200 bg-neutral-50/60 text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                isAnonymous ? 'bg-amber-600 text-white' : 'bg-neutral-200 text-neutral-600'
              }`}
            >
              🏃
            </div>
            <div>
              <div className="text-xs font-bold">Cliente Avulso</div>
              <div className="text-[10px] text-neutral-500">Venda rápida na rua</div>
            </div>
          </button>

          {/* Selected registered customer preview button (clickable) */}
          <button
            id="btn-client-registered"
            type="button"
            onClick={() => setIsAnonymous(false)}
            className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition active:scale-95 ${
              !isAnonymous
                ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-500/20'
                : 'border-neutral-200 bg-neutral-50/60 text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                !isAnonymous ? 'bg-amber-700 text-white' : 'bg-neutral-200 text-neutral-600'
              }`}
            >
              👤
            </div>
            <div className="truncate flex-1">
              <div className="text-xs font-bold truncate">
                {!isAnonymous && selectedCustomer ? selectedCustomer.name : 'Cliente da Rota'}
              </div>
              <div className="text-[10px] text-neutral-500 truncate">
                {!isAnonymous && selectedCustomer?.referencePoint ? selectedCustomer.referencePoint : 'Cadastrado'}
              </div>
            </div>
          </button>
        </div>

        {/* Customer Search / Selection List */}
        {!isAnonymous && (
          <div className="space-y-2 pt-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
              <input
                id="input-search-customer-sale"
                type="text"
                placeholder="Buscar cliente por nome ou ponto de referência..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-neutral-50/50"
              />
            </div>

            {/* Quick list of customers (max 4 or filtered) */}
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-neutral-100">
              {filteredCustomers.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-2">
                  Nenhum cliente encontrado com este nome.
                </p>
              ) : (
                filteredCustomers.slice(0, 6).map((c) => {
                  const isSelected = selectedCustomerId === c.id;
                  return (
                    <button
                      key={c.id}
                      id={`btn-choose-cust-${c.id}`}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setIsAnonymous(false);
                      }}
                      className={`w-full p-2 rounded-lg text-left flex items-center justify-between text-xs transition ${
                        isSelected
                          ? 'bg-amber-100/70 text-amber-950 font-bold'
                          : 'hover:bg-neutral-50 text-neutral-800'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="truncate font-semibold">{c.name}</div>
                        {(c.referencePoint || c.address) && (
                          <div className="text-[10px] text-neutral-500 truncate flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-amber-600" />
                            {c.referencePoint || c.address}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {(c.totalDebt || 0) > 0 ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Deve: {formatCurrency(c.totalDebt)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-medium">Em dia</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* STEP 2: PRODUTOS */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" />
            2. Escolha os Produtos e Quantidades
          </label>
          <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
            {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'itens'}
          </span>
        </div>

        {/* Product Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
          <input
            id="input-search-product-sale"
            type="text"
            placeholder="Buscar produto por nome..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            onFocus={() => {
              setIsSearchFocused(true);
              onSearchFocusChange?.(true);
            }}
            onBlur={() => {
              setIsSearchFocused(false);
              onSearchFocusChange?.(false);
            }}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-neutral-50/50"
          />
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <p className="text-xs text-neutral-400 text-center py-4 bg-neutral-50/70 rounded-xl border border-dashed border-neutral-200">
            Nenhum produto encontrado.
          </p>
        ) : (
          <div className="space-y-2.5">
            {/* Produtos já adicionados à venda (fixados no topo) */}
            {selectedFilteredProducts.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 px-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Já adicionados ({selectedFilteredProducts.length})</span>
                </div>
                {selectedFilteredProducts.map(renderProductCard)}

                {/* Divisor visual se houver produtos não adicionados na lista */}
                {unselectedFilteredProducts.length > 0 && (
                  <div className="pt-2 pb-1">
                    <div className="border-t border-neutral-200" />
                  </div>
                )}
              </>
            )}

            {/* Demais produtos */}
            {unselectedFilteredProducts.map(renderProductCard)}
          </div>
      )}
      </div>

      {/* STEP 3: FORMA DE PAGAMENTO */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-sm space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5" />
          3. Como vai ser o Pagamento?
        </label>

        {/* 3 Payment Options */}
        <div className="grid grid-cols-3 gap-2">
          <button
            id="btn-pay-paid-full"
            type="button"
            onClick={() => setPaymentOption('paid_full')}
            className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 active:scale-95 ${
              paymentOption === 'paid_full'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                : 'border-neutral-200 bg-neutral-50/60 text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold leading-tight">Pago na Hora</span>
          </button>

          <button
            id="btn-pay-pending-full"
            type="button"
            disabled={isAnonymous}
            onClick={() => {
              if (!isAnonymous) setPaymentOption('pending_full');
            }}
            className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
              isAnonymous
                ? 'border-neutral-200 bg-neutral-100 text-neutral-400 opacity-60 cursor-not-allowed'
                : paymentOption === 'pending_full'
                ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-500/20 active:scale-95'
                : 'border-neutral-200 bg-neutral-50/60 text-neutral-700 hover:bg-neutral-100 active:scale-95'
            }`}
          >
            <Clock className={`w-4 h-4 ${isAnonymous ? 'text-neutral-400' : 'text-amber-600'}`} />
            <span className="text-xs font-bold leading-tight">Ficou Fiado</span>
          </button>

          <button
            id="btn-pay-partial"
            type="button"
            disabled={isAnonymous}
            onClick={() => {
              if (!isAnonymous) setPaymentOption('partial');
            }}
            className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
              isAnonymous
                ? 'border-neutral-200 bg-neutral-100 text-neutral-400 opacity-60 cursor-not-allowed'
                : paymentOption === 'partial'
                ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-500/20 active:scale-95'
                : 'border-neutral-200 bg-neutral-50/60 text-neutral-700 hover:bg-neutral-100 active:scale-95'
            }`}
          >
            <Coins className={`w-4 h-4 ${isAnonymous ? 'text-neutral-400' : 'text-amber-600'}`} />
            <span className="text-xs font-bold leading-tight">Pagou Parte</span>
          </button>
        </div>

        {/* Aviso quando cliente avulso estiver selecionado */}
        {isAnonymous && (
          <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200/80 p-2.5 rounded-xl leading-relaxed">
            Fiado só está disponível para clientes cadastrados, pois não é possível cobrar depois de um cliente avulso.
          </p>
        )}

        {/* If Paid on the spot or partial -> choose payment method */}
        {paymentOption !== 'pending_full' && (
          <div className="pt-2 space-y-2 border-t border-neutral-100">
            <label className="text-[11px] font-semibold text-neutral-600">
              Meio de recebimento no momento:
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'dinheiro', label: 'Dinheiro' },
                { id: 'pix', label: 'Pix' },
                { id: 'cartao_debito', label: 'Débito' },
                { id: 'cartao_credito', label: 'Crédito' },
              ].map((m) => (
                <button
                  key={m.id}
                  id={`btn-method-${m.id}`}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                  className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border transition ${
                    paymentMethod === m.id
                      ? 'bg-amber-700 border-amber-800 text-white shadow-sm'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* If Partial -> input for immediate amount paid */}
        {paymentOption === 'partial' && (
          <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2">
            <label className="block text-xs font-bold text-amber-900">
              Quanto o cliente pagou na hora? (R$)
            </label>
            <input
              id="input-partial-paid"
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={partialPaidInput}
              onChange={(e) => setPartialPaidInput(formatCurrencyInput(e.target.value))}
              className="w-full px-3 py-2 bg-white rounded-xl border border-amber-300 font-bold text-base text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <div className="flex justify-between text-xs font-semibold text-amber-950 pt-1">
              <span>Restante no Fiado:</span>
              <span className="text-amber-800">{formatCurrency(remainingAmount)}</span>
            </div>
          </div>
        )}

        {/* Notes (Optional) */}
        <div>
          <input
            id="input-sale-notes"
            type="text"
            placeholder="Observação (ex: acerta na sexta, entregar na casa da mãe...)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* STICKY BOTTOM BAR FOR INSTANT CONFIRMATION */}
      <div
        className={`fixed bottom-16 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-amber-200 p-3 shadow-lg transition-transform duration-200 ${
          isSearchFocused ? 'translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Total da Venda</div>
            <div className="text-xl font-extrabold text-neutral-900 leading-tight">
              {formatCurrency(calculatedTotal)}
            </div>
          </div>

          <button
            id="btn-confirm-sale-submit"
            type="button"
            disabled={isSubmitting || selectedItems.length === 0}
            onClick={handleSubmitSale}
            className="flex-1 py-3.5 px-5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-40 text-white font-extrabold text-sm rounded-xl shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>Salvando Venda...</span>
            ) : (
              <>
                <Check className="w-5 h-5 stroke-[3]" />
                <span>CONFIRMAR VENDA</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* QUICK NEW CUSTOMER MODAL */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-amber-100 overflow-hidden">
            <div className="bg-amber-700 px-4 py-3 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Cadastro Rápido de Cliente</h3>
              <button
                type="button"
                onClick={() => setShowNewCustomerModal(false)}
                className="p-1 text-amber-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleQuickAddCustomer} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nome do Cliente *
                </label>
                <input
                  id="input-new-cust-name"
                  type="text"
                  required
                  placeholder="Ex: Dona Laura (Casa Azul)"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Telefone / WhatsApp (opcional)
                </label>
                <input
                  id="input-new-cust-phone"
                  type="text"
                  inputMode="numeric"
                  placeholder="(11) 99999-9999"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(formatPhone(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Endereço ou Ponto de Referência da Rota
                </label>
                <input
                  id="input-new-cust-ref"
                  type="text"
                  placeholder="Ex: Rua 3, nº 45 (Portão branco perto da igreja)"
                  value={newCustRef}
                  onChange={(e) => setNewCustRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-quick-customer"
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-amber-700 rounded-xl shadow"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS CONFIRMATION MODAL */}
      {successSaleData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden text-center p-6 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <h3 className="text-lg font-extrabold text-neutral-900">Venda Registrada com Sucesso!</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Salva com segurança no aparelho (offline) e pronta para sincronizar.
            </p>

            {(!isOnline || successSaleData?.hasPendingWrites) && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 text-xs font-semibold rounded-full border border-amber-200/90 shadow-xs">
                <span>📡</span>
                <span>Será sincronizado quando a internet voltar</span>
              </div>
            )}

            <div className="my-4 p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-left space-y-1 text-xs">
              <div className="flex justify-between font-semibold text-neutral-800">
                <span>Cliente:</span>
                <span className="font-bold">{successSaleData.customerName}</span>
              </div>
              <div className="flex justify-between font-semibold text-neutral-800">
                <span>Total:</span>
                <span className="font-extrabold text-amber-900">
                  {formatCurrency(successSaleData.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-neutral-800">
                <span>Status:</span>
                <span
                  className={`font-bold ${
                    successSaleData.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-800'
                  }`}
                >
                  {successSaleData.paymentStatus === 'paid'
                    ? 'Pago na hora'
                    : successSaleData.paymentStatus === 'partial'
                    ? `Pago ${formatCurrency(successSaleData.paidAmount)} (Falta ${formatCurrency(successSaleData.remainingAmount)})`
                    : 'Ficou Fiado'}
                </span>
              </div>
            </div>

            {/* Bloco de Avisos / Alertas de Processamento Parcial */}
            {successSaleData.warnings && successSaleData.warnings.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200/90 rounded-xl text-left text-xs text-amber-900 shadow-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 font-bold text-amber-950 mb-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Atenção</span>
                </div>
                <ul className="space-y-1 text-[11px] list-disc list-inside font-medium text-amber-900/90">
                  {successSaleData.warnings.map((msg: string, idx: number) => (
                    <li key={idx} className="leading-snug">
                      {msg}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ETAPA: Próxima Visita / Retorno (Apenas clientes cadastrados) */}
            {successSaleData.customerId && (
              <div className="mb-4 text-left">
                {selectedReminderDate ? (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-center justify-between animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CalendarClock className="w-4 h-4 text-amber-700 flex-shrink-0" />
                      <span className="truncate">
                        Retorno agendado para <strong className="text-amber-950">{formatDateBr(selectedReminderDate)}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReminderDate('');
                        setIsCustomDatePickerOpen(false);
                      }}
                      className="text-[11px] text-amber-700 hover:text-amber-900 font-bold ml-2 underline flex-shrink-0"
                    >
                      Alterar
                    </button>
                  </div>
                ) : !reminderSkipped ? (
                  <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                        <CalendarClock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                        <span>Quando pretende voltar aqui?</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReminderSkipped(true)}
                        className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-600 transition"
                      >
                        Pular
                      </button>
                    </div>

                    {!isCustomDatePickerOpen ? (
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          id="btn-reminder-7-days"
                          type="button"
                          disabled={isSavingReminder}
                          onClick={() => handleSelectReminderDays(7)}
                          className="py-2 px-1 bg-white hover:bg-amber-100/80 active:bg-amber-200 border border-amber-200 rounded-lg text-xs font-bold text-amber-900 transition active:scale-95 text-center shadow-xs"
                        >
                          7 dias
                        </button>
                        <button
                          id="btn-reminder-15-days"
                          type="button"
                          disabled={isSavingReminder}
                          onClick={() => handleSelectReminderDays(15)}
                          className="py-2 px-1 bg-white hover:bg-amber-100/80 active:bg-amber-200 border border-amber-200 rounded-lg text-xs font-bold text-amber-900 transition active:scale-95 text-center shadow-xs"
                        >
                          15 dias
                        </button>
                        <button
                          id="btn-reminder-30-days"
                          type="button"
                          disabled={isSavingReminder}
                          onClick={() => handleSelectReminderDays(30)}
                          className="py-2 px-1 bg-white hover:bg-amber-100/80 active:bg-amber-200 border border-amber-200 rounded-lg text-xs font-bold text-amber-900 transition active:scale-95 text-center shadow-xs"
                        >
                          30 dias
                        </button>
                        <button
                          id="btn-reminder-custom-date"
                          type="button"
                          disabled={isSavingReminder}
                          onClick={() => setIsCustomDatePickerOpen(true)}
                          className="py-2 px-1 bg-white hover:bg-neutral-100 active:bg-neutral-200 border border-neutral-200 rounded-lg text-[11px] font-bold text-neutral-700 transition active:scale-95 text-center shadow-xs"
                        >
                          Escolher data
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex gap-1.5">
                          <input
                            id="input-reminder-custom-date"
                            type="date"
                            min={getTodayDateString()}
                            value={customDateInput}
                            onChange={(e) => setCustomDateInput(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-500 bg-white font-medium"
                          />
                          <button
                            id="btn-confirm-custom-reminder"
                            type="button"
                            disabled={!customDateInput || isSavingReminder}
                            onClick={() => handleSaveCustomReminder(customDateInput)}
                            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition active:scale-95 shadow-xs"
                          >
                            Salvar
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsCustomDatePickerOpen(false)}
                          className="text-[10px] text-neutral-500 hover:text-neutral-700 underline"
                        >
                          ← Voltar para opções rápidas
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            <div className="space-y-2">
              <button
                id="btn-share-receipt-whatsapp"
                type="button"
                onClick={() => handleShareWhatsApp(successSaleData)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                Enviar Comprovante no WhatsApp
              </button>

              <button
                id="btn-close-sale-success"
                type="button"
                onClick={() => {
                  setSuccessSaleData(null);
                  setSelectedReminderDate('');
                  setReminderSkipped(false);
                  setIsCustomDatePickerOpen(false);
                  setCustomDateInput('');
                  onSaleCompleted();
                }}
                className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl transition active:scale-95"
              >
                Próxima Venda / Ver Resumo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
