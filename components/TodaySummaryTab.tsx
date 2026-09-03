'use client';

import React from 'react';
import { Sale, Customer } from '@/types';
import { formatCurrency, getTodayDateString, getTodayFormattedDisplay, formatDateBr, formatPhone } from '@/lib/format';
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  PlusCircle, 
  ShoppingBag, 
  AlertCircle, 
  User, 
  MapPin, 
  ArrowRight,
  CloudCheck,
  CloudUpload,
  Settings,
  ChevronRight,
  BarChart3,
  CalendarClock,
  AlertTriangle,
  Phone,
  MessageCircle
} from 'lucide-react';

interface TodaySummaryTabProps {
  sales: Sale[];
  customers: Customer[];
  onOpenNewSale: () => void;
  onOpenDebtors: () => void;
  onOpenSaleDetails: (sale: Sale) => void;
  onOpenSettings: () => void;
  onOpenReports?: () => void;
  onOpenCustomer?: (customer: Customer) => void;
}

export function TodaySummaryTab({
  sales,
  customers,
  onOpenNewSale,
  onOpenDebtors,
  onOpenSaleDetails,
  onOpenSettings,
  onOpenReports,
  onOpenCustomer,
}: TodaySummaryTabProps) {
  const todayStr = getTodayDateString();

  // Filter pending visits (today or overdue)
  const pendingVisits = customers
    .filter((c) => Boolean(c.nextVisitReminder && c.nextVisitReminder <= todayStr && c.active !== false))
    .sort((a, b) => (a.nextVisitReminder || '').localeCompare(b.nextVisitReminder || '') || a.name.localeCompare(b.name));

  // Filter sales for today (excluding cancelled sales)
  const todaySales = sales.filter(
    (s) => s.saleDate === todayStr && !s.isCancelled && s.paymentStatus !== 'cancelled'
  );

  // Compute metrics
  const totalSoldToday = todaySales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const totalReceivedToday = todaySales.reduce((acc, s) => acc + (s.paidAmount || 0), 0);
  const totalPendingToday = todaySales.reduce((acc, s) => acc + (s.remainingAmount || 0), 0);

  // Total debt across all customers in database
  const totalAccumulatedDebt = customers.reduce((acc, c) => acc + (c.totalDebt || 0), 0);
  const totalDebtorsCount = customers.filter((c) => (c.totalDebt || 0) > 0).length;

  const handleWhatsApp = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, '') : '';
    if (!cleanPhone) return;
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá, ${customer.name}! Passando na rota de vendas hoje.`)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 pb-20 pt-2">
      {/* Date & Greeting Bar */}
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
            Resumo de Hoje
          </span>
          <h2 className="text-lg font-bold text-neutral-900 leading-tight capitalize" suppressHydrationWarning>
            {getTodayFormattedDisplay()}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          {onOpenReports && (
            <button
              id="btn-open-reports-top"
              onClick={onOpenReports}
              className="py-1.5 px-2.5 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-900 hover:bg-amber-200 shadow-sm active:scale-95 transition text-xs font-bold flex items-center gap-1"
              title="Ver Relatórios do Dono"
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-700" />
              <span>Relatórios</span>
            </button>
          )}
          <button
            id="btn-open-settings-top"
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-white border border-amber-200/80 text-neutral-600 hover:text-amber-800 shadow-sm active:scale-95 transition"
            title="Ajustes e Produtos"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Seção: Visitas de Hoje / Rota */}
      {pendingVisits.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-300/90 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Visitas de Hoje na Rota</h3>
                <p className="text-[11px] text-neutral-500 font-medium">Clientes agendados para atendimento</p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
              {pendingVisits.length} {pendingVisits.length === 1 ? 'visita' : 'visitas'}
            </span>
          </div>

          <div className="divide-y divide-neutral-100 space-y-1">
            {pendingVisits.map((c) => {
              const isOverdue = Boolean(c.nextVisitReminder && c.nextVisitReminder < todayStr);
              return (
                <div
                  key={c.id}
                  id={`visit-item-${c.id}`}
                  onClick={() => onOpenCustomer?.(c)}
                  className="pt-2.5 pb-1 flex items-start justify-between gap-2 hover:bg-amber-50/50 rounded-xl px-2 -mx-2 transition cursor-pointer active:bg-amber-100/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-neutral-900 truncate">
                        {c.name}
                      </span>
                      {isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Atrasado ({formatDateBr(c.nextVisitReminder!)})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
                          <Clock className="w-2.5 h-2.5 text-amber-700" />
                          Hoje
                        </span>
                      )}
                      {(c.totalDebt || 0) > 0 && (
                        <span className="text-[10px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          Fiado: {formatCurrency(c.totalDebt || 0)}
                        </span>
                      )}
                    </div>

                    {(c.referencePoint || c.address) && (
                      <div className="flex items-center gap-1 text-xs text-neutral-500 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                        <span className="truncate">{c.referencePoint || c.address}</span>
                      </div>
                    )}

                    {c.phone && (
                      <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                        <span>{formatPhone(c.phone)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
                    {c.phone && (
                      <button
                        type="button"
                        onClick={(e) => handleWhatsApp(e, c)}
                        className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                        title="Conversar no WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}
                    <div className="p-1.5 text-neutral-400 hover:text-amber-700">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3 Main Highlights Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Sold Card */}
        <div className="col-span-2 bg-gradient-to-br from-amber-700 to-amber-900 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-amber-200">Total Vendido Hoje</span>
            <div className="p-1.5 rounded-lg bg-amber-600/40 text-amber-200">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-white">
            {formatCurrency(totalSoldToday)}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-200/90 font-medium">
            <span>{todaySales.length} {todaySales.length === 1 ? 'venda registrada' : 'vendas registradas'} hoje</span>
          </div>
        </div>

        {/* Received Today */}
        <div className="bg-white rounded-2xl p-3.5 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-emerald-800">Recebido na Hora</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-extrabold text-emerald-950">
            {formatCurrency(totalReceivedToday)}
          </div>
          <p className="text-[10px] text-emerald-700/80 mt-0.5 font-medium">Entrou no caixa</p>
        </div>

        {/* Fiado Created Today */}
        <div className="bg-white rounded-2xl p-3.5 border border-amber-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-amber-900">Fiado de Hoje</span>
            <div className="p-1 rounded-md bg-amber-50 text-amber-700">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-extrabold text-amber-950">
            {formatCurrency(totalPendingToday)}
          </div>
          <p className="text-[10px] text-amber-800/80 mt-0.5 font-medium">A receber depois</p>
        </div>
      </div>

      {/* Accumulated Debt Banner */}
      {totalAccumulatedDebt > 0 && (
        <button
          id="btn-banner-total-debt"
          onClick={onOpenDebtors}
          className="w-full text-left bg-amber-50 border border-amber-300/80 hover:bg-amber-100/70 p-3.5 rounded-2xl transition flex items-center justify-between shadow-sm active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center font-bold text-base shadow-inner">
              💰
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-900">Total a Receber na Rota (Fiado)</div>
              <div className="text-base font-extrabold text-amber-950">
                {formatCurrency(totalAccumulatedDebt)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-amber-800">
            <span>{totalDebtorsCount} {totalDebtorsCount === 1 ? 'cliente' : 'clientes'}</span>
            <ChevronRight className="w-4 h-4 text-amber-600" />
          </div>
        </button>
      )}

      {/* Fast Action: Big New Sale Button */}
      <button
        id="btn-fast-new-sale-home"
        onClick={onOpenNewSale}
        className="w-full py-4 px-5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold text-base rounded-2xl shadow-md transition-all transform active:scale-[0.98] flex items-center justify-center gap-2.5"
      >
        <PlusCircle className="w-5 h-5 stroke-[2.5]" />
        <span>REGISTRAR NOVA VENDA</span>
      </button>

      {/* Today's Sales List */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-700" />
            <h3 className="text-sm font-bold text-neutral-900">Vendas Realizadas Hoje</h3>
          </div>
          <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
            {todaySales.length}
          </span>
        </div>

        {todaySales.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-2">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-neutral-800">Nenhuma venda registrada hoje ainda</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
              Toque no botão acima para iniciar o atendimento e marcar sua primeira venda.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {todaySales.map((sale) => (
              <div
                key={sale.id}
                id={`sale-row-${sale.id}`}
                onClick={() => onOpenSaleDetails(sale)}
                className="py-3 flex items-center justify-between hover:bg-amber-50/50 rounded-xl px-1.5 -mx-1.5 transition cursor-pointer active:bg-amber-100/50"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-neutral-900 truncate">
                      {typeof sale.customerName === 'string' ? sale.customerName : 'Cliente'}
                    </span>
                    {sale.hasPendingWrites && (
                      <span
                        className="inline-flex items-center text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-medium"
                        title="Salvo localmente. Aguardando sincronização."
                      >
                        Local
                      </span>
                    )}
                  </div>

                  {/* Cheese Items Summary */}
                  <div className="text-xs text-neutral-600 truncate mt-0.5">
                    {Array.isArray(sale.items) ? sale.items.map((i) => `${typeof i.quantity === 'number' ? i.quantity : 1}x ${typeof i.productName === 'string' ? i.productName : 'Produto'}`).join(', ') : ''}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1">
                    <span>Por: {typeof sale.sellerName === 'string' ? sale.sellerName.split(' ')[0] : 'Vendedor'}</span>
                    {typeof sale.notes === 'string' && sale.notes ? <span className="italic truncate max-w-[120px]"> • {sale.notes}</span> : null}
                  </div>
                </div>

                {/* Amount & Status Badge */}
                <div className="text-right flex flex-col items-end">
                  <div className="text-sm font-extrabold text-neutral-900">
                    {formatCurrency(sale.totalAmount)}
                  </div>
                  {sale.paymentStatus === 'paid' ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full mt-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Pago
                    </span>
                  ) : sale.paymentStatus === 'partial' ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full mt-1">
                      <Clock className="w-2.5 h-2.5" />
                      Falta {formatCurrency(sale.remainingAmount)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full mt-1">
                      <Clock className="w-2.5 h-2.5" />
                      Fiado Total
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
