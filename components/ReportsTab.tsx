'use client';

import React, { useState, useMemo } from 'react';
import { Sale, Payment, Customer, Seller, Product } from '@/types';
import { formatCurrency, formatDateBr, getTodayDateString } from '@/lib/format';
import { useSellerAuth } from '@/hooks/use-seller-auth';
import { 
  BarChart3, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  HandCoins, 
  Package, 
  Users, 
  Award, 
  ArrowUpRight, 
  Clock, 
  ShieldAlert,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';

interface ReportsTabProps {
  sales: Sale[];
  payments: Payment[];
  sellers: Seller[];
  customers: Customer[];
  products: Product[];
}

type PeriodType = 'hoje' | '7dias' | '30dias' | 'mes_atual' | 'custom';

export function ReportsTab({ sales, payments, sellers, customers, products }: ReportsTabProps) {
  const { isOwner, activeSeller } = useSellerAuth();
  const [periodType, setPeriodType] = useState<PeriodType>('hoje');
  const today = getTodayDateString();

  const [customStartDate, setCustomStartDate] = useState(today);
  const [customEndDate, setCustomEndDate] = useState(today);

  // Calculate start and end date based on selected period
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const now = new Date();
    let start = today;
    let end = today;
    let label = 'Hoje';

    if (periodType === 'hoje') {
      start = today;
      end = today;
      label = `Hoje (${formatDateBr(today)})`;
    } else if (periodType === '7dias') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      start = d.toISOString().split('T')[0];
      end = today;
      label = `Últimos 7 dias (${formatDateBr(start)} a ${formatDateBr(end)})`;
    } else if (periodType === '30dias') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      start = d.toISOString().split('T')[0];
      end = today;
      label = `Últimos 30 dias (${formatDateBr(start)} a ${formatDateBr(end)})`;
    } else if (periodType === 'mes_atual') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      start = `${y}-${m}-01`;
      end = today;
      label = `Este Mês (${formatDateBr(start)} a ${formatDateBr(end)})`;
    } else if (periodType === 'custom') {
      start = customStartDate || today;
      end = customEndDate || today;
      label = `Período: ${formatDateBr(start)} a ${formatDateBr(end)}`;
    }

    return { startDate: start, endDate: end, periodLabel: label };
  }, [periodType, today, customStartDate, customEndDate]);

  // Filter Sales in Period
  const periodSales = useMemo(() => {
    return sales.filter((s) => {
      if (s.isCancelled || s.paymentStatus === 'cancelled') return false;
      const d = s.saleDate || s.createdAt?.split('T')[0];
      return d >= startDate && d <= endDate;
    });
  }, [sales, startDate, endDate]);

  // Filter Payments in Period (Debt settlements made during this period)
  const periodSettlementPayments = useMemo(() => {
    return payments.filter((p) => {
      const d = p.paymentDate || p.createdAt?.split('T')[0];
      // Only consider stand-alone settlements or debt payments (not instant sale downpayments to avoid double counting)
      const isInstantSale = p.notes && (p.notes.includes('no ato da venda') || p.notes.includes('Entrada paga'));
      return d >= startDate && d <= endDate && !isInstantSale;
    });
  }, [payments, startDate, endDate]);

  // 1. Total Sold
  const totalSold = useMemo(() => {
    return periodSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  }, [periodSales]);

  // 2. Immediate Received from Sales
  const immediateReceived = useMemo(() => {
    return periodSales.reduce((acc, s) => acc + (s.paidAmount || 0), 0);
  }, [periodSales]);

  // 3. Settle Debt Received in Period
  const debtSettlementsReceived = useMemo(() => {
    return periodSettlementPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [periodSettlementPayments]);

  // 4. Total Cash Received (Immediate + Debt Settlements)
  const totalReceived = immediateReceived + debtSettlementsReceived;

  // 5. Total Fiado Generated in Period
  const totalFiadoGenerated = useMemo(() => {
    return periodSales.reduce((acc, s) => acc + (s.remainingAmount || 0), 0);
  }, [periodSales]);

  // 6. Product Sales Ranking
  const productStats = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; totalRevenue: number; unit?: string }>();

    for (const sale of periodSales) {
      for (const item of sale.items || []) {
        const key = item.productId || item.productName;
        const current = map.get(key) || {
          name: item.productName,
          quantity: 0,
          totalRevenue: 0,
          unit: item.unit || 'un',
        };
        current.quantity += Number(item.quantity || 0);
        current.totalRevenue += Number(item.subtotal || 0);
        map.set(key, current);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [periodSales]);

  const topProduct = productStats[0] || null;

  // 7. Sales by Seller
  const sellerStats = useMemo(() => {
    const map = new Map<string, { name: string; totalSold: number; salesCount: number; fiadoSold: number }>();

    for (const sale of periodSales) {
      const sId = sale.sellerId || 'vendedor';
      const sName = sale.sellerName || 'Vendedor';
      const current = map.get(sId) || {
        name: sName,
        totalSold: 0,
        salesCount: 0,
        fiadoSold: 0,
      };
      current.totalSold += Number(sale.totalAmount || 0);
      current.salesCount += 1;
      current.fiadoSold += Number(sale.remainingAmount || 0);
      map.set(sId, current);
    }

    return Array.from(map.entries()).map(([id, data]) => ({
      id,
      ...data,
    })).sort((a, b) => b.totalSold - a.totalSold);
  }, [periodSales]);

  // If not owner, display friendly access control message
  if (!isOwner) {
    return (
      <div className="space-y-4 pb-24 pt-4">
        <div className="bg-white rounded-2xl p-8 border border-neutral-200 text-center shadow-sm max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-neutral-900">Visão Exclusiva do Dono</h2>
          <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
            A aba de relatórios e faturamento consolidado é reservada para o perfil do Dono / Administrador do negócio.
          </p>
          <div className="mt-4 p-3 bg-amber-50 rounded-xl text-amber-900 text-xs font-semibold">
            Vendedor atual: <strong>{activeSeller?.name}</strong> (Vendedor Auxiliar)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 leading-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-700" />
            <span>Relatórios & Faturamento</span>
          </h2>
          <p className="text-xs text-neutral-500 font-medium">
            Visão consolidada do negócio para o Dono
          </p>
        </div>
      </div>

      {/* Period Selector Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-neutral-200/90 shadow-sm">
        <div className="grid grid-cols-4 gap-1">
          <button
            type="button"
            id="btn-period-hoje"
            onClick={() => setPeriodType('hoje')}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              periodType === 'hoje'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Hoje
          </button>
          <button
            type="button"
            id="btn-period-7dias"
            onClick={() => setPeriodType('7dias')}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              periodType === '7dias'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            7 Dias
          </button>
          <button
            type="button"
            id="btn-period-mes"
            onClick={() => setPeriodType('mes_atual')}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              periodType === 'mes_atual'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Este Mês
          </button>
          <button
            type="button"
            id="btn-period-custom"
            onClick={() => setPeriodType('custom')}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              periodType === 'custom'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Outro
          </button>
        </div>

        {/* Custom date range pickers */}
        {periodType === 'custom' && (
          <div className="pt-3 pb-1 px-1 grid grid-cols-2 gap-2 border-t border-neutral-100 mt-2 animate-in fade-in">
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 mb-1">De:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 mb-1">Até:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Period Indicator */}
      <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-amber-900">
        <CalendarDays className="w-3.5 h-3.5 text-amber-700" />
        <span>{periodLabel}</span>
        <span className="text-neutral-400 font-normal ml-auto">
          {periodSales.length} {periodSales.length === 1 ? 'venda' : 'vendas'} no período
        </span>
      </div>

      {/* Big Numbers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Total Sold */}
        <div className="bg-gradient-to-br from-amber-700 to-amber-900 text-white rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-amber-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Total Vendido</span>
            <TrendingUp className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight">
            {formatCurrency(totalSold)}
          </div>
          <p className="text-[11px] text-amber-200/90 mt-1 font-medium">
            Soma de todas as vendas do período
          </p>
        </div>

        {/* 2. Total Received (In Cash / PIX) */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-sm">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Total Recebido em Caixa</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-700 tracking-tight">
            {formatCurrency(totalReceived)}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {formatCurrency(immediateReceived)} à vista + {formatCurrency(debtSettlementsReceived)} de acertos
          </p>
        </div>

        {/* 3. Total Fiado Generated */}
        <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-sm">
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Fiado no Período</span>
            <HandCoins className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-amber-950 tracking-tight">
            {formatCurrency(totalFiadoGenerated)}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            Valor a receber gerado nestas vendas
          </p>
        </div>
      </div>

      {/* Top Product Section */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-700">
              Produto Mais Vendido
            </h3>
          </div>
          <span className="text-[11px] text-neutral-400 font-medium">Por quantidade</span>
        </div>

        {topProduct ? (
          <div className="space-y-3">
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  🏆 Campeão de Vendas
                </div>
                <div className="text-base font-extrabold text-neutral-900 mt-0.5">
                  {topProduct.name}
                </div>
                <div className="text-xs text-neutral-600 mt-0.5">
                  Faturamento gerado: <strong>{formatCurrency(topProduct.totalRevenue)}</strong>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-amber-900">
                  {topProduct.quantity}
                </span>
                <span className="text-xs font-bold text-amber-800 ml-1">
                  {topProduct.unit}
                </span>
              </div>
            </div>

            {/* Other top products ranking */}
            {productStats.length > 1 && (
              <div className="pt-2">
                <div className="text-[11px] font-bold text-neutral-500 mb-2">
                  Outros produtos vendidos no período:
                </div>
                <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
                  {productStats.slice(1, 5).map((prod, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs bg-white">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-neutral-400 w-4">
                          #{idx + 2}
                        </span>
                        <div>
                          <span className="font-bold text-neutral-800">{prod.name}</span>
                          <span className="text-[10px] text-neutral-400 block">
                            {formatCurrency(prod.totalRevenue)}
                          </span>
                        </div>
                      </div>
                      <span className="font-extrabold text-neutral-900">
                        {prod.quantity} {prod.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-neutral-400">
            Nenhuma venda de produto registrada no período selecionado.
          </div>
        )}
      </div>

      {/* Sales by Seller Section */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-700">
              Vendas por Vendedor
            </h3>
          </div>
          <span className="text-[11px] text-neutral-400 font-medium">
            {sellerStats.length} {sellerStats.length === 1 ? 'vendedor' : 'vendedores'} ativos
          </span>
        </div>

        {sellerStats.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-400">
            Nenhuma venda registrada por vendedores no período selecionado.
          </div>
        ) : (
          <div className="space-y-2.5">
            {sellerStats.map((sellerItem) => (
              <div
                key={sellerItem.id}
                className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-amber-700 text-white font-bold flex items-center justify-center text-xs">
                    {sellerItem.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-900">
                      {sellerItem.name}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {sellerItem.salesCount} {sellerItem.salesCount === 1 ? 'venda realizada' : 'vendas realizadas'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-extrabold text-amber-950">
                    {formatCurrency(sellerItem.totalSold)}
                  </div>
                  {sellerItem.fiadoSold > 0 && (
                    <div className="text-[10px] text-amber-800 font-semibold">
                      Fiado: {formatCurrency(sellerItem.fiadoSold)}
                    </div>
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
