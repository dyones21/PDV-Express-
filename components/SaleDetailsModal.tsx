'use client';

import React, { useState } from 'react';
import { Sale } from '@/types';
import { formatCurrency, formatDateBr, formatDateTimeBr } from '@/lib/format';
import { cancelSale } from '@/lib/db';
import { useSellerAuth } from '@/hooks/use-seller-auth';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  Share2, 
  MapPin, 
  User, 
  Calendar, 
  Tag, 
  ShieldCheck, 
  ShoppingBag,
  Ban,
  AlertTriangle,
  ExternalLink,
  Navigation
} from 'lucide-react';

interface SaleDetailsModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export function SaleDetailsModal({ sale, onClose }: SaleDetailsModalProps) {
  const { activeSeller } = useSellerAuth();
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  if (!sale) return null;

  const isCancelled = sale.isCancelled || sale.paymentStatus === 'cancelled';
  const isOwner = activeSeller?.role === 'owner';

  const handleShareWhatsApp = () => {
    if (isCancelled) return;
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

  const handleExecuteCancel = async () => {
    try {
      setIsCancelling(true);
      setCancelError('');
      await cancelSale(
        undefined,
        sale.id,
        activeSeller?.name || 'Dono do Negócio',
        'Cancelada a pedido do administrador'
      );
      setIsConfirmingCancel(false);
      onClose();
    } catch (err: any) {
      setCancelError(err.message || 'Erro ao cancelar venda.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-amber-100 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className={`px-4 py-3 text-white flex items-center justify-between ${
          isCancelled ? 'bg-neutral-800' : 'bg-amber-700'
        }`}>
          <div className="flex items-center gap-2">
            {isCancelled ? (
              <Ban className="w-5 h-5 text-red-400" />
            ) : (
              <ShoppingBag className="w-5 h-5 text-amber-200" />
            )}
            <div>
              <h3 className="font-bold text-sm">
                {isCancelled ? 'Venda Cancelada' : 'Detalhes da Venda'}
              </h3>
              <div className="text-[10px] text-amber-200/90">{formatDateTimeBr(sale.createdAt || sale.saleDate)}</div>
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
        <div className="p-4 space-y-3 text-xs max-h-[80vh] overflow-y-auto">
          {/* Cancelled Banner */}
          {isCancelled && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-red-800">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Ban className="w-4 h-4 text-red-600" />
                <span>Esta venda foi cancelada</span>
              </div>
              <p className="text-[11px] text-red-700 mt-1">
                Os itens foram devolvidos ao estoque e o saldo em aberto foi estornado da conta do cliente.
              </p>
              {sale.cancelledBy && (
                <div className="text-[10px] text-red-600 mt-1">
                  Cancelado por: <strong>{sale.cancelledBy}</strong>
                  {sale.cancelledAt && ` em ${formatDateTimeBr(sale.cancelledAt)}`}
                </div>
              )}
            </div>
          )}

          {/* Customer */}
          <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
            <div className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
              Cliente
            </div>
            <div className="text-sm font-bold text-neutral-900 mt-0.5">
              {typeof sale.customerName === 'string' ? sale.customerName : 'Cliente'}
            </div>
            {(sale.customerReferencePoint || sale.customerAddress) && (
              <div className="flex items-center gap-1 text-neutral-600 mt-1">
                <MapPin className="w-3 h-3 text-amber-700 flex-shrink-0" />
                <span>{typeof sale.customerReferencePoint === 'string' && sale.customerReferencePoint ? sale.customerReferencePoint : (typeof sale.customerAddress === 'string' ? sale.customerAddress : '')}</span>
              </div>
            )}
          </div>

          {/* Items List */}
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1.5">
              Produtos
            </div>
            <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden bg-white">
              {(Array.isArray(sale.items) ? sale.items : []).map((item, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className={`font-bold ${isCancelled ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>
                      {typeof item.quantity === 'number' ? item.quantity : 1}x {typeof item.productName === 'string' ? item.productName : 'Produto'}
                    </span>
                    <span className="text-neutral-400 block text-[10px]">
                      {formatCurrency(item.unitPrice)} cada
                    </span>
                  </div>
                  <span className={`font-bold ${isCancelled ? 'line-through text-neutral-400' : 'text-amber-950'}`}>
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
              <span className={`font-bold ${isCancelled ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>
                {formatCurrency(sale.totalAmount)}
              </span>
            </div>

            <div className="flex justify-between font-medium text-neutral-700">
              <span>Valor Pago:</span>
              <span className={`font-bold ${isCancelled ? 'line-through text-neutral-400' : 'text-emerald-700'}`}>
                {formatCurrency(sale.paidAmount)}
              </span>
            </div>

            {sale.remainingAmount > 0 && (
              <div className="flex justify-between font-bold text-amber-900 pt-1 border-t border-neutral-200">
                <span>Saldo em Aberto (Fiado):</span>
                <span className={isCancelled ? 'line-through text-neutral-400' : ''}>
                  {formatCurrency(sale.remainingAmount)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-1 text-[11px]">
              <span className="text-neutral-500">Forma / Status:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-full ${
                  isCancelled
                    ? 'bg-red-100 text-red-800'
                    : sale.paymentStatus === 'paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {isCancelled
                  ? 'Cancelada'
                  : sale.paymentStatus === 'paid'
                  ? 'Pago à Vista'
                  : 'Fiado'} ({typeof sale.paymentMethod === 'string' ? sale.paymentMethod : 'dinheiro'})
              </span>
            </div>
          </div>

          {/* Operator & Location */}
          <div className="flex flex-col gap-1.5 text-[11px] text-neutral-500 px-1">
            <div className="flex justify-between">
              <span>Registrado por: <strong>{typeof sale.sellerName === 'string' ? sale.sellerName : 'Vendedor'}</strong></span>
              <span>Data: {formatDateBr(sale.saleDate)}</span>
            </div>

            {sale.latitude !== undefined && sale.longitude !== undefined && (
              <div className="pt-1 border-t border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-900 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-amber-700" />
                  <span>Localização GPS capturada</span>
                </div>
                <a
                  id="link-sale-maps-location"
                  href={`https://www.google.com/maps?q=${sale.latitude},${sale.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg transition active:scale-95 text-[10px]"
                >
                  <Navigation className="w-3 h-3 text-amber-700" />
                  <span>Ver no mapa</span>
                  <ExternalLink className="w-2.5 h-2.5 ml-0.5 text-amber-700" />
                </a>
              </div>
            )}
          </div>

          {typeof sale.notes === 'string' && sale.notes && (
            <div className="p-2 bg-amber-50 rounded-lg text-amber-900 text-[11px] italic">
              Obs: {sale.notes}
            </div>
          )}

          {/* Confirmation Box for Cancellation */}
          {isConfirmingCancel && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-900 text-xs">Confirmar cancelamento da venda?</p>
                  <p className="text-[11px] text-red-700 mt-0.5">
                    O estoque de todos os produtos desta venda será reposto automaticamente e a dívida do cliente será estornada.
                  </p>
                </div>
              </div>

              {cancelError && (
                <div className="text-[11px] text-red-700 bg-white p-2 rounded border border-red-200 font-semibold">
                  {cancelError}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={() => setIsConfirmingCancel(false)}
                  className="flex-1 py-2 text-xs font-semibold text-neutral-700 bg-white rounded-lg border border-neutral-300"
                >
                  Voltar
                </button>
                <button
                  id="btn-confirm-execute-cancel"
                  type="button"
                  disabled={isCancelling}
                  onClick={handleExecuteCancel}
                  className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
                >
                  {isCancelling ? 'Cancelando...' : 'Sim, Cancelar'}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 space-y-2">
            {!isCancelled && (
              <button
                id="btn-modal-share-receipt"
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow flex items-center justify-center gap-1.5 transition active:scale-95 text-xs"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar Recibo no WhatsApp</span>
              </button>
            )}

            {/* Cancel Button (Owner only, and if not already cancelled) */}
            {!isCancelled && isOwner && !isConfirmingCancel && (
              <button
                id="btn-open-cancel-sale-confirm"
                type="button"
                onClick={() => setIsConfirmingCancel(true)}
                className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancelar Venda (Estornar Estoque)</span>
              </button>
            )}

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

