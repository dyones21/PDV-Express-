'use client';

import React, { useState } from 'react';
import { Customer, Product, SaleItem, PaymentStatus, PaymentMethod } from '@/types';
import { formatCurrency, getTodayDateString } from '@/lib/format';
import { useSellerAuth } from '@/hooks/use-seller-auth';
import { recordSale, addCustomer } from '@/lib/db';
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
  X
} from 'lucide-react';

interface NewSaleTabProps {
  customers: Customer[];
  products: Product[];
  onSaleCompleted: () => void;
}

export function NewSaleTab({ customers, products, onSaleCompleted }: NewSaleTabProps) {
  const { activeSeller } = useSellerAuth();

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

  // State: Payment
  const [paymentOption, setPaymentOption] = useState<'paid_full' | 'pending_full' | 'partial'>('paid_full');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [partialPaidInput, setPartialPaidInput] = useState<string>('');
  const [notes, setNotes] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successSaleData, setSuccessSaleData] = useState<any | null>(null);

  // Filtered active products
  const activeProducts = products.filter((p) => p.active !== false);

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

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    try {
      const newId = await addCustomer(undefined, {
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
    const parsedPartial = parseFloat(partialPaidInput.replace(',', '.')) || 0;
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
      const timeoutId = setTimeout(() => {
        resolve({});
      }, 8000); // 8 seconds max

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
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
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

    try {
      setIsSubmitting(true);

      const customerName = isAnonymous
        ? 'Cliente Avulso (Rua)'
        : selectedCustomer?.name || 'Cliente';

      // Capture GPS location if available (non-blocking with 8s timeout)
      const locationCoords = await getDeviceLocation();

      const saleData = {
        customerId: isAnonymous ? null : selectedCustomerId,
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
        latitude: locationCoords.latitude,
        longitude: locationCoords.longitude,
      };

      const saleId = await recordSale(undefined, saleData);

      setSuccessSaleData({
        ...saleData,
        id: saleId,
      });

      // Reset form
      setQuantities({});
      setCustomPriceOverrides({});
      setSelectedCustomerId('');
      setIsAnonymous(false);
      setPaymentOption('paid_full');
      setPartialPaidInput('');
      setNotes('');
    } catch (err: any) {
      alert('Erro ao salvar venda: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareWhatsApp = (sale: any) => {
    const text = `📦 *Comprovante de Compra - PDV Express*\n\n` +
      `Olá, *${sale.customerName}*!\n` +
      `Aqui está o comprovante da sua compra:\n\n` +
      sale.items.map((i: any) => `• ${i.quantity}x ${i.productName} - ${formatCurrency(i.subtotal)}`).join('\n') +
      `\n\n*Total:* ${formatCurrency(sale.totalAmount)}\n` +
      (sale.paymentStatus === 'paid'
        ? `✅ *Status:* Pago à vista no ${sale.paymentMethod}`
        : sale.paymentStatus === 'partial'
        ? `⏳ *Status:* Pago ${formatCurrency(sale.paidAmount)} | Restante a receber: ${formatCurrency(sale.remainingAmount)}`
        : `⏳ *Status:* Fiado (A receber): ${formatCurrency(sale.remainingAmount)}`) +
      `\n\n_Agradecemos a preferência!_`;

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
            onClick={() => {
              setIsAnonymous(true);
              setSelectedCustomerId('');
            }}
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

        {/* Product Grid */}
        <div className="space-y-2.5">
          {activeProducts.map((prod) => {
            const qty = quantities[prod.id] || 0;
            const currentPrice = customPriceOverrides[prod.id] !== undefined ? customPriceOverrides[prod.id] : prod.price;
            const isSelected = qty > 0;
            const stock = prod.stockQuantity !== undefined ? prod.stockQuantity : 0;
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
                      {prod.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-600 mt-0.5 flex-wrap">
                      <span className="font-semibold text-amber-900">
                        {formatCurrency(currentPrice)}
                      </span>
                      <span className="text-neutral-400">/ {prod.unit || 'peça'}</span>
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
                        Estoque: {stock} {prod.unit || 'un'}
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
                    <span>Qtd ({qty}) excede o estoque cadastrado ({stock} {prod.unit || 'un'}). A venda será permitida normalmente.</span>
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
          })}
        </div>
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
            onClick={() => setPaymentOption('pending_full')}
            className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 active:scale-95 ${
              paymentOption === 'pending_full'
                ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-500/20'
                : 'border-neutral-200 bg-neutral-50/60 text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold leading-tight">Ficou Fiado</span>
          </button>

          <button
            id="btn-pay-partial"
            type="button"
            onClick={() => setPaymentOption('partial')}
            className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 active:scale-95 ${
              paymentOption === 'partial'
                ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-500/20'
                : 'border-neutral-200 bg-neutral-50/60 text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold leading-tight">Pagou Parte</span>
          </button>
        </div>

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
              type="number"
              step="0.50"
              placeholder="Ex: 20,00"
              value={partialPaidInput}
              onChange={(e) => setPartialPaidInput(e.target.value)}
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
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-amber-200 p-3 shadow-lg">
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
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
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
