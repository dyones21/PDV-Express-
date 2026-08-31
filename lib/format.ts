export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00';
  }
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats monetary input in Brazilian Real (BRL) as the user types,
 * inserting digits from right to left (e.g., '12345' -> 'R$ 123,45').
 */
export function formatCurrencyInput(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  let digits = '';
  if (typeof value === 'number') {
    if (isNaN(value) || value <= 0) return '';
    const cents = Math.round(value * 100);
    digits = String(cents);
  } else {
    digits = String(value).replace(/\D/g, '');
  }

  // Remove leading zeros
  digits = digits.replace(/^0+/, '');
  if (!digits) return '';

  const cents = parseInt(digits, 10);
  const reais = cents / 100;
  return reais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parses a currency string or number to a pure float in Reais (e.g. 'R$ 123,45' -> 123.45).
 */
export function parseCurrencyToNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return 0;
  return (parseInt(digits, 10) || 0) / 100;
}

/**
 * Formats phone numbers automatically: (XX) XXXXX-XXXX for cellphones (11 digits)
 * or (XX) XXXX-XXXX for landlines (10 digits).
 */
export function formatPhone(value: string | undefined | null): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';

  if (digits.length <= 2) {
    return `(${digits}`;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Formats CPF numbers: XXX.XXX.XXX-XX (up to 11 digits).
 */
export function formatCpf(value: string | undefined | null): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';

  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function formatDateBr(dateString: string | undefined | null): string {
  if (!dateString) return '';
  try {
    // If YYYY-MM-DD
    if (dateString.length === 10 && dateString.includes('-')) {
      const [y, m, d] = dateString.split('-');
      return `${d}/${m}/${y}`;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
}

export function formatDateTimeBr(isoString: string | undefined | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayFormattedDisplay(): string {
  const d = new Date();
  const weekdays = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  return `${weekdays[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}`;
}
