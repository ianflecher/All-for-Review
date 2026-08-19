/** Change this one line to switch currency; nothing else hard-codes a symbol. */
export const CURRENCY = '₱';

/**
 * Formats an amount for display.
 *
 * Done by hand rather than with toLocaleString, because Intl's number
 * formatting is not guaranteed on every Hermes build. Always two decimals, so
 * a column of amounts lines up, and the sign goes before the symbol.
 */
export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return `${CURRENCY}0.00`;

  const [whole, cents] = Math.abs(amount).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${amount < 0 ? '-' : ''}${CURRENCY}${grouped}.${cents}`;
}

/**
 * Reads a user-typed amount. Returns null when it is not a usable positive
 * number, so callers can show an error instead of storing NaN.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/,/g, '').trim();
  if (cleaned.length === 0) return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;

  // Rounded to centavos so repeated arithmetic cannot drift a running balance.
  return Math.round(value * 100) / 100;
}
