/**
 * Money is integer cents, everywhere. Euros only appear at the edges: when a
 * human types an amount and when one is rendered.
 */
export type Cents = number;

const CENT_FACTOR = 100;

/** Rounds half away from zero, so half a cent never disappears. */
function roundCents(value: number): Cents {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

export function euros(amount: number): Cents {
  return roundCents(amount * CENT_FACTOR);
}

export function toEuros(cents: Cents): number {
  return cents / CENT_FACTOR;
}

export function addCents(...values: Cents[]): Cents {
  return values.reduce((sum, value) => sum + value, 0);
}

/**
 * Reads an amount the way it is typed on a Belgian keyboard — "1.234,56" — as
 * well as the plain "1234.56", with or without a currency symbol.
 * Returns null when the text is not an amount at all.
 */
export function parseAmount(text: string): Cents | null {
  const cleaned = text.replace(/[\s  €]/g, '');
  if (!cleaned || !/^[+-]?[\d.,]+$/.test(cleaned)) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  /* Belgian convention decides: a comma is always a decimal separator, a dot is
     grouping when it is followed by exactly three digits (1.234), and a decimal
     separator otherwise (1234.56 as typed on an English keyboard). When both
     appear, the rightmost one is the decimal separator. */
  let decimalAt = -1;
  if (lastComma > -1 && lastDot > -1) decimalAt = Math.max(lastComma, lastDot);
  else if (lastComma > -1) decimalAt = lastComma;
  else if (lastDot > -1 && !/^[+-]?\d{1,3}(\.\d{3})+$/.test(cleaned)) decimalAt = lastDot;

  const normalised =
    decimalAt === -1
      ? cleaned.replace(/[.,]/g, '')
      : cleaned.slice(0, decimalAt).replace(/[.,]/g, '') + '.' + cleaned.slice(decimalAt + 1);

  const value = Number(normalised);
  return Number.isFinite(value) ? euros(value) : null;
}

const FORMATTERS = new Map<string, Intl.NumberFormat>();

function formatter(cents: boolean): Intl.NumberFormat {
  const key = cents ? 'cents' : 'whole';
  let found = FORMATTERS.get(key);
  if (!found) {
    found = new Intl.NumberFormat('nl-BE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: cents ? 2 : 0,
      maximumFractionDigits: cents ? 2 : 0
    });
    FORMATTERS.set(key, found);
  }
  return found;
}

export interface FormatOptions {
  /** Include the cents. Defaults to true. */
  cents?: boolean;
}

/**
 * Belgian format, minus the space after the symbol: in a monospaced face that
 * space takes a full character width and splits the figure in two.
 */
export function formatEUR(value: Cents, options: FormatOptions = {}): string {
  return formatter(options.cents !== false).format(toEuros(value)).replace(/ /g, '');
}

export function formatSigned(value: Cents, options: FormatOptions = {}): string {
  return (value > 0 ? '+' : '') + formatEUR(value, options);
}
