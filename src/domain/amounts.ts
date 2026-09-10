import { compareDates, type PlainDate } from './dates';
import { scale, type Cents } from './money';
import { isRecurring, type Indexation, type Line } from './types';

/**
 * Which way the guesses are read. The estimated lines carry a range, and the
 * pessimistic reading is not "every amount at its low": income at its low and
 * spending at its high both push the balance down, so the outlook is about the
 * balance, not about the field.
 */
export type Outlook = 'pessimistic' | 'likely' | 'optimistic';

/**
 * What a line is worth on the day it falls due. The single place an amount can
 * depend on when it happens or on how the guesses are being read; the
 * projection asks this instead of reading `line.amount`.
 */
export function occurrenceAmount(line: Line, date: PlainDate, _outlook: Outlook = 'likely'): Cents {
  const base = line.amount;
  if (!isRecurring(line) || !line.indexation) return base;
  return indexed(base, line.indexation, date);
}

/**
 * Whole anniversaries only: a rise lands on the anniversary of its start date
 * and is not spread across the year, which is how a lease or a premium behaves.
 */
function indexed(amount: Cents, indexation: Indexation, date: PlainDate): Cents {
  const years = anniversaries(indexation.from, date);
  if (years === 0 || indexation.ratePerYear === 0) return amount;
  return scale(amount, (1 + indexation.ratePerYear / 10_000) ** years);
}

function anniversaries(from: PlainDate, date: PlainDate): number {
  if (compareDates(date, from) < 0) return 0;
  const years = Number(date.slice(0, 4)) - Number(from.slice(0, 4));
  const beforeTheDay = date.slice(5) < from.slice(5) ? 1 : 0;
  return Math.max(0, years - beforeTheDay);
}
