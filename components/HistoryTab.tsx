'use client';

import React, { useState, useMemo } from 'react';
import { Sale, Payment, Customer } from '@/types';
import { formatCurrency, formatDateBr, formatDateTimeBr, getTodayDateString } from '@/lib/format';
import { 
  History as HistoryIcon, 
  Search, 
  Calendar, 
  Filter, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  ShoppingBag, 
  User, 
  X,
  CreditCard,
  ChevronRight
} from 'lucide-react';

interface HistoryTabProps {
  sales: Sale[];
  payments: Payment[];
  customers: Customer[];
  onOpenSaleDetails: (sale: Sale) => void;
}

type PeriodFilter = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';

export function HistoryTab({
  sales,
  payments,
  customers,
  onOpenSaleDetails,
}: HistoryTabProps) {
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [customDate, setCustomDate] = useState<string>(getTodayDateString());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSellerFilter, setSelectedSellerFilter] = useState<string>('all');
  const [activeView, setActiveView] = useState<'sales' | 'payments'>('sales');

  const todayStr = getTodayDateString();

  // Helper date calculations
  const filteredSales = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return sales.filter((sale) => {
      // 1. Period filter
      const sDate = new Date(sale.saleDate + 'T00:00:00');
      
      if (period === 'today') {
        if (sale.saleDate !== todayStr) return false;
      } else if (period === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        if (sale.saleDate !== yStr) return false;
      } else if (period === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (sDate < weekAgo) return false;
      } else if (period === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        if (sDate < monthAgo) return false;
      } else if (period === 'custom') {
        if (sale.saleDate !== customDate) return false;
      }

      // 2. Seller filter
      if (selectedSellerFilter !== 'all' && sale.sellerId !== selectedSellerFilter) {
        return false;
      }

      // 3. Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = sale.customerName.toLowerCase().includes(term);
        const matchesItems = sale.items.some((i) => i.productName.toLowerCase().includes(term));
        if (!matchesName && !matchesItems) return false;
      }

      return true;
    });
  }, [sales, period, customDate, selectedSellerFilter, searchTerm, todayStr]);

  // Compute aggregated stats for the filtered sales
  const totalSold = filteredSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const totalReceivedOnSpot = filteredSales.reduce((acc, s) => acc + (s.paidAmount || 0), 0);
  const totalPending = filteredSales.reduce((acc, s) => acc + (s.remainingAmount || 0), 0);

  // Extract unique sellers from sales
  const uniqueSellers = useMemo(() => {
    const map = new Map<string, string>();
    sales.forEach((s) => {
      if (s.sellerId && s.sellerName) {
        map.set(s.sellerId, s.sellerName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sales]);

  return (
    <div className="space-y-4 pb-24 pt-2">
      {/* Header */}
      <div className="px-1">
        <h2 className="text-lg font-bold text-neutral-900 leading-tight flex items-center gap-2">
          <HistoryIcon className="w-5 h-5 text-amber-700" />
          <span>Histórico & Relatório de Vendas</span>
        </h2>
        <p className="text-xs text-neutral-500 font-medium">
          Consolidado por dia e períodos da rota
        </p>
      </div>

      {/* Period Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'today', label: 'Hoje' },
          { id: 'yesterday', label: 'Ontem' },
          { id: 'week', label: '7 Dias' },
          { id: 'month', label: '30 Dias' },
          { id: 'all', label: 'Tudo' },
          { id: 'custom', label: 'Data...' },
        ].map((btn) => (
          <button
            key={btn.id}
            id={`btn-period-${btn.id}`}
            type="button"
            onClick={() => setPeriod(btn.id as PeriodFilter)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 ${
              period === btn.id
                ? 'bg-amber-700 text-white shadow-sm'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* If Custom Date selected */}
      {period === 'custom' && (
        <div className="bg-white p-3 rounded-xl border border-amber-200 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-700" />
          <span className="text-xs font-semibold text-neutral-700">Selecione o Dia:</span>
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="px-2 py-1 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-800"
          />
        </div>
      )}

      {/* Aggregate Cards for Selected Period */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-xl border border-neutral-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-neutral-500 block">
            Vendido
          </span>
          <span className="text-sm font-extrabold text-neutral-900 block mt-0.5">
            {formatCurrency(totalSold)}
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">
            Recebido
          </span>
          <span className="text-sm font-extrabold text-emerald-950 block mt-0.5">
            {formatCurrency(totalReceivedOnSpot)}
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-amber-800 block">
            Fiado Aberto
          </span>
          <span className="text-sm font-extrabold text-amber-950 block mt-0.5">
            {formatCurrency(totalPending)}
          </span>
        </div>
      </div>

      {/* Filters (Seller + Search) */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
          <input
            id="input-search-history"
            type="text"
            placeholder="Buscar por cliente ou queijo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-neutral-200 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        {uniqueSellers.length > 1 && (
          <select
            value={selectedSellerFilter}
            onChange={(e) => setSelectedSellerFilter(e.target.value)}
            className="px-2 py-2 text-xs rounded-xl border border-neutral-200 bg-white font-medium text-neutral-700 focus:outline-none"
          >
            <option value="all">Todos Vendedores</option>
            {uniqueSellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Sales List */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100">
          <span className="text-xs font-bold text-neutral-800">
            {filteredSales.length} {filteredSales.length === 1 ? 'registro encontrado' : 'registros encontrados'}
          </span>
        </div>

        {filteredSales.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 text-xs">
            Nenhuma venda localizada para o período selecionado.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredSales.map((sale) => (
              <div
                key={sale.id}
                id={`history-sale-row-${sale.id}`}
                onClick={() => onOpenSaleDetails(sale)}
                className="py-3 flex items-center justify-between hover:bg-amber-50/50 rounded-xl px-1.5 -mx-1.5 transition cursor-pointer active:bg-amber-100/50"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-neutral-900 truncate">
                      {sale.customerName}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      • {formatDateBr(sale.saleDate)}
                    </span>
                  </div>

                  <div className="text-xs text-neutral-600 truncate mt-0.5">
                    {sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-1">
                    <span>Vendedor: {sale.sellerName?.split(' ')[0]}</span>
                    <span>• {sale.paymentMethod}</span>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <div className="text-sm font-extrabold text-neutral-900">
                    {formatCurrency(sale.totalAmount)}
                  </div>
                  {sale.paymentStatus === 'paid' ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full mt-1">
                      Pago
                    </span>
                  ) : sale.paymentStatus === 'partial' ? (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full mt-1">
                      Falta {formatCurrency(sale.remainingAmount)}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full mt-1">
                      Fiado
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
