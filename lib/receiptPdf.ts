import { jsPDF } from 'jspdf';
import { Sale, Business } from '@/types';
import { formatCurrency, formatDateTimeBr, formatDateBr } from '@/lib/format';

export interface ReceiptData {
  sale: Sale;
  business?: Business | null;
  nextVisitDate?: string;
}

function formatPaymentMethodLabel(method?: string): string {
  switch (method) {
    case 'dinheiro':
      return 'Dinheiro';
    case 'pix':
      return 'Pix';
    case 'cartao_debito':
      return 'Cartão de Débito';
    case 'cartao_credito':
      return 'Cartão de Crédito';
    case 'outro':
      return 'Outro';
    default:
      return method ? method.toUpperCase() : 'Não informado';
  }
}

/**
 * Loads an image from an URL or base64 string to be used safely with jsPDF
 */
async function getBase64Image(src: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (typeof window === 'undefined') return null;
  if (!src) return null;

  try {
    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          resolve({
            dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  } catch {
    return null;
  }
}

/**
 * Generates the standardized 80mm thermal receipt PDF using jsPDF
 */
export async function generateReceiptPdf({ sale, business, nextVisitDate }: ReceiptData): Promise<jsPDF> {
  const items = Array.isArray(sale.items) ? sale.items : [];
  const itemsSubtotal = items.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  const discountVal =
    sale.discountAmount !== undefined && sale.discountAmount > 0
      ? sale.discountAmount
      : sale.discountValue && sale.discountValue > 0
      ? sale.discountType === 'percent'
        ? (itemsSubtotal * sale.discountValue) / 100
        : sale.discountValue
      : 0;

  const isCancelled = sale.isCancelled || sale.paymentStatus === 'cancelled';
  const returnDate = sale.nextVisitDate || nextVisitDate;

  // Try to load logo if available
  let logoInfo: { dataUrl: string; width: number; height: number } | null = null;
  if (business?.logoUrl) {
    logoInfo = await getBase64Image(business.logoUrl);
  }

  // Calculate dynamic receipt height (80mm width standard)
  let estimatedHeight = 115;
  if (logoInfo) estimatedHeight += 18;
  if (sale.customerName && sale.customerName.length > 20) estimatedHeight += 6;
  if (sale.customerReferencePoint || sale.customerAddress) estimatedHeight += 10;
  if (returnDate) estimatedHeight += 9;
  if (isCancelled) estimatedHeight += 10;
  estimatedHeight += items.length * 9;
  if (discountVal > 0) estimatedHeight += 10;
  if (sale.paymentBreakdown && sale.paymentBreakdown.length > 0) {
    estimatedHeight += sale.paymentBreakdown.length * 5;
  } else {
    estimatedHeight += 6;
  }
  if (sale.remainingAmount > 0) estimatedHeight += (returnDate ? 12 : 7);
  if (sale.notes) estimatedHeight += 14;

  const pageWidth = 80;
  const pageHeight = Math.max(140, estimatedHeight);
  const margin = 5;
  const contentWidth = pageWidth - margin * 2;
  const centerX = pageWidth / 2;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageWidth, pageHeight],
  });

  let curY = 7;

  // 1. Logo
  if (logoInfo) {
    try {
      const maxLogoW = 32;
      const maxLogoH = 14;
      let renderW = maxLogoW;
      let renderH = (logoInfo.height / logoInfo.width) * maxLogoW;
      if (renderH > maxLogoH) {
        renderH = maxLogoH;
        renderW = (logoInfo.width / logoInfo.height) * maxLogoH;
      }
      const logoX = (pageWidth - renderW) / 2;
      doc.addImage(logoInfo.dataUrl, 'PNG', logoX, curY, renderW, renderH);
      curY += renderH + 3;
    } catch (e) {
      console.warn('Erro ao inserir logo no PDF:', e);
    }
  }

  // 2. Business Name (com split seguro para nunca sobrepor)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 20);
  const bizName = (business?.name || 'Comprovante de Venda').toUpperCase();
  const bizLines = doc.splitTextToSize(bizName, contentWidth);
  doc.text(bizLines, centerX, curY, { align: 'center' });
  curY += (Array.isArray(bizLines) ? bizLines.length : 1) * 4.2 + 1;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  doc.text('COMPROVANTE DE VENDA', centerX, curY, { align: 'center' });
  curY += 3.5;

  // Dashed divider helper
  const drawDashedDivider = (y: number) => {
    doc.setDrawColor(160, 160, 160);
    doc.setLineDashPattern([1.2, 1.2], 0);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setLineDashPattern([], 0); // reset
  };

  drawDashedDivider(curY);
  curY += 3.5;

  // 3. Sale Info
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);

  // Data e hora
  doc.setFont('helvetica', 'normal');
  doc.text('Data e Hora:', margin, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDateTimeBr(sale.createdAt || sale.saleDate), pageWidth - margin, curY, { align: 'right' });
  curY += 3.5;

  // Vendedor
  const sellerText = sale.sellerName || 'Vendedor';
  const sellerLines = doc.splitTextToSize(sellerText, 44);
  const sellerCount = Array.isArray(sellerLines) ? sellerLines.length : 1;
  doc.setFont('helvetica', 'normal');
  doc.text('Vendedor:', margin, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(sellerLines, pageWidth - margin, curY, { align: 'right' });
  curY += sellerCount * 3.3 + 0.5;

  // Cliente (com split seguro para não subir em cima de outra informação)
  const custName = sale.customerName?.trim() || 'Cliente Avulso';
  const custLines = doc.splitTextToSize(custName, 44);
  const custCount = Array.isArray(custLines) ? custLines.length : 1;
  doc.setFont('helvetica', 'normal');
  doc.text('Cliente:', margin, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(custLines, pageWidth - margin, curY, { align: 'right' });
  curY += custCount * 3.3 + 0.6;

  // Endereço / Ponto de Referência
  const address = sale.customerReferencePoint || sale.customerAddress;
  if (address) {
    const addrLines = doc.splitTextToSize(address, 44);
    const addrCount = Array.isArray(addrLines) ? addrLines.length : 1;
    doc.setFont('helvetica', 'normal');
    doc.text('Endereço/Ref:', margin, curY);
    doc.setFont('helvetica', 'normal');
    doc.text(addrLines, pageWidth - margin, curY, { align: 'right' });
    curY += addrCount * 3.1 + 0.6;
  }

  // Retorno Agendado / Próxima Visita
  if (returnDate) {
    doc.setFont('helvetica', 'normal');
    doc.text('Retorno Agendado:', margin, curY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text(formatDateBr(returnDate), pageWidth - margin, curY, { align: 'right' });
    doc.setTextColor(40, 40, 40);
    curY += 3.6;
  }

  // Banner cancelada
  if (isCancelled) {
    curY += 1;
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(239, 68, 68);
    doc.rect(margin, curY - 2.5, contentWidth, 5.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28);
    doc.text('*** VENDA CANCELADA ***', centerX, curY + 1.2, { align: 'center' });
    curY += 5.5;
  }

  drawDashedDivider(curY);
  curY += 3.5;

  // 4. Itens Header
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(90, 90, 90);
  doc.text('QTD / PRODUTO', margin, curY);
  doc.text('UNIT.', pageWidth - margin - 19, curY, { align: 'right' });
  doc.text('TOTAL', pageWidth - margin, curY, { align: 'right' });
  curY += 2;

  doc.setDrawColor(220, 220, 220);
  doc.line(margin, curY, pageWidth - margin, curY);
  curY += 3;

  // 5. Itens List
  doc.setFontSize(7.5);
  doc.setTextColor(20, 20, 20);

  items.forEach((item) => {
    const qtyText = `${item.quantity}${item.unit ? ' ' + item.unit : 'x'}`;
    const itemTitle = `${qtyText} ${item.productName}`;
    const unitPriceStr = formatCurrency(item.unitPrice);
    const subtotalStr = formatCurrency(item.subtotal);

    const nameLines = doc.splitTextToSize(itemTitle, 38);

    doc.setFont('helvetica', 'normal');
    doc.text(nameLines, margin, curY);
    doc.setFont('helvetica', 'normal');
    doc.text(unitPriceStr, pageWidth - margin - 19, curY, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(subtotalStr, pageWidth - margin, curY, { align: 'right' });

    const linesCount = Array.isArray(nameLines) ? nameLines.length : 1;
    curY += linesCount * 3 + 1.5;
  });

  drawDashedDivider(curY);
  curY += 3.5;

  // 6. Totais e Descontos
  doc.setFontSize(7.5);
  if (discountVal > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text('Subtotal:', margin, curY);
    doc.text(formatCurrency(itemsSubtotal), pageWidth - margin, curY, { align: 'right' });
    curY += 3.2;

    doc.text(`Desconto ${sale.discountType === 'percent' ? `(${sale.discountValue}%)` : ''}:`, margin, curY);
    doc.text(`- ${formatCurrency(discountVal)}`, pageWidth - margin, curY, { align: 'right' });
    curY += 3.5;
  }

  // TOTAL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL:', margin, curY);
  doc.text(formatCurrency(sale.totalAmount), pageWidth - margin, curY, { align: 'right' });
  curY += 4.5;

  drawDashedDivider(curY);
  curY += 3.5;

  // 7. Pagamento
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(90, 90, 90);
  doc.text('FORMA DE PAGAMENTO:', margin, curY);
  curY += 3.2;

  doc.setFontSize(7.5);
  doc.setTextColor(30, 30, 30);
  if (sale.paymentBreakdown && sale.paymentBreakdown.length > 0) {
    sale.paymentBreakdown.forEach((b) => {
      doc.setFont('helvetica', 'normal');
      doc.text(formatPaymentMethodLabel(b.method) + ':', margin + 2, curY);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(b.amount), pageWidth - margin, curY, { align: 'right' });
      curY += 3;
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text(formatPaymentMethodLabel(sale.paymentMethod) + ':', margin + 2, curY);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(sale.paidAmount > 0 ? sale.paidAmount : sale.totalAmount), pageWidth - margin, curY, { align: 'right' });
    curY += 3;
  }

  // Valor pago no ato
  curY += 0.5;
  doc.setFont('helvetica', 'normal');
  doc.text('Valor Pago no Ato:', margin, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(sale.paidAmount), pageWidth - margin, curY, { align: 'right' });
  curY += 3.2;

  // Saldo a receber (Fiado)
  if (sale.remainingAmount > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // tom âmbar escuro
    doc.text('Saldo a Receber (Fiado):', margin, curY);
    doc.text(formatCurrency(sale.remainingAmount), pageWidth - margin, curY, { align: 'right' });
    curY += 3.2;

    if (returnDate) {
      doc.setFont('helvetica', 'normal');
      doc.text('Cobrança / Retorno:', margin + 2, curY);
      doc.setFont('helvetica', 'bold');
      doc.text(formatDateBr(returnDate), pageWidth - margin, curY, { align: 'right' });
      curY += 3.2;
    }
    doc.setTextColor(30, 30, 30);
  }

  // Status
  const statusLabel = isCancelled
    ? 'CANCELADA'
    : sale.paymentStatus === 'paid'
    ? 'PAGO INTEGRALMENTE'
    : sale.paymentStatus === 'partial'
    ? 'PAGAMENTO PARCIAL'
    : 'PENDENTE (FIADO)';

  doc.setFont('helvetica', 'normal');
  doc.text('Status:', margin, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(statusLabel, pageWidth - margin, curY, { align: 'right' });
  curY += 3.5;

  // Observações
  if (sale.notes) {
    curY += 1;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    const notesLines = doc.splitTextToSize(`Obs: ${sale.notes}`, contentWidth);
    doc.text(notesLines, margin, curY);
    curY += (Array.isArray(notesLines) ? notesLines.length : 1) * 3 + 1;
  }

  // 8. Rodapé
  drawDashedDivider(curY);
  curY += 3.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  doc.text('Agradecemos a sua preferência!', centerX, curY, { align: 'center' });
  curY += 3.2;

  const now = new Date();
  const printDateStr = now.toLocaleDateString('pt-BR');
  const printTimeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text(`Impresso em ${printDateStr} às ${printTimeStr}`, centerX, curY, { align: 'center' });

  return doc;
}

/**
 * Returns a Blob of the standardized PDF receipt
 */
export async function generateReceiptPdfBlob(data: ReceiptData): Promise<Blob> {
  const doc = await generateReceiptPdf(data);
  return doc.output('blob');
}

/**
 * Creates a clean safe filename for the PDF
 */
export function getReceiptPdfFilename(sale: Sale): string {
  const cleanName = (sale.customerName || 'venda')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase();
  const dateStr = sale.saleDate || 'data';
  return `recibo_${cleanName}_${dateStr}.pdf`;
}

/**
 * Triggers the browser download of the PDF receipt
 */
export async function downloadReceiptPdf(data: ReceiptData): Promise<void> {
  const doc = await generateReceiptPdf(data);
  const filename = getReceiptPdfFilename(data.sale);
  doc.save(filename);
}

/**
 * Shares the PDF receipt using Web Share API (File sharing) on mobile/desktop.
 * If Web Share API with files is not supported, automatically downloads the PDF.
 */
export async function shareReceiptPdf(
  data: ReceiptData
): Promise<{ success: boolean; shared: boolean; method: 'native' | 'download'; message: string }> {
  try {
    const blob = await generateReceiptPdfBlob(data);
    const filename = getReceiptPdfFilename(data.sale);
    const file = new File([blob], filename, { type: 'application/pdf' });

    // Check if navigator.share supports file sharing
    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        title: `Recibo - ${data.business?.name || 'Venda'}`,
        text: `Comprovante de venda para ${data.sale.customerName?.trim() || 'Cliente'} no valor de ${formatCurrency(data.sale.totalAmount)}`,
        files: [file],
      });
      return {
        success: true,
        shared: true,
        method: 'native',
        message: 'Comprovante em PDF compartilhado com sucesso!',
      };
    }

    // Fallback: Download file directly
    const doc = await generateReceiptPdf(data);
    doc.save(filename);
    return {
      success: true,
      shared: false,
      method: 'download',
      message: 'O recibo em PDF foi baixado para o seu aparelho (compartilhamento nativo de arquivos não suportado neste navegador).',
    };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      // User cancelled the native share sheet
      return {
        success: false,
        shared: false,
        method: 'native',
        message: 'Compartilhamento cancelado.',
      };
    }
    console.error('Erro ao compartilhar recibo PDF:', error);
    // Try fallback download on error
    try {
      const doc = await generateReceiptPdf(data);
      const filename = getReceiptPdfFilename(data.sale);
      doc.save(filename);
      return {
        success: true,
        shared: false,
        method: 'download',
        message: 'O recibo em PDF foi baixado para o seu aparelho.',
      };
    } catch {
      return {
        success: false,
        shared: false,
        method: 'download',
        message: 'Não foi possível gerar ou compartilhar o recibo em PDF.',
      };
    }
  }
}
