'use client';

import React from 'react';
import { Sale } from '@/types';
import { formatCurrency, formatDateBr, formatDateTimeBr } from '@/lib/format';
import { X, CheckCircle2, Clock, Share2, MapPin, User, Calendar, Tag, ShieldCheck, ShoppingBag } from 'lucide-react';

interface SaleDetailsModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export function SaleDetailsModal({ sale, onClose }: SaleDetailsModalProps) {
  if (!sale) return null;

  const handleShareWhatsApp = () => {
    const text = `📦 *Comprovante de Compra*\n\n` +
      `Olá, *${sale.customerName}*!\n` +
      `Data da compra: ${formatDateBr(sale.saleDate)}\n\n` +
      `*Itens:* \n` +
      sale.items.map((i) => `• ${i.quantity}x ${i.productName} (${formatCurrency(i.unitPrice)} un) = ${formatCurrency(i.subtotal)}`).join('\n') +
      `\n\n*Valor Total:* ${formatCurrency(sale.totalAmount)}\n` +
      (sale.paymentStatus === 'paid'
        ? `✅ *Status:* Pago à vista (${sale.paymentMethod})`
        : sale.paymentStatus === 'partial'
        ? `⏳ *Status:* Pago ${formatCurrency(sale.paidAmount)} | Restante a receber: ${formatCurrency(sale.remainingAmount)}`
        : `⏳ *Status:* Fiado (A receber): ${formatCurrency(sale.remainingAmount)}`) +
      `\n\nVendedor: ${sale.sellerName}\n` +
      `\n_Agradecemos a preferência!_`;

    const phone = sale.customerPhone ? sale.customerPhone.replace(/\D/g, '') : '';
    const url = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-amber-100 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-amber-700 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-200" />
            <div>
              <h3 className="font-bold text-sm">Detalhes da Venda</h3>
              <div className="text-[10px] text-amber-200">{formatDateTimeBr(sale.createdAt || sale.saleDate)}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-amber-200 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 text-xs">
          {/* Customer */}
          <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
            <div className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
              Cliente
            </div>
            <div className="text-sm font-bold text-neutral-900 mt-0.5">
              {sale.customerName}
            </div>
            {(sale.customerReferencePoint || sale.customerAddress) && (
              <div className="flex items-center gap-1 text-neutral-600 mt-1">
                <MapPin className="w-3 h-3 text-amber-700 flex-shrink-0" />
                <span>{sale.customerReferencePoint || sale.customerAddress}</span>
              </div>
            )}
          </div>

          {/* Items List */}
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1.5">
              Produtos
            </div>
            <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden bg-white">
              {sale.items.map((item, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-neutral-900">{item.quantity}x {item.productName}</span>
                    <span className="text-neutral-400 block text-[10px]">
                      {formatCurrency(item.unitPrice)} cada
                    </span>
                  </div>
                  <span className="font-bold text-amber-950">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Status */}
          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-1.5">
            <div className="flex justify-between font-medium text-neutral-700">
              <span>Valor Total dos Produtos:</span>
              <span className="font-bold text-neutral-900">{formatCurrency(sale.totalAmount)}</span>
            </div>

            <div className="flex justify-between font-medium text-neutral-700">
              <span>Valor Pago:</span>
              <span className="font-bold text-emerald-700">{formatCurrency(sale.paidAmount)}</span>
            </div>

            {sale.remainingAmount > 0 && (
              <div className="flex justify-between font-bold text-amber-900 pt-1 border-t border-neutral-200">
                <span>Saldo em Aberto (Fiado):</span>
                <span>{formatCurrency(sale.remainingAmount)}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-1 text-[11px]">
              <span className="text-neutral-500">Forma / Status:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-full ${
                  sale.paymentStatus === 'paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {sale.paymentStatus === 'paid' ? 'Pago à Vista' : 'Fiado'} ({sale.paymentMethod})
              </span>
            </div>
          </div>

          {/* Operator */}
          <div className="flex justify-between text-[11px] text-neutral-500 px-1">
            <span>Registrado por: <strong>{sale.sellerName}</strong></span>
            <span>Data: {formatDateBr(sale.saleDate)}</span>
          </div>

          {sale.notes && (
            <div className="p-2 bg-amber-50 rounded-lg text-amber-900 text-[11px] italic">
              Obs: {sale.notes}
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 space-y-2">
            <button
              id="btn-modal-share-receipt"
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow flex items-center justify-center gap-1.5 transition active:scale-95 text-xs"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar Recibo no WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-xl text-xs"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
