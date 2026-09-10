import { compareDates, monthKey, type MonthKey, type PlainDate } from './dates';
import type { Cents } from './money';
import { perMonth } from './schedule';
import { isRecurring, type Category, type Scenario } from './types';
import type { Forecast, Movement } from './forecast';

export interface DatedMovement extends Movement {
  date: PlainDate;
}

export interface MonthSummary {
  month: MonthKey;
  inflow: Cents;
  outflow: Cents;
  net: Cents;
  /** Where the balance stands on the last day of the month in the horizon. */
  end: Cents;
  low: Cents;
  daysUnderBuffer: number;
  movements: DatedMovement[];
}

/** Calendar-month rollup of a projection. */
export function byMonth(forecast: Forecast): MonthSummary[] {
  const months: MonthSummary[] = [];
  let current: MonthSummary | undefined;

  for (const day of forecast.days) {
    const key = monthKey(day.date);
    if (!current || current.month !== key) {
      current = {
        month: key, inflow: 0, outflow: 0, net: 0,
        end: day.balance, low: day.balance, daysUnderBuffer: 0, movements: []
      };
      months.push(current);
    }
    for (const movement of day.movements) {
      if (movement.amount >= 0) current.inflow += movement.amount;
      else current.outflow += movement.amount;
      current.movements.push({ ...movement, date: day.date });
    }
    current.end = day.balance;
    if (day.balance < current.low) current.low = day.balance;
    if (day.balance < forecast.buffer) current.daysUnderBuffer += 1;
    current.net = current.inflow + current.outflow;
  }
  return months;
}

export interface BreakdownLine {
  lineId: string;
  label: string;
  category: Category;
  planned: boolean;
  count: number;
  amount: Cents;
}

export interface Breakdown {
  lines: BreakdownLine[];
  inflow: Cents;
  outflow: Cents;
  total: Cents;
}

/**
 * Everything that moves after `from` and up to and including `to`, grouped by
 * line and ordered by weight — the answer to "what did this to me".
 */
export function movementsBetween(forecast: Forecast, from: PlainDate, to: PlainDate): Breakdown {
  const grouped = new Map<string, BreakdownLine>();

  for (const day of forecast.days) {
    if (compareDates(day.date, from) <= 0 || compareDates(day.date, to) > 0) continue;
    for (const movement of day.movements) {
      const found = grouped.get(movement.lineId);
      if (found) {
        found.count += 1;
        found.amount += movement.amount;
      } else {
        grouped.set(movement.lineId, {
          lineId: movement.lineId,
          label: movement.label,
          category: movement.category,
          planned: movement.planned,
          count: 1,
          amount: movement.amount
        });
      }
    }
  }

  const lines = [...grouped.values()].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  return {
    lines,
    inflow: lines.reduce((sum, line) => sum + Math.max(line.amount, 0), 0),
    outflow: lines.reduce((sum, line) => sum + Math.min(line.amount, 0), 0),
    total: lines.reduce((sum, line) => sum + line.amount, 0)
  };
}

export interface Rhythm {
  inflow: Cents;
  outflow: Cents;
  net: Cents;
}

/** What an average month looks like from the recurring lines alone. */
export function monthlyRhythm(scenario: Scenario): Rhythm {
  let inflow = 0;
  let outflow = 0;
  for (const line of scenario.lines) {
    if (line.muted || !isRecurring(line)) continue;
    const monthly = perMonth(line.amount, line.cadence);
    if (monthly >= 0) inflow += monthly;
    else outflow += monthly;
  }
  return { inflow, outflow, net: inflow + outflow };
}
