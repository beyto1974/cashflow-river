/**
 * A date with no time and no zone: the calendar day money moves on. Held as an
 * ISO string so it can be compared, keyed and stored as-is; all arithmetic goes
 * through UTC so a summer-time change can never shift a payment.
 */
export type PlainDate = string & { readonly __plainDate: unique symbol };

const SHAPE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

export function isPlainDate(value: string): boolean {
  if (!SHAPE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  return month >= 1 && month <= 12 && day >= 1 && day <= lastDayOfMonth(year, month);
}

export function plainDate(value: string): PlainDate {
  if (!isPlainDate(value)) throw new RangeError(`Not a calendar date: ${value}`);
  return value as PlainDate;
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toUTC(date: PlainDate): Date {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day));
}

function fromUTC(date: Date): PlainDate {
  return date.toISOString().slice(0, 10) as PlainDate;
}

export function addDays(date: PlainDate, days: number): PlainDate {
  return fromUTC(new Date(toUTC(date).getTime() + days * MS_PER_DAY));
}

/** Keeps the day of month, clamped to the length of the target month. */
export function addMonths(date: PlainDate, months: number): PlainDate {
  const source = toUTC(date);
  const target = source.getUTCFullYear() * 12 + source.getUTCMonth() + months;
  const year = Math.floor(target / 12);
  const month = target - year * 12;
  const day = Math.min(source.getUTCDate(), lastDayOfMonth(year, month + 1));
  return fromUTC(new Date(Date.UTC(year, month, day)));
}

export function daysBetween(from: PlainDate, to: PlainDate): number {
  return Math.round((toUTC(to).getTime() - toUTC(from).getTime()) / MS_PER_DAY);
}

export function compareDates(a: PlainDate, b: PlainDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export type MonthKey = string & { readonly __monthKey: unique symbol };

export function monthKey(date: PlainDate): MonthKey {
  return date.slice(0, 7) as MonthKey;
}

export function firstOfMonth(month: MonthKey): PlainDate {
  return `${month}-01` as PlainDate;
}

export function dayOfMonth(date: PlainDate): number {
  return Number(date.slice(8));
}

/** 0 is Sunday, 6 is Saturday. */
export function weekday(date: PlainDate): number {
  return toUTC(date).getUTCDay();
}

export function today(): PlainDate {
  return fromUTC(new Date());
}
