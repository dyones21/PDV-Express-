'use client';

import React, { useState, useEffect } from 'react';
import { Sale, Business } from '@/types';
import { formatCurrency, formatDateBr, formatDateTimeBr } from '@/lib/format';
import { cancelSale, subscribeBusiness } from '@/lib/db';
import { useSellerAuth } from '@/hooks/use-seller-auth';
import { useBusiness } from '@/context/BusinessContext';
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
  Navigation,
  Printer,
  Eye,
  FileText,
  Copy,
  Check,
  Download,
  Loader2,
  CalendarClock
} from 'lucide-react';
import { shareReceiptPdf, downloadReceiptPdf } from '@/lib/receiptPdf';

function formatPaymentMethodLabel(method?: string): string {
  switch (method) {
    case 'dinheiro': return 'Dinheiro';
    case 'pix': return 'PIX';
    case 'cartao_debito': return 'Cartão de Débito';
    case 'cartao_credito': return 'Cartão de Crédito';
    case 'outro': return 'Outro';
    default: return method || 'Dinheiro';
  }
}

interface SaleDetailsModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export function SaleDetailsModal({ sale, onClose }: SaleDetailsModalProps) {
  const { businessId } = useBusiness();
  const { activeSeller } = useSellerAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [isPreviewReceiptOpen, setIsPreviewReceiptOpen] = useState(false);
  const [printNotice, setPrintNotice] = useState('');
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfNotice, setPdfNotice] = useState('');

  useEffect(() => {
    if (!businessId) return;
    const unsub = subscribeBusiness(businessId, (b) => {
      if (b) setBusiness(b);
    });
    return () => unsub();
  }, [businessId]);

  if (!sale) return null;

  const isCancelled = sale.isCancelled || sale.paymentStatus === 'cancelled';
  const isOwner = activeSeller?.role === 'owner';

  const itemsSubtotal = (Array.isArray(sale.items) ? sale.items : []).reduce(
    (acc, it) => acc + (it.subtotal || 0),
    0
  );
  const discountVal =
    sale.discountAmount !== undefined && sale.discountAmount > 0
      ? sale.discountAmount
      : sale.discountValue && sale.discountValue > 0
      ? sale.discountType === 'percent'
        ? (itemsSubtotal * sale.discountValue) / 100
        : sale.discountValue
      : 0;

  const handleSharePdf = async () => {
    if (isCancelled || !sale) return;
    try {
      setIsSharingPdf(true);
      setPdfNotice('');
      const res = await shareReceiptPdf({
        sale,
        business,
        nextVisitDate: sale.nextVisitDate,
      });
      if (res.message) {
        setPdfNotice(res.message);
        setTimeout(() => setPdfNotice(''), 4500);
      }
    } catch (err: any) {
      console.error('Erro ao compartilhar recibo:', err);
      setPdfNotice('Não foi possível compartilhar o recibo.');
      setTimeout(() => setPdfNotice(''), 4000);
    } finally {
      setIsSharingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!sale) return;
    try {
      setIsDownloadingPdf(true);
      setPdfNotice('');
      await downloadReceiptPdf({
        sale,
        business,
        nextVisitDate: sale.nextVisitDate,
      });
      setPdfNotice('Recibo em PDF baixado com sucesso!');
      setTimeout(() => setPdfNotice(''), 4000);
    } catch (err: any) {
      console.error('Erro ao baixar recibo PDF:', err);
      setPdfNotice('Erro ao gerar o arquivo PDF.');
      setTimeout(() => setPdfNotice(''), 4000);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!sale) return;
    setPrintNotice('');

    const logoHtml = business?.logoUrl
      ? `<div style="text-align: center; margin-bottom: 8px;">
           <img src="${business.logoUrl}" alt="Logo" style="max-height: 70px; max-width: 160px; object-fit: contain; margin: 0 auto; display: block;" />
         </div>`
      : '';

    const addressHtml = (sale.customerReferencePoint || sale.customerAddress)
      ? `<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-top: 2px;">
           <span style="color: #666; flex-shrink: 0;">Endereço / Ref:</span>
           <span style="font-weight: 500; text-align: right; word-break: break-word; flex: 1;">${sale.customerReferencePoint || sale.customerAddress}</span>
         </div>`
      : '';

    const returnDateHtml = sale.nextVisitDate
      ? `<div style="display: flex; justify-content: space-between; margin-top: 3px; color: #b45309; font-weight: bold;">
           <span>Retorno Agendado:</span>
           <span style="text-align: right;">${formatDateBr(sale.nextVisitDate)}</span>
         </div>`
      : '';

    const cancelledBanner = isCancelled
      ? `<div style="text-align: center; font-weight: bold; color: #dc2626; border: 1px solid #dc2626; padding: 4px; border-radius: 4px; margin: 6px 0; font-size: 11px;">
           *** VENDA CANCELADA ***
         </div>`
      : '';

    const itemsRows = (Array.isArray(sale.items) ? sale.items : [])
      .map(
        (item) => `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 3px 0;">
          <div style="flex: 1; padding-right: 8px;">
            <span style="font-weight: bold;">${item.quantity}${item.unit ? ' ' + item.unit : 'x'}</span>
            <span>${item.productName}</span>
          </div>
          <span style="width: 65px; text-align: right; color: #444; white-space: nowrap;">${formatCurrency(item.unitPrice)}</span>
          <span style="width: 75px; text-align: right; font-weight: 600; white-space: nowrap;">${formatCurrency(item.subtotal)}</span>
        </div>`
      )
      .join('');

    const discountRows = discountVal > 0
      ? `
        <div style="display: flex; justify-content: space-between; color: #444; margin-top: 2px;">
          <span>Subtotal dos Produtos:</span>
          <span>${formatCurrency(itemsSubtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; color: #444; margin-top: 2px;">
          <span>Desconto ${sale.discountType === 'percent' ? `(${sale.discountValue}%)` : ''}:</span>
          <span>- ${formatCurrency(discountVal)}</span>
        </div>`
      : '';

    const paymentsRows = (sale.paymentBreakdown && sale.paymentBreakdown.length > 0)
      ? sale.paymentBreakdown
          .map(
            (b) => `
            <div style="display: flex; justify-content: space-between; padding-left: 4px; margin-top: 2px;">
              <span>${formatPaymentMethodLabel(b.method)}:</span>
              <span style="font-weight: 600;">${formatCurrency(b.amount)}</span>
            </div>`
          )
          .join('')
      : `
        <div style="display: flex; justify-content: space-between; padding-left: 4px; margin-top: 2px;">
          <span>${formatPaymentMethodLabel(sale.paymentMethod)}:</span>
          <span style="font-weight: 600;">${formatCurrency(sale.paidAmount > 0 ? sale.paidAmount : sale.totalAmount)}</span>
        </div>`;

    const remainingRow = sale.remainingAmount > 0
      ? `<div style="display: flex; justify-content: space-between; font-weight: bold; color: #000; margin-top: 3px;">
           <span>Saldo a Receber (Fiado):</span>
           <span>${formatCurrency(sale.remainingAmount)}</span>
         </div>
         ${sale.nextVisitDate ? `
         <div style="display: flex; justify-content: space-between; font-size: 10px; color: #b45309; font-weight: bold; margin-top: 2px;">
           <span>Cobrança / Retorno:</span>
           <span>${formatDateBr(sale.nextVisitDate)}</span>
         </div>` : ''}`
      : '';

    const notesHtml = sale.notes
      ? `<div style="margin-top: 8px; padding-top: 4px; border-top: 1px dotted #ccc; font-size: 10px; font-style: italic; color: #444;">
           Obs: ${sale.notes}
         </div>`
      : '';

    const now = new Date();
    const printDateStr = now.toLocaleDateString('pt-BR');
    const printTimeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const statusLabel = isCancelled
      ? 'Cancelada'
      : sale.paymentStatus === 'paid'
      ? 'Pago Integralmente'
      : sale.paymentStatus === 'partial'
      ? 'Pagamento Parcial'
      : 'Pendente (Fiado)';

    const receiptHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo - ${business?.name || 'Venda'}</title>
  <style>
    @page { margin: 4mm; size: auto; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f4f4f5;
      color: #000000;
      padding: 16px;
      font-size: 11px;
      line-height: 1.4;
    }
    .container { max-width: 360px; margin: 0 auto; }
    .actions-bar { display: flex; gap: 8px; margin-bottom: 14px; }
    .btn {
      flex: 1;
      padding: 10px 12px;
      font-size: 13px;
      font-weight: bold;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
    .btn-print { background: #18181b; color: #ffffff; }
    .btn-close { background: #e4e4e7; color: #27272a; }
    .ticket {
      background: #ffffff;
      padding: 18px 14px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .divider-dashed { border-bottom: 1px dashed #71717a; margin: 8px 0; }
    @media print {
      body { background: #ffffff !important; padding: 0 !important; }
      .actions-bar { display: none !important; }
      .ticket { padding: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="actions-bar">
      <button class="btn btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
      <button class="btn btn-close" onclick="window.close()">Fechar</button>
    </div>

    <div class="ticket">
      ${logoHtml}
      <div style="text-align: center; margin-bottom: 6px;">
        <h1 style="font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">
          ${business?.name || 'Comprovante de Venda'}
        </h1>
        <p style="font-size: 10px; font-weight: 600; color: #52525b; text-transform: uppercase; letter-spacing: 0.1em;">
          Comprovante de Venda
        </p>
      </div>

      <div class="divider-dashed"></div>

      <div style="font-size: 11px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #52525b;">Data e Hora:</span>
          <span style="font-weight: 600;">${formatDateTimeBr(sale.createdAt || sale.saleDate)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 2px;">
          <span style="color: #52525b;">Vendedor:</span>
          <span style="font-weight: 600;">${sale.sellerName || 'Vendedor'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-top: 2px;">
          <span style="color: #52525b; flex-shrink: 0;">Cliente:</span>
          <span style="font-weight: 600; text-align: right; word-break: break-word; flex: 1;">${sale.customerName?.trim() || 'Cliente Avulso'}</span>
        </div>
        ${addressHtml}
        ${returnDateHtml}
        ${cancelledBanner}
      </div>

      <div class="divider-dashed"></div>

      <div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; text-transform: uppercase; color: #52525b; border-bottom: 1px solid #e4e4e7; padding-bottom: 4px;">
          <span style="flex: 1;">Qtd / Produto</span>
          <span style="width: 65px; text-align: right;">Unit.</span>
          <span style="width: 75px; text-align: right;">Subtotal</span>
        </div>
        ${itemsRows}
      </div>

      <div class="divider-dashed"></div>

      <div style="font-size: 11px;">
        ${discountRows}
        <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-top: 4px; padding-top: 4px; border-top: 1px solid #d4d4d8;">
          <span>TOTAL:</span>
          <span>${formatCurrency(sale.totalAmount)}</span>
        </div>
      </div>

      <div class="divider-dashed"></div>

      <div style="font-size: 11px;">
        <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #52525b; margin-bottom: 3px;">
          Forma de Pagamento:
        </div>
        ${paymentsRows}
        <div style="display: flex; justify-content: space-between; padding-top: 3px; margin-top: 3px; border-top: 1px dotted #d4d4d8;">
          <span>Valor Pago no Ato:</span>
          <span style="font-weight: bold;">${formatCurrency(sale.paidAmount)}</span>
        </div>
        ${remainingRow}
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #52525b; margin-top: 3px;">
          <span>Status:</span>
          <span style="font-weight: bold; text-transform: uppercase;">${statusLabel}</span>
        </div>
      </div>

      ${notesHtml}

      <div class="divider-dashed" style="margin-top: 12px;"></div>
      <div style="text-align: center; color: #52525b; font-size: 10px; margin-top: 6px;">
        <p style="font-weight: 600; color: #000; font-size: 11px;">Agradecemos a sua preferência!</p>
        <p style="font-size: 9px; margin-top: 2px;">Impresso em ${printDateStr} às ${printTimeStr}</p>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        try {
          window.focus();
          window.print();
        } catch(e) {
          console.warn('Auto print:', e);
        }
      }, 300);
    };
  <\/script>
</body>
</html>`;

    let popupOpened = false;
    try {
      const printWindow = window.open('', '_blank', 'width=460,height=720,menubar=no,toolbar=no,location=no,status=no');
      if (printWindow && !printWindow.closed) {
        printWindow.document.open();
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
        popupOpened = true;
      }
    } catch (err) {
      console.warn('Popup bloqueado:', err);
    }

    if (!popupOpened) {
      // Fallback: se o navegador bloquear o popup (comum em iframes sandboxed ou mobile),
      // abre o modal de visualização do recibo diretamente na tela para permitir impressão/cópia
      try {
        window.print();
      } catch (e) {
        console.warn('Erro em window.print():', e);
      }
      setIsPreviewReceiptOpen(true);
      setPrintNotice('A janela de impressão foi bloqueada pelo navegador. Você pode visualizar o recibo na tela abaixo ou liberar pop-ups.');
    }
  };

  const handleCopyReceiptText = () => {
    const text = `📦 COMPROVANTE DE VENDA\n` +
      `${business?.name || 'MEI'}\n` +
      `--------------------------------\n` +
      `Data: ${formatDateTimeBr(sale.createdAt || sale.saleDate)}\n` +
      `Vendedor: ${sale.sellerName || 'Vendedor'}\n` +
      `Cliente: ${sale.customerName?.trim() || 'Cliente Avulso'}\n` +
      `--------------------------------\n` +
      `ITENS:\n` +
      sale.items.map((i) => `• ${i.quantity}${i.unit ? ' ' + i.unit : 'x'} ${i.productName}: ${formatCurrency(i.subtotal)}`).join('\n') +
      `\n--------------------------------\n` +
      (discountVal > 0 ? `Desconto: - ${formatCurrency(discountVal)}\n` : '') +
      `TOTAL: ${formatCurrency(sale.totalAmount)}\n` +
      `Pago no Ato: ${formatCurrency(sale.paidAmount)}\n` +
      (sale.remainingAmount > 0 ? `Restante (Fiado): ${formatCurrency(sale.remainingAmount)}\n` : '') +
      `--------------------------------\n` +
      `Agradecemos a sua preferência!`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedReceipt(true);
      setTimeout(() => setCopiedReceipt(false), 3000);
    }
  };

  const handleExecuteCancel = async () => {
    try {
      setIsCancelling(true);
      setCancelError('');
      await cancelSale(
        businessId,
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
    <>
      {/* Modal na Tela (Ocultado na Impressão) */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
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
              <div className="text-sm font-bold text-neutral-900 mt-0.5 break-words">
                {typeof sale.customerName === 'string' ? sale.customerName : 'Cliente'}
              </div>
              {(sale.customerReferencePoint || sale.customerAddress) && (
                <div className="flex items-start gap-1 text-neutral-600 mt-1">
                  <MapPin className="w-3 h-3 text-amber-700 flex-shrink-0 mt-0.5" />
                  <span className="break-words">{typeof sale.customerReferencePoint === 'string' && sale.customerReferencePoint ? sale.customerReferencePoint : (typeof sale.customerAddress === 'string' ? sale.customerAddress : '')}</span>
                </div>
              )}
              {sale.nextVisitDate && (
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs mt-2 pt-2 border-t border-amber-200/80">
                  <CalendarClock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Retorno Agendado: {formatDateBr(sale.nextVisitDate)}</span>
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
              {pdfNotice && (
                <div className="p-2.5 bg-neutral-900 text-white text-xs font-semibold rounded-xl text-center shadow animate-in fade-in flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{pdfNotice}</span>
                </div>
              )}

              <div className="flex gap-2">
                {!isCancelled && (
                  <button
                    id="btn-modal-share-receipt-pdf"
                    type="button"
                    onClick={handleSharePdf}
                    disabled={isSharingPdf}
                    className="flex-1 py-2.5 bg-neutral-900 hover:bg-black text-white font-bold rounded-xl shadow flex items-center justify-center gap-1.5 transition active:scale-95 text-xs disabled:opacity-60"
                    title="Compartilhar comprovante em PDF"
                  >
                    {isSharingPdf ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    ) : (
                      <Share2 className="w-4 h-4 text-amber-400" />
                    )}
                    <span>{isSharingPdf ? 'Gerando...' : 'Compartilhar PDF'}</span>
                  </button>
                )}
                <button
                  id="btn-modal-download-pdf"
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-xl border border-neutral-300 shadow-2xs flex items-center justify-center gap-1.5 transition active:scale-95 text-xs"
                  title="Baixar arquivo PDF"
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
                  ) : (
                    <Download className="w-4 h-4 text-neutral-700" />
                  )}
                  <span className="hidden sm:inline">Baixar PDF</span>
                </button>
                <button
                  id="btn-modal-preview-receipt"
                  type="button"
                  onClick={() => setIsPreviewReceiptOpen(true)}
                  className="px-3 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-xl border border-neutral-300 shadow-2xs flex items-center justify-center gap-1.5 transition active:scale-95 text-xs"
                  title="Visualizar recibo"
                >
                  <Eye className="w-4 h-4 text-neutral-600" />
                  <span className="hidden sm:inline">Ver Recibo</span>
                </button>
                <button
                  id="btn-modal-print-receipt"
                  type="button"
                  onClick={handlePrintReceipt}
                  className="px-3 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-xl border border-neutral-300 shadow-2xs flex items-center justify-center gap-1.5 transition active:scale-95 text-xs"
                  title="Imprimir Recibo"
                >
                  <Printer className="w-4 h-4 text-neutral-700" />
                  <span className="hidden sm:inline">Imprimir</span>
                </button>
              </div>

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

      {/* Recibo Formatado para Impressão */}
      <div
        id="receipt-print-root"
        className="hidden print:block w-full max-w-[440px] mx-auto bg-white text-black p-4 font-sans text-xs leading-normal"
      >
        {/* Cabeçalho da Empresa */}
        <div className="text-center space-y-1 mb-2">
          {business?.logoUrl && (
            <div className="flex justify-center mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={business.logoUrl}
                alt="Logo da Empresa"
                className="max-h-20 max-w-[160px] object-contain"
              />
            </div>
          )}
          <h1 className="text-sm font-bold uppercase tracking-wider text-black">
            {business?.name || 'Comprovante de Venda'}
          </h1>
          <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-widest">
            Comprovante de Venda
          </p>
        </div>

        {/* Divisor */}
        <div className="border-b border-dashed border-neutral-400 my-2" />

        {/* Informações da Venda */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-neutral-600">Data e Hora:</span>
            <span className="font-semibold">{formatDateTimeBr(sale.createdAt || sale.saleDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600">Vendedor:</span>
            <span className="font-semibold">{sale.sellerName || 'Vendedor'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600">Cliente:</span>
            <span className="font-semibold">
              {sale.customerName && sale.customerName.trim() ? sale.customerName : 'Cliente Avulso'}
            </span>
          </div>
          {(sale.customerReferencePoint || sale.customerAddress) && (
            <div className="flex justify-between">
              <span className="text-neutral-600">Endereço / Ref:</span>
              <span className="text-right font-medium max-w-[240px]">
                {sale.customerReferencePoint || sale.customerAddress}
              </span>
            </div>
          )}
          {isCancelled && (
            <div className="text-center font-bold text-red-700 border border-red-500 py-1 rounded my-1 text-xs">
              *** VENDA CANCELADA ***
            </div>
          )}
        </div>

        {/* Divisor */}
        <div className="border-b border-dashed border-neutral-400 my-2" />

        {/* Itens da Venda */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between font-bold text-[10px] uppercase text-neutral-600 border-b border-neutral-300 pb-1">
            <span className="flex-1">Qtd / Produto</span>
            <span className="w-16 text-right">Unit.</span>
            <span className="w-20 text-right">Subtotal</span>
          </div>

          {(Array.isArray(sale.items) ? sale.items : []).map((item, idx) => (
            <div key={idx} className="flex justify-between items-start py-0.5">
              <div className="flex-1 pr-2">
                <span className="font-bold">{item.quantity}{item.unit ? ` ${item.unit}` : 'x'}</span>{' '}
                <span>{item.productName}</span>
              </div>
              <span className="w-16 text-right whitespace-nowrap text-neutral-700">
                {formatCurrency(item.unitPrice)}
              </span>
              <span className="w-20 text-right font-semibold whitespace-nowrap">
                {formatCurrency(item.subtotal)}
              </span>
            </div>
          ))}
        </div>

        {/* Divisor */}
        <div className="border-b border-dashed border-neutral-400 my-2" />

        {/* Totais e Desconto */}
        <div className="space-y-1 text-[11px]">
          {discountVal > 0 && (
            <>
              <div className="flex justify-between text-neutral-700">
                <span>Subtotal dos Produtos:</span>
                <span>{formatCurrency(itemsSubtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-700">
                <span>
                  Desconto {sale.discountType === 'percent' ? `(${sale.discountValue}%)` : ''}:
                </span>
                <span>- {formatCurrency(discountVal)}</span>
              </div>
            </>
          )}

          <div className="flex justify-between text-xs font-bold text-black pt-1 border-t border-neutral-300">
            <span>TOTAL:</span>
            <span>{formatCurrency(sale.totalAmount)}</span>
          </div>
        </div>

        {/* Divisor */}
        <div className="border-b border-dashed border-neutral-400 my-2" />

        {/* Pagamento */}
        <div className="space-y-1 text-[11px]">
          <div className="font-bold text-[10px] uppercase text-neutral-600">
            Forma de Pagamento:
          </div>

          {sale.paymentBreakdown && sale.paymentBreakdown.length > 0 ? (
            sale.paymentBreakdown.map((b, i) => (
              <div key={i} className="flex justify-between pl-1">
                <span>{formatPaymentMethodLabel(b.method)}:</span>
                <span className="font-semibold">{formatCurrency(b.amount)}</span>
              </div>
            ))
          ) : (
            <div className="flex justify-between pl-1">
              <span>{formatPaymentMethodLabel(sale.paymentMethod)}:</span>
              <span className="font-semibold">{formatCurrency(sale.paidAmount > 0 ? sale.paidAmount : sale.totalAmount)}</span>
            </div>
          )}

          <div className="flex justify-between pt-1 border-t border-dotted border-neutral-300">
            <span>Valor Pago no Ato:</span>
            <span className="font-bold">{formatCurrency(sale.paidAmount)}</span>
          </div>

          {sale.remainingAmount > 0 && (
            <div className="flex justify-between font-bold text-black pt-0.5">
              <span>Saldo a Receber (Fiado):</span>
              <span>{formatCurrency(sale.remainingAmount)}</span>
            </div>
          )}

          <div className="flex justify-between text-[10px] text-neutral-600 pt-0.5">
            <span>Status:</span>
            <span className="font-bold uppercase">
              {isCancelled
                ? 'Cancelada'
                : sale.paymentStatus === 'paid'
                ? 'Pago Integralmente'
                : sale.paymentStatus === 'partial'
                ? 'Pagamento Parcial'
                : 'Pendente (Fiado)'}
            </span>
          </div>
        </div>

        {/* Observações */}
        {sale.notes && (
          <div className="mt-2 pt-1 border-t border-dotted border-neutral-300 text-[10px] italic text-neutral-700">
            Obs: {sale.notes}
          </div>
        )}

        {/* Rodapé do Recibo */}
        <div className="border-b border-dashed border-neutral-400 my-3" />
        <div className="text-center space-y-1 text-neutral-600">
          <p className="font-semibold text-black text-[11px]">Agradecemos a sua preferência!</p>
          <p className="text-[9px] text-neutral-500">
            Impresso em {new Date().toLocaleDateString('pt-BR')} às{' '}
            {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Modal de Pré-visualização do Recibo (Para visualização e impressão segura) */}
      {isPreviewReceiptOpen && (
        <div
          id="modal-receipt-preview-backdrop"
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in"
        >
          <div className="bg-neutral-100 rounded-2xl max-w-sm w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-neutral-300">
            {/* Header */}
            <div className="p-3 bg-neutral-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-xs uppercase tracking-wide">Recibo Formatado</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewReceiptOpen(false)}
                className="p-1 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {printNotice && (
              <div className="p-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-[11px] font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>{printNotice}</span>
              </div>
            )}

            {/* Scrollable Receipt Body */}
            <div className="p-4 overflow-y-auto flex-1 flex justify-center bg-neutral-200/80">
              <div className="w-full bg-white p-4 rounded-xl shadow border border-neutral-300 text-neutral-900 text-xs font-sans space-y-2">
                {/* Logo e Cabeçalho */}
                {business?.logoUrl && (
                  <div className="flex justify-center mb-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={business.logoUrl}
                      alt="Logo do Negócio"
                      className="max-h-16 max-w-[140px] object-contain"
                    />
                  </div>
                )}
                <div className="text-center">
                  <h4 className="font-bold text-sm uppercase tracking-wide text-black">
                    {business?.name || 'Comprovante de Venda'}
                  </h4>
                  <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">
                    Comprovante de Venda
                  </p>
                </div>

                <div className="border-b border-dashed border-neutral-400 my-1" />

                {/* Dados da Venda */}
                <div className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Data e Hora:</span>
                    <span className="font-semibold">{formatDateTimeBr(sale.createdAt || sale.saleDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Vendedor:</span>
                    <span className="font-semibold">{sale.sellerName || 'Vendedor'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-neutral-500 shrink-0">Cliente:</span>
                    <span className="font-semibold text-right break-words flex-1">{sale.customerName?.trim() || 'Cliente Avulso'}</span>
                  </div>
                  {(sale.customerReferencePoint || sale.customerAddress) && (
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-neutral-500 shrink-0">Endereço / Ref:</span>
                      <span className="text-right font-medium break-words flex-1">
                        {sale.customerReferencePoint || sale.customerAddress}
                      </span>
                    </div>
                  )}
                  {sale.nextVisitDate && (
                    <div className="flex justify-between items-center text-amber-800 font-bold bg-amber-50 p-1.5 rounded border border-amber-200 text-xs">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>Retorno Agendado:</span>
                      </span>
                      <span>{formatDateBr(sale.nextVisitDate)}</span>
                    </div>
                  )}
                  {isCancelled && (
                    <div className="text-center font-bold text-red-700 border border-red-500 py-1 rounded my-1 text-xs">
                      *** VENDA CANCELADA ***
                    </div>
                  )}
                </div>

                <div className="border-b border-dashed border-neutral-400 my-1" />

                {/* Itens */}
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between font-bold text-[10px] uppercase text-neutral-500 border-b border-neutral-200 pb-1">
                    <span className="flex-1">Qtd / Produto</span>
                    <span className="w-16 text-right">Unit.</span>
                    <span className="w-16 text-right">Total</span>
                  </div>
                  {(Array.isArray(sale.items) ? sale.items : []).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start py-0.5">
                      <div className="flex-1 pr-2">
                        <span className="font-bold">{item.quantity}{item.unit ? ` ${item.unit}` : 'x'}</span>{' '}
                        <span>{item.productName}</span>
                      </div>
                      <span className="w-16 text-right text-neutral-600 whitespace-nowrap">
                        {formatCurrency(item.unitPrice)}
                      </span>
                      <span className="w-16 text-right font-semibold whitespace-nowrap">
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-b border-dashed border-neutral-400 my-1" />

                {/* Totais */}
                <div className="space-y-0.5 text-[11px]">
                  {discountVal > 0 && (
                    <>
                      <div className="flex justify-between text-neutral-600">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(itemsSubtotal)}</span>
                      </div>
                      <div className="flex justify-between text-neutral-600">
                        <span>Desconto:</span>
                        <span>- {formatCurrency(discountVal)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-xs font-bold text-black pt-1 border-t border-neutral-300">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(sale.totalAmount)}</span>
                  </div>
                </div>

                <div className="border-b border-dashed border-neutral-400 my-1" />

                {/* Pagamento */}
                <div className="space-y-0.5 text-[11px]">
                  <div className="font-bold text-[10px] uppercase text-neutral-500">
                    Forma de Pagamento:
                  </div>
                  {sale.paymentBreakdown && sale.paymentBreakdown.length > 0 ? (
                    sale.paymentBreakdown.map((b, i) => (
                      <div key={i} className="flex justify-between pl-1">
                        <span>{formatPaymentMethodLabel(b.method)}:</span>
                        <span className="font-semibold">{formatCurrency(b.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between pl-1">
                      <span>{formatPaymentMethodLabel(sale.paymentMethod)}:</span>
                      <span className="font-semibold">{formatCurrency(sale.paidAmount > 0 ? sale.paidAmount : sale.totalAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-1 border-t border-dotted border-neutral-200">
                    <span>Valor Pago no Ato:</span>
                    <span className="font-bold">{formatCurrency(sale.paidAmount)}</span>
                  </div>
                  {sale.remainingAmount > 0 && (
                    <>
                      <div className="flex justify-between font-bold text-amber-900">
                        <span>Saldo a Receber (Fiado):</span>
                        <span>{formatCurrency(sale.remainingAmount)}</span>
                      </div>
                      {sale.nextVisitDate && (
                        <div className="flex justify-between text-[10.5px] font-semibold text-amber-800 pl-1">
                          <span>Cobrança / Retorno:</span>
                          <span>{formatDateBr(sale.nextVisitDate)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between text-[10px] text-neutral-500 pt-0.5">
                    <span>Status:</span>
                    <span className="font-bold uppercase">
                      {isCancelled
                        ? 'Cancelada'
                        : sale.paymentStatus === 'paid'
                        ? 'Pago Integralmente'
                        : sale.paymentStatus === 'partial'
                        ? 'Pagamento Parcial'
                        : 'Pendente (Fiado)'}
                    </span>
                  </div>
                </div>

                {sale.notes && (
                  <div className="mt-1 pt-1 border-t border-dotted border-neutral-200 text-[10px] italic text-neutral-600">
                    Obs: {sale.notes}
                  </div>
                )}

                <div className="border-b border-dashed border-neutral-400 my-2" />
                <div className="text-center text-[10px] text-neutral-500">
                  <p className="font-semibold text-neutral-800">Agradecemos a sua preferência!</p>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-3 bg-white border-t border-neutral-200 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="btn-preview-share-pdf"
                  onClick={handleSharePdf}
                  disabled={isSharingPdf}
                  className="py-2.5 px-2 bg-neutral-900 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition active:scale-95 disabled:opacity-60"
                >
                  {isSharingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  ) : (
                    <Share2 className="w-4 h-4 text-amber-400" />
                  )}
                  <span>Compartilhar PDF</span>
                </button>
                <button
                  type="button"
                  id="btn-preview-download-pdf"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="py-2.5 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-xl border border-neutral-300 text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
                  ) : (
                    <Download className="w-4 h-4 text-neutral-700" />
                  )}
                  <span>Baixar PDF</span>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  id="btn-preview-print-now"
                  onClick={handlePrintReceipt}
                  className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-neutral-200 transition active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Imprimir Recibo</span>
                </button>
                <button
                  type="button"
                  id="btn-preview-copy-text"
                  onClick={handleCopyReceiptText}
                  className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium rounded-xl border border-neutral-200 text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                  title="Copiar texto do recibo"
                >
                  {copiedReceipt ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsPreviewReceiptOpen(false)}
                className="w-full py-2 text-neutral-500 hover:text-neutral-800 font-medium rounded-xl text-xs"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

