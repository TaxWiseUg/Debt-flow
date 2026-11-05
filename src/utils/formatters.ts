import { CurrencyCode, CurrencyConfig } from '../types';

export const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  UGX: {
    code: 'UGX',
    symbol: 'UGX',
    name: 'Ugandan Shilling',
    decimals: 0,
    position: 'prefix',
  },
};

export function formatCurrency(amount: number, currency: CurrencyCode = 'UGX'): string {
  const config = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.UGX;
  const absAmount = Math.abs(amount);

  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(absAmount);

  const sign = amount < 0 ? '-' : '';

  if (config.position === 'prefix') {
    return `${sign}${config.symbol} ${formattedNumber}`;
  }
  return `${sign}${formattedNumber} ${config.symbol}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDueDateDefault(daysAhead = 14): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateDaysOverdue(dueDateString: string): number {
  if (!dueDateString) return 0;
  const due = new Date(dueDateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/** Collision-safe: timestamp-based suffix avoids duplicate numbers on concurrent creates. */
function timestampSuffix(): string {
  return Date.now().toString(36).toUpperCase().slice(-5);
}

export function generateInvoiceNumber(existingCount?: number): string {
  const serial = existingCount !== undefined
    ? `${String(existingCount + 1).padStart(4, '0')}-${timestampSuffix()}`
    : timestampSuffix();
  return `INV-${new Date().getFullYear()}-${serial}`;
}

export function generateReceiptNumber(existingCount?: number): string {
  const serial = existingCount !== undefined
    ? `${String(existingCount + 1).padStart(4, '0')}-${timestampSuffix()}`
    : timestampSuffix();
  return `REC-${new Date().getFullYear()}-${serial}`;
}

export function generateOrderNumber(existingCount?: number): string {
  const serial = existingCount !== undefined
    ? `${String(existingCount + 1).padStart(4, '0')}-${timestampSuffix()}`
    : timestampSuffix();
  return `ORD-${new Date().getFullYear()}-${serial}`;
}
