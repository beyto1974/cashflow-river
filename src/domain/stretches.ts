import { daysBetween, type PlainDate } from './dates';
import type { Cents } from './money';
import type { BandedForecast } from './forecast';

/** A run of consecutive days spent below a line. */
export interface Stretch {
  from: PlainDate;
  to: PlainDate;
  days: number;
  deepest: { date: PlainDate; balance: Cents };
  /** How far below the line the deepest day sits. */
  shortfall: Cents;
  /** The stretch is not merely tight: the balance goes below zero in it. */
  overdrawn: boolean;
}

export interface BalancePoint {
  date: PlainDate;
  balance: Cents;
}

/**
 * Groups the days below `threshold` into stretches. A household does not think
 * in "78 days under the buffer" — it thinks in "a bad fortnight in November".
 */
export function stretchesBelow(series: BalancePoint[], threshold: Cents): Stretch[] {
  const found: Stretch[] = [];
  let run: BalancePoint[] = [];

  const close = (): void => {
    if (run.length === 0) return;
    const first = run[0] as BalancePoint;
    const last = run[run.length - 1] as BalancePoint;
    const deepest = run.reduce((worst, point) => (point.balance < worst.balance ? point : worst), first);
    found.push({
      from: first.date,
      to: last.date,
      days: daysBetween(first.date, last.date) + 1,
      deepest: { date: deepest.date, balance: deepest.balance },
      shortfall: threshold - deepest.balance,
      overdrawn: deepest.balance < 0
    });
    run = [];
  };

  for (const point of series) {
    if (point.balance < threshold) run.push(point);
    else close();
  }
  close();
  return found;
}

/** The stretches worth warning about: read from the low edge of the band. */
export function tightStretches(banded: BandedForecast, threshold: Cents): Stretch[] {
  return stretchesBelow(
    banded.band.map((edge) => ({ date: edge.date, balance: edge.low })),
    threshold
  );
}

/**
 * The stretches worth putting on screen: the deepest few, shown in date order.
 * Thirty months of a tight household can hold dozens, and a wall of them says
 * less than the worst handful.
 */
export function worstFirst(stretches: Stretch[], limit: number): Stretch[] {
  if (stretches.length <= limit) return stretches;
  return [...stretches]
    .sort((a, b) => b.shortfall - a.shortfall)
    .slice(0, limit)
    .sort((a, b) => (a.from < b.from ? -1 : 1));
}
