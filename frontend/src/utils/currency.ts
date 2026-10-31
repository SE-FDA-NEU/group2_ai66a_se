/**
 * Utility functions for VND currency formatting and input parsing.
 * The system stores and operates natively in VND.
 */

export const USD_TO_VND_RATE = 26_000;

export const parseVndInput = (value: string | number | null | undefined): number | null => {
  if (value == null) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }
  const str = String(value).trim();
  if (!str) return null;
  // Clean all thousand separators, spaces, and currency symbols (160.000, 160,000, 160.000₫)
  const cleaned = str.replace(/[.,\sđ₫]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : null;
};

export const convertToVnd = (amount: number, currency: string = 'VND'): number => {
  return currency && currency.toUpperCase() === 'USD' ? amount * USD_TO_VND_RATE : Math.round(amount);
};

export const convertFromVnd = (amount: number, currency: string = 'VND'): number => {
  if (currency && currency.toUpperCase() === 'USD') {
    return Math.round((amount / USD_TO_VND_RATE) * 100) / 100;
  }
  return Math.round(amount);
};

export const formatVnd = (amount: number | null | undefined, currency: string = 'VND'): string => {
  if (amount == null || !Number.isFinite(Number(amount))) {
    return '0 ₫';
  }
  const val = convertToVnd(Number(amount), currency);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
};
