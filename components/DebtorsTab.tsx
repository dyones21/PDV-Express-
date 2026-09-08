'use client';

import React, { useState, useEffect } from 'react';
import { Customer, Sale, PaymentMethod } from '@/types';
import { formatCurrency, formatCurrencyInput, parseCurrencyToNumber, formatDateBr, getTodayDateString } from '@/lib/format';
import { recordPayment, SalePaymentUpdate } from '@/lib/db';
import { useSellerAuth } from '@/hooks/use-seller-auth';
import { useNetworkSync } from '@/hooks/use-network-sync';
import { useBusiness } from '@/context/BusinessContext';
import { 
  HandCoins, 
  Search, 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  MessageCircle, 
  Coins, 
  X, 
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface DebtorsTabProps {
  customers: Customer[];
  sales: Sale[];
  onOpenSaleDetails: (sale: Sale) => void;
}

export function DebtorsTab({ customers, sales, onOpenSaleDetails }: DebtorsTabProps) {
  const { businessId } = useBusiness();
  const { activeSeller } = useSellerAuth();
  const { isOnline } = useNetworkSync();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [paymentSyncNotice, setPaymentSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentSyncNotice) return;
    const timer = setTimeout(() => {
      setPaymentSyncNotice(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [paymentSyncNotice]);

  // Settlement Modal state
  const [settleCustomer, setSettleCustomer] = useState<Customer | null>(null);
  const [settleAmountType, setSettleAmountType] = useState<'total' | 'partial'>('total');
  const [customAmountInput, setCustomAmountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter debtors: customers with totalDebt > 0 or with pending non-cancelled sales
  const debtors = customers
    .filter((c) => {
      const hasDebt = (c.totalDebt || 0) > 0;
      const hasPendingSales = sales.some(
        (s) =>
          s.customerId === c.id &&
          !s.isCancelled &&
          s.paymentStatus !== 'cancelled' &&
          s.paymentStatus !== 'paid' &&
          (s.remainingAmount || 0) > 0
      );
      return hasDebt || hasPendingSales;
    })
    .filter((c) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) ||
        (c.address && c.address.toLowerCase().includes(term)) ||
        (c.referencePoint && c.referencePoint.toLowerCase().includes(term))
      );
    });

  // Total debt overall
  const totalDebtOverall = debtors.reduce((acc, c) => acc + (c.totalDebt || 0), 0);

  const handleOpenSettle = (customer: Customer) => {
    setSettleCustomer(customer);
    setSettleAmountType('total');
    setCustomAmountInput(customer.totalDebt ? formatCurrencyInput(customer.totalDebt) : '');
    setPaymentMethod('dinheiro');
    setNotes('');
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleCustomer) return;

    const amountToPay =
      settleAmountType === 'total'
        ? Number(settleCustomer.totalDebt || 0)
        : parseCurrencyToNumber(customAmountInput);

    if (amountToPay <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    // Filter customer's open/partial sales and sort from oldest to newest (by createdAt)
    const customerPendingSales = sales
      .filter(
        (s) =>
          s.customerId === settleCustomer.id &&
          !s.isCancelled &&
          s.paymentStatus !== 'cancelled' &&
          (s.paymentStatus === 'pending' || s.paymentStatus === 'partial')
      )
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

    let moneyLeft = amountToPay;
    const saleUpdates: SalePaymentUpdate[] = [];

    for (const s of customerPendingSales) {
      if (moneyLeft <= 0) break;
      const remaining = Number(s.remainingAmount || 0);
      if (remaining <= 0) continue;
      const paidNow = Math.min(moneyLeft, remaining);

      saleUpdates.push({
        saleId: s.id,
        deltaAmount: paidNow,
      });

      moneyLeft -= paidNow;
    }

    const resetSettleForm = () => {
      setSettleCustomer(null);
      setCustomAmountInput('');
      setNotes('');
    };

    try {
      setIsSubmitting(true);

      const paymentOperation = async () => {
        await recordPayment(
          businessId,
          {
            customerId: settleCustomer.id,
            customerName: settleCustomer.name,
            amount: amountToPay,
            sellerId: activeSeller?.id || 'vendedor',
            sellerName: activeSeller?.name || 'Vendedor',
            paymentMethod,
            paymentDate: getTodayDateString(),
            notes: notes.trim() || undefined,
          },
          saleUpdates
        );
        return { success: true };
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
            reject(new Error('TIMEOUT_PAYMENT'));
          }
        }, timeoutMs);
      });

      try {
        const raceResult = await Promise.race([paymentOperation(), timeoutPromise]);
        clearTimeout(timeoutId);

        resetSettleForm();

        if (!isOnline || ('isOfflineTimeout' in raceResult)) {
          setPaymentSyncNotice('Pagamento registrado no aparelho. 📡 Será sincronizado quando a internet voltar.');
        }
      } catch (innerErr: any) {
        clearTimeout(timeoutId);
        if (innerErr?.message === 'TIMEOUT_PAYMENT') {
          alert('Não foi possível confirmar o salvamento. Verifique sua conexão e tente novamente.');
        } else {
          alert('Erro ao registrar pagamento: ' + innerErr.message);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppCobrar = (customer: Customer) => {
    if (!customer.phone) return;
    const phone = customer.phone.replace(/\D/g, '');
    if (!phone) return;

    const text = `📋 *Lembrete de Pagamento*\n\n` +
      `Olá, *${customer.name}*! Tudo bem?\n` +
      `Estou passando na rota conferindo os acertos pendentes.\n` +
      `Consta em aberto o valor de *${formatCurrency(customer.totalDebt)}* de compras anteriores.\n\n` +
      `Podemos combinar o acerto hoje ou prefere via PIX? Agradeço muito! 🙏`;

    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 pb-24 pt-2">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-amber-700 to-amber-900 rounded-2xl p-4 text-white shadow-md">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-amber-200 uppercase tracking-wider">
            Painel A Receber (Fiado na Rota)
          </span>
          <HandCoins className="w-5 h-5 text-amber-300" />
        </div>
        <div className="text-3xl font-extrabold tracking-tight">
          {formatCurrency(totalDebtOverall)}
        </div>
        <p className="text-xs text-amber-200/90 mt-1 font-medium">
          {debtors.length} {debtors.length === 1 ? 'cliente com saldo devedor' : 'clientes com saldo devedor'}
        </p>
      </div>

      {/* Payment Pending Sync Notice */}
      {paymentSyncNotice && (
        <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-2xl text-xs font-semibold text-amber-900 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="text-base">📡</span>
            <span>{paymentSyncNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setPaymentSyncNotice(null)}
            className="p-1 text-amber-700 hover:text-amber-900 transition"
            title="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
        <input
          id="input-search-debtors"
          type="text"
          placeholder="Buscar devedor por nome ou endereço..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white shadow-sm text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
      </div>

      {/* Debtors List */}
      {debtors.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-neutral-200/80 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 text-xl">
            🎉
          </div>
          <h3 className="text-sm font-bold text-neutral-900">Tudo em dia!</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Nenhum cliente está devendo na rota no momento.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {debtors.map((customer) => {
            const isExpanded = expandedCustomerId === customer.id;
            const customerSales = sales.filter(
              (s) =>
                s.customerId === customer.id &&
                !s.isCancelled &&
                s.paymentStatus !== 'cancelled' &&
                s.paymentStatus !== 'paid'
            );

            return (
              <div
                key={customer.id}
                id={`debtor-card-${customer.id}`}
                className="bg-white rounded-2xl border border-amber-200/80 shadow-sm overflow-hidden"
              >
                <div className="p-4">
                  {/* Top: Customer Name & Debt Amount */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-neutral-900 truncate">
                        {customer.name}
                      </h3>
                      {(customer.referencePoint || customer.address) && (
                        <div className="flex items-center gap-1 text-xs text-neutral-500 mt-0.5">
                          <MapPin className="w-3 h-3 text-amber-600 flex-shrink-0" />
                          <span className="truncate">
                            {customer.referencePoint || customer.address}
                          </span>
                        </div>
                      )}
                      {customer.lastPurchaseDate && (
                        <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-0.5">
                          <Calendar className="w-3 h-3 text-neutral-400" />
                          <span>Última compra: {formatDateBr(customer.lastPurchaseDate)}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
                        Deve
                      </span>
                      <div className="text-base font-extrabold text-amber-950">
                        {formatCurrency(customer.totalDebt)}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center gap-2">
                    {/* Settle Debt Button */}
                    <button
                      id={`btn-settle-${customer.id}`}
                      type="button"
                      onClick={() => handleOpenSettle(customer)}
                      className="flex-1 py-2.5 px-3 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Dar Baixa / Receber</span>
                    </button>

                    {/* WhatsApp Cobrança Button */}
                    {customer.phone ? (
                      <button
                        id={`btn-whatsapp-${customer.id}`}
                        type="button"
                        onClick={() => handleWhatsAppCobrar(customer)}
                        className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl transition active:scale-95 flex items-center gap-1.5"
                        title="Cobrar no WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span className="hidden sm:inline">Cobrar no WhatsApp</span>
                        <span className="sm:hidden">Cobrar</span>
                      </button>
                    ) : (
                      <button
                        id={`btn-whatsapp-disabled-${customer.id}`}
                        type="button"
                        disabled
                        title="Cadastre o telefone do cliente para cobrar via WhatsApp"
                        className="py-2.5 px-2.5 bg-neutral-100 text-neutral-400 border border-neutral-200 font-medium text-xs rounded-xl flex items-center gap-1 cursor-not-allowed opacity-75"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                        <span>Sem Tel</span>
                      </button>
                    )}

                    {/* Toggle Sales Details */}
                    {customerSales.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCustomerId(isExpanded ? null : customer.id)
                        }
                        className="p-2.5 text-neutral-500 hover:text-neutral-800 bg-neutral-50 rounded-xl border border-neutral-200"
                        title="Ver vendas em aberto"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Open Sales for this debtor */}
                {isExpanded && customerSales.length > 0 && (
                  <div className="bg-amber-50/50 px-4 py-3 border-t border-amber-100 space-y-2 text-xs">
                    <div className="font-bold text-amber-900 text-[11px] uppercase tracking-wider">
                      Vendas em Aberto deste Cliente:
                    </div>
                    {customerSales.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onOpenSaleDetails(s)}
                        className="w-full text-left bg-white p-2.5 rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-sm active:scale-[0.99] transition flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-semibold text-neutral-800">
                            {formatDateBr(s.saleDate)} • {s.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                          </div>
                          {s.notes && (
                            <div className="text-[10px] text-neutral-500 italic">
                              Obs: {s.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-amber-900">
                            Falta {formatCurrency(s.remainingAmount)}
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            Total: {formatCurrency(s.totalAmount)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SETTLE / RECEIVE PAYMENT MODAL */}
      {settleCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-amber-100 overflow-hidden animate-in zoom-in-95">
            <div className="bg-amber-700 px-4 py-3 text-white flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-300" />
                <h3 className="font-bold text-sm">Registrar Pagamento / Quitação</h3>
              </div>
              <button
                type="button"
                onClick={() => setSettleCustomer(null)}
                className="p-1 text-amber-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-4 space-y-3">
              {/* Customer Info */}
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <div className="text-xs text-amber-800 font-semibold">Cliente:</div>
                <div className="text-sm font-bold text-neutral-900">{settleCustomer.name}</div>
                <div className="text-xs text-neutral-600 mt-1 flex justify-between">
                  <span>Dívida Atual:</span>
                  <span className="font-extrabold text-amber-950">
                    {formatCurrency(settleCustomer.totalDebt)}
                  </span>
                </div>
              </div>

              {/* Amount Choice */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Valor a Receber:
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setSettleAmountType('total')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition ${
                      settleAmountType === 'total'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-300'
                    }`}
                  >
                    Quitar Total ({formatCurrency(settleCustomer.totalDebt)})
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettleAmountType('partial')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition ${
                      settleAmountType === 'partial'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-300'
                    }`}
                  >
                    Valor Parcial
                  </button>
                </div>

                {settleAmountType === 'partial' && (
                  <input
                    id="input-settle-custom-amount"
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="R$ 0,00"
                    value={customAmountInput}
                    onChange={(e) => setCustomAmountInput(formatCurrencyInput(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-neutral-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Forma de Recebimento:
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: 'dinheiro', label: 'Dinheiro' },
                    { id: 'pix', label: 'Pix' },
                    { id: 'cartao_debito', label: 'Débito' },
                    { id: 'cartao_credito', label: 'Crédito' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                      className={`py-1.5 px-1 text-[11px] font-semibold text-center rounded-lg border transition ${
                        paymentMethod === m.id
                          ? 'bg-amber-700 text-white border-amber-800 shadow-sm'
                          : 'bg-neutral-50 text-neutral-700 border-neutral-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <input
                  type="text"
                  placeholder="Observação (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Confirm / Cancel */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSettleCustomer(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-neutral-700 bg-neutral-100 rounded-xl hover:bg-neutral-200"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-settle-save"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md flex items-center justify-center gap-1"
                >
                  {isSubmitting ? (
                    'Salvando...'
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirmar Baixa</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
