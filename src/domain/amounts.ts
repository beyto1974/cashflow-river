import type { PlainDate } from './dates';
import type { Cents } from './money';
import type { Line } from './types';

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
export function occurrenceAmount(line: Line, _date: PlainDate, _outlook: Outlook = 'likely'): Cents {
  return line.amount;
}
