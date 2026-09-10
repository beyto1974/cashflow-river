import type { Cents } from './money';
import type { PlainDate } from './dates';

export type Cadence = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

/** Categories are a closed set: they drive the colour bands of the river. */
export const CATEGORIES = [
  'salary', 'benefit', 'housing', 'insurance', 'tax', 'living', 'transport', 'travel', 'saving'
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Account {
  id: string;
  name: string;
  balance: Cents;
  /** A savings pot can be held outside the forecast. */
  inForecast: boolean;
}

interface LineFields {
  id: string;
  label: string;
  /** Signed: income positive, spending negative. */
  amount: Cents;
  category: Category;
  /** The household is guessing at this one — groceries, fuel, leisure. */
  estimate?: boolean;
  /** Kept in the ledger but left out of the forecast. */
  muted?: boolean;
}

/** A yearly rise, in basis points: 200 is 2.00% a year. */
export interface Indexation {
  ratePerYear: number;
  /** Rises land on the anniversaries of this date, and never before it. */
  from: PlainDate;
}

export interface RecurringLine extends LineFields {
  kind: 'recurring';
  cadence: Cadence;
  /** The date the line falls due; every later occurrence is counted from here. */
  anchor: PlainDate;
  from?: PlainDate;
  to?: PlainDate;
  indexation?: Indexation;
}

export interface PlannedLine extends LineFields {
  kind: 'planned';
  date: PlainDate;
}

export type Line = RecurringLine | PlannedLine;

export function isRecurring(line: Line): line is RecurringLine {
  return line.kind === 'recurring';
}
export function isPlanned(line: Line): line is PlannedLine {
  return line.kind === 'planned';
}

export interface Scenario {
  label: string;
  asOf: PlainDate;
  horizonMonths: number;
  /** The floor the household wants to keep in the current accounts. */
  buffer: Cents;
  accounts: Account[];
  lines: Line[];
}

export interface DateWindow {
  from: PlainDate;
  to: PlainDate;
}
