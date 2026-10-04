// Approximate USD/VND rate used for display and target-price input.
// Keep prices stored by the backend in their original marketplace currency.
export const USD_TO_VND_RATE = 25_000;

export const convertToVnd = (amount: number, currency: string): number => {
  return currency.toUpperCase() === 'USD' ? amount * USD_TO_VND_RATE : amount;
};

export const convertFromVnd = (amount: number, currency: string): number => {
  return currency.toUpperCase() === 'USD' ? amount / USD_TO_VND_RATE : amount;
};

export const formatVnd = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(convertToVnd(amount, currency));
};
