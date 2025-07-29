/**
 * ISO 4217 Currency Codes
 * Common currencies supported by the application
 */
export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD',
  'MXN', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR',
  'DKK', 'PLN', 'THB', 'IDR', 'HUF', 'CZK', 'ILS', 'CLP', 'PHP', 'AED',
  'COP', 'SAR', 'MYR', 'RON', 'ARS', 'BGN', 'HRK', 'LTL', 'SKK', 'ISK',
  'EEK', 'JOD', 'KWD', 'OMR', 'QAR', 'BHD', 'LVL', 'GHS', 'KES', 'MAD',
  'NGN', 'PEN', 'UAH', 'VND', 'BOB', 'CRC', 'DOP', 'GTQ', 'HNL', 'NIO',
  'PAB', 'PYG', 'SVC', 'UYU', 'VEF', 'IRR', 'KZT', 'LBP', 'LKR', 'NPR',
  'PKR', 'TWD', 'UZS', 'BDT', 'FJD', 'GEL', 'MDL', 'MKD', 'MMK', 'MNT',
  'XAF', 'XCD', 'XOF', 'XPF', 'ALL', 'AMD', 'AOA', 'AWG', 'AZN', 'BAM',
  'BBD', 'BIF', 'BMD', 'BND', 'BSD', 'BTN', 'BWP', 'BYR', 'BZD', 'CDF'
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number];

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

/**
 * Currency display information
 */
export const CURRENCY_INFO: Record<string, { symbol: string; name: string; decimals: number }> = {
  USD: { symbol: '$', name: 'US Dollar', decimals: 2 },
  EUR: { symbol: '€', name: 'Euro', decimals: 2 },
  GBP: { symbol: '£', name: 'British Pound', decimals: 2 },
  JPY: { symbol: '¥', name: 'Japanese Yen', decimals: 0 },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', decimals: 2 },
  AUD: { symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
  CHF: { symbol: 'Fr', name: 'Swiss Franc', decimals: 2 },
  CNY: { symbol: '¥', name: 'Chinese Yuan', decimals: 2 },
  SEK: { symbol: 'kr', name: 'Swedish Krona', decimals: 2 },
  NZD: { symbol: 'NZ$', name: 'New Zealand Dollar', decimals: 2 },
  MXN: { symbol: '$', name: 'Mexican Peso', decimals: 2 },
  SGD: { symbol: 'S$', name: 'Singapore Dollar', decimals: 2 },
  HKD: { symbol: 'HK$', name: 'Hong Kong Dollar', decimals: 2 },
  NOK: { symbol: 'kr', name: 'Norwegian Krone', decimals: 2 },
  KRW: { symbol: '₩', name: 'South Korean Won', decimals: 0 },
  TRY: { symbol: '₺', name: 'Turkish Lira', decimals: 2 },
  RUB: { symbol: '₽', name: 'Russian Ruble', decimals: 2 },
  INR: { symbol: '₹', name: 'Indian Rupee', decimals: 2 },
  BRL: { symbol: 'R$', name: 'Brazilian Real', decimals: 2 },
  ZAR: { symbol: 'R', name: 'South African Rand', decimals: 2 },
};

/**
 * Get currency symbol, fallback to code if not found
 */
export function getCurrencySymbol(code: string): string {
  return CURRENCY_INFO[code]?.symbol || code;
}

/**
 * Format amount with currency
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  const info = CURRENCY_INFO[currencyCode];
  if (!info) {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
  
  const formatted = amount.toFixed(info.decimals);
  return `${info.symbol}${formatted}`;
}