import { Sale, Customer } from '@/types';
import { formatDateBr } from '@/lib/format';

/**
 * Clean string for CSV escaping
 */
function escapeCsv(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates and triggers download of CSV files with BOM for Excel compatibility (UTF-8)
 */
function triggerCsvDownload(csvContent: string, fileName: string) {
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSalesCsv(
  sales: Sale[],
  startDate?: string,
  endDate?: string
) {
  // Filter sales if dates are provided
  let filtered = sales;
  if (startDate) {
    filtered = filtered.filter((s) => s.saleDate >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter((s) => s.saleDate <= endDate);
  }

  // Sort descending by date
  filtered = [...filtered].sort((a, b) => b.saleDate.localeCompare(a.saleDate));

  const headers = [
    'ID Venda',
    'Data da Venda',
    'Cliente',
    'Telefone',
    'Endereço / Referência',
    'Vendedor',
    'Itens / Produtos',
    'Valor Total (R$)',
    'Valor Pago (R$)',
    'Saldo Devedor / Fiado (R$)',
    'Forma de Pagamento',
    'Status do Pagamento',
    'Cancelada',
    'Data Cancelamento',
    'Cancelado Por',
    'Observações'
  ];

  const rows = filtered.map((s) => {
    const isCancelled = s.isCancelled || s.paymentStatus === 'cancelled';
    const itemsSummary = (s.items || [])
      .map((i) => `${i.quantity}x ${i.productName} (R$ ${Number(i.unitPrice || 0).toFixed(2).replace('.', ',')})`)
      .join(' | ');

    const statusLabel = isCancelled
      ? 'Cancelada'
      : s.paymentStatus === 'paid'
      ? 'Pago à Vista'
      : s.paymentStatus === 'partial'
      ? 'Parcial / Fiado'
      : 'Pendente / Fiado';

    const addressFull = [s.customerAddress, s.customerReferencePoint].filter(Boolean).join(' - ');

    return [
      escapeCsv(s.id),
      escapeCsv(formatDateBr(s.saleDate)),
      escapeCsv(s.customerName),
      escapeCsv(s.customerPhone || ''),
      escapeCsv(addressFull || ''),
      escapeCsv(s.sellerName || ''),
      escapeCsv(itemsSummary),
      escapeCsv(Number(s.totalAmount || 0).toFixed(2).replace('.', ',')),
      escapeCsv(Number(s.paidAmount || 0).toFixed(2).replace('.', ',')),
      escapeCsv(Number(s.remainingAmount || 0).toFixed(2).replace('.', ',')),
      escapeCsv(s.paymentMethod || 'dinheiro'),
      escapeCsv(statusLabel),
      escapeCsv(isCancelled ? 'SIM' : 'NÃO'),
      escapeCsv(s.cancelledAt ? formatDateBr(s.cancelledAt.substring(0, 10)) : ''),
      escapeCsv(s.cancelledBy || ''),
      escapeCsv(s.notes || '')
    ].join(';');
  });

  const csvContent = [headers.join(';'), ...rows].join('\r\n');
  const todayStr = new Date().toISOString().split('T')[0];
  triggerCsvDownload(csvContent, `vendas_pdv_queijo_${todayStr}.csv`);
}

export function exportDebtorsCsv(customers: Customer[], sales: Sale[]) {
  // Filter customers with open debt
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
    .sort((a, b) => (b.totalDebt || 0) - (a.totalDebt || 0));

  const headers = [
    'ID Cliente',
    'Nome do Cliente',
    'Telefone',
    'Endereço',
    'Ponto de Referência',
    'Saldo Devedor em Aberto (R$)',
    'Total Histórico Comprado (R$)',
    'Última Compra'
  ];

  const rows = debtors.map((c) => {
    return [
      escapeCsv(c.id),
      escapeCsv(c.name),
      escapeCsv(c.phone || ''),
      escapeCsv(c.address || ''),
      escapeCsv(c.referencePoint || ''),
      escapeCsv(Number(c.totalDebt || 0).toFixed(2).replace('.', ',')),
      escapeCsv(Number(c.totalPurchased || 0).toFixed(2).replace('.', ',')),
      escapeCsv(c.lastPurchaseDate ? formatDateBr(c.lastPurchaseDate) : 'Nunca')
    ].join(';');
  });

  const csvContent = [headers.join(';'), ...rows].join('\r\n');
  const todayStr = new Date().toISOString().split('T')[0];
  triggerCsvDownload(csvContent, `clientes_a_receber_${todayStr}.csv`);
}
