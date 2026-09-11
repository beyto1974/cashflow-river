import { addDays, addMonths, compareDates, daysBetween, type PlainDate } from './dates';
import type { Cents } from './money';
import { euros, toEuros } from './money';
import type { Cadence, DateWindow, RecurringLine } from './types';

/**
 * One entry per cadence. A new cadence is a new entry here — the projection,
 * the ledger and the month averages all read it rather than switching on the
 * cadence themselves.
 */
export interface CadenceSpec {
  readonly key: Cadence;
  /** How the household says it. */
  readonly label: string;
  /** Occurrences per month, on average. */
  readonly perMonth: number;
  /** The nth occurrence counted from the anchor. */
  nth(anchor: PlainDate, n: number): PlainDate;
  /** Roughly how many occurrences fit in a number of days — used to skip ahead. */
  stepsInDays(days: number): number;
}

function byDays(key: Cadence, label: string, days: number): CadenceSpec {
  return {
    key,
    label,
    perMonth: 365.25 / 12 / days,
    nth: (anchor, n) => addDays(anchor, n * days),
    stepsInDays: (span) => Math.floor(span / days)
  };
}

function byMonths(key: Cadence, label: string, months: number): CadenceSpec {
  return {
    key,
    label,
    perMonth: 1 / months,
    nth: (anchor, n) => addMonths(anchor, n * months),
    stepsInDays: (span) => Math.floor(span / (30.44 * months))
  };
}

export const CADENCES: Record<Cadence, CadenceSpec> = {
  weekly: byDays('weekly', 'every week', 7),
  biweekly: byDays('biweekly', 'every two weeks', 14),
  monthly: byMonths('monthly', 'every month', 1),
  quarterly: byMonths('quarterly', 'every quarter', 3),
  yearly: byMonths('yearly', 'every year', 12)
};

export function cadenceKeys(): Cadence[] {
  return Object.keys(CADENCES) as Cadence[];
}

/** What a line costs or brings in an average month, for the ledger subtotals. */
export function perMonth(amount: Cents, cadence: Cadence): Cents {
  return euros(toEuros(amount) * CADENCES[cadence].perMonth);
}

const MAX_OCCURRENCES = 4_000;

/**
 * Every date the line falls due inside the window, counted from the anchor so a
 * month-end anchor keeps its day of month instead of drifting after February.
 */
export function occurrences(line: RecurringLine, window: DateWindow): PlainDate[] {
  const spec = CADENCES[line.cadence];
  const from = laterOf(window.from, line.from);
  const to = earlierOf(window.to, line.to);
  if (compareDates(from, to) > 0) return [];

  if (line.times !== undefined && line.times <= 0) return [];

  let n = 0;
  const behind = daysBetween(line.anchor, from);
  if (behind > 0) n = Math.max(0, spec.stepsInDays(behind) - 1);

  const dates: PlainDate[] = [];
  for (let guard = 0; guard < MAX_OCCURRENCES; guard += 1, n += 1) {
    if (line.times !== undefined && n >= line.times) break;
    const date = spec.nth(line.anchor, n);
    if (compareDates(date, to) > 0) break;
    if (compareDates(date, from) >= 0) dates.push(date);
  }
  return dates;
}

function laterOf(a: PlainDate, b: PlainDate | undefined): PlainDate {
  return b && compareDates(b, a) > 0 ? b : a;
}
function earlierOf(a: PlainDate, b: PlainDate | undefined): PlainDate {
  return b && compareDates(b, a) < 0 ? b : a;
}

/**
 * The last day a line can fall due, when it has an end at all: a count of
 * occurrences, an end date, or the earlier of the two. Undefined for a line
 * that simply keeps going.
 */
export function lastOccurrence(line: RecurringLine): PlainDate | undefined {
  /* A count of nothing means the line never falls due at all, so its own anchor
     is the last word on it. */
  if (line.times !== undefined && line.times <= 0) return line.anchor;
  const counted =
    line.times !== undefined ? CADENCES[line.cadence].nth(line.anchor, line.times - 1) : undefined;
  if (counted && line.to) return compareDates(counted, line.to) < 0 ? counted : line.to;
  return counted ?? line.to;
}
