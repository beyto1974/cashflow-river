import { addDays, lastDayOfMonth, weekday, type PlainDate } from './dates';

/**
 * When a line is actually paid, as opposed to the date it is booked against. A
 * standing order on the 1st leaves the account on the next working day; a
 * salary on the 27th usually arrives before the weekend rather than after it.
 */
export type DueRule = 'exact' | 'next-working-day' | 'previous-working-day' | 'last-working-day';

export interface DueRuleSpec {
  /** How the household would pick it out of a list. */
  label: string;
}

export const DUE_RULES: Record<DueRule, DueRuleSpec> = {
  exact: { label: 'on that date' },
  'next-working-day': { label: 'the next working day' },
  'previous-working-day': { label: 'the working day before' },
  'last-working-day': { label: 'the last working day of the month' }
};

/** True when nothing moves that day: a weekend, or a day the scenario calls closed. */
export type IsHoliday = (date: PlainDate) => boolean;

function isClosed(date: PlainDate, isHoliday: IsHoliday): boolean {
  const day = weekday(date);
  return day === 0 || day === 6 || isHoliday(date);
}

/* A fortnight of closed days is already absurd; past that, keep the date rather
   than search forever. */
const GIVE_UP_AFTER = 14;

function walk(from: PlainDate, step: number, isHoliday: IsHoliday): PlainDate {
  let date = from;
  for (let tries = 0; tries < GIVE_UP_AFTER; tries += 1) {
    if (!isClosed(date, isHoliday)) return date;
    date = addDays(date, step);
  }
  return from;
}

/** The day the money actually moves, given the line's rule. */
export function adjustDueDate(date: PlainDate, rule: DueRule | undefined, isHoliday: IsHoliday): PlainDate {
  switch (rule) {
    case 'next-working-day':
      return walk(date, 1, isHoliday);
    case 'previous-working-day':
      return walk(date, -1, isHoliday);
    case 'last-working-day': {
      const year = Number(date.slice(0, 4));
      const month = Number(date.slice(5, 7));
      const last = `${date.slice(0, 8)}${String(lastDayOfMonth(year, month)).padStart(2, '0')}` as PlainDate;
      return walk(last, -1, isHoliday);
    }
    default:
      return date;
  }
}
