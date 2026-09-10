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
 * Reads a typed amount: "1,234.56", "1234.56", "-62.30", with or without a
 * currency symbol or spaces. Returns null when the text is not an amount.
 */
export function parseAmount(text: string): Cents | null {
  const cleaned = text.replace(/[\s  €]/g, '');
  if (!cleaned || !/^[+-]?[\d.,]+$/.test(cleaned)) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  /* A dot is the decimal separator, a comma is grouping — unless both appear, in
     which case the rightmost one is the decimal separator. */
  let decimalAt = -1;
  if (lastComma > -1 && lastDot > -1) decimalAt = Math.max(lastComma, lastDot);
  else if (lastDot > -1) decimalAt = lastDot;
  else if (lastComma > -1 && !/^[+-]?\d{1,3}(,\d{3})+$/.test(cleaned)) decimalAt = lastComma;

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
    found = new Intl.NumberFormat('en-GB', {
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

/** No space between symbol and figure: in a monospaced face it takes a full
 *  character width and splits the number in two. */
export function formatEUR(value: Cents, options: FormatOptions = {}): string {
  return formatter(options.cents !== false).format(toEuros(value)).replace(/ /g, '');
}

export function formatSigned(value: Cents, options: FormatOptions = {}): string {
  return (value > 0 ? '+' : '') + formatEUR(value, options);
}
