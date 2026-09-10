import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';
import { occurrenceAmount } from '../src/domain/amounts';
import { projectBand } from '../src/domain/forecast';
import type { RecurringLine, Scenario } from '../src/domain/types';

const groceries: RecurringLine = {
  kind: 'recurring', id: 'food', label: 'Groceries', amount: euros(-200),
  category: 'living', cadence: 'monthly', anchor: plainDate('2026-09-15'),
  estimate: true, range: { low: euros(-160), high: euros(-260) }
};
const freelance: RecurringLine = {
  kind: 'recurring', id: 'invoices', label: 'Invoices', amount: euros(1000),
  category: 'salary', cadence: 'monthly', anchor: plainDate('2026-09-20'),
  estimate: true, range: { low: euros(700), high: euros(1500) }
};

function scenario(over: Partial<Scenario> = {}): Scenario {
  return {
    label: 'Guessy', asOf: plainDate('2026-09-10'), horizonMonths: 6, buffer: euros(500),
    /* 700 with a 500 buffer: the likely reading just clears it, the pessimistic
       one does not — which is the whole point of having both. */
    accounts: [{ id: 'a', name: 'Current', balance: euros(700), inForecast: true }],
    lines: [groceries, freelance],
    ...over
  };
}

describe('outlooks read the guesses by their effect on the balance', () => {
  it('takes spending at its high and income at its low when pessimistic', () => {
    expect(occurrenceAmount(groceries, plainDate('2026-09-15'), 'pessimistic')).toBe(euros(-260));
    expect(occurrenceAmount(freelance, plainDate('2026-09-20'), 'pessimistic')).toBe(euros(700));
  });

  it('turns both round when optimistic', () => {
    expect(occurrenceAmount(groceries, plainDate('2026-09-15'), 'optimistic')).toBe(euros(-160));
    expect(occurrenceAmount(freelance, plainDate('2026-09-20'), 'optimistic')).toBe(euros(1500));
  });

  it('uses the likely figure in between', () => {
    expect(occurrenceAmount(groceries, plainDate('2026-09-15'), 'likely')).toBe(euros(-200));
  });

  it('indexes the range as well as the likely amount', () => {
    const rising: RecurringLine = {
      ...groceries,
      indexation: { ratePerYear: 1000, from: plainDate('2026-09-15') }
    };
    expect(occurrenceAmount(rising, plainDate('2027-09-15'), 'pessimistic')).toBe(euros(-286));
  });
});

describe('projectBand', () => {
  it('never crosses the likely line', () => {
    const banded = projectBand(scenario());
    banded.likely.days.forEach((day, index) => {
      const edge = banded.band[index]!;
      expect(edge.date).toBe(day.date);
      expect(edge.low).toBeLessThanOrEqual(day.balance);
      expect(day.balance).toBeLessThanOrEqual(edge.high);
    });
  });

  it('opens at nothing and only widens', () => {
    const banded = projectBand(scenario());
    expect(banded.band[0]!.high - banded.band[0]!.low).toBe(0);
    const widths = banded.band.map((edge) => edge.high - edge.low);
    for (let index = 1; index < widths.length; index += 1) {
      expect(widths[index]!).toBeGreaterThanOrEqual(widths[index - 1]!);
    }
  });

  it('is exactly the spread of one guess after one occurrence', () => {
    const once = scenario({
      horizonMonths: 1,
      lines: [{ ...groceries, cadence: 'yearly' as const }]
    });
    const banded = projectBand(once);
    const edge = banded.band.at(-1)!;
    expect(edge.high - edge.low).toBe(euros(100)); // -160 .. -260 around -200
  });

  it('grows with the square root of the guesses, not their sum', () => {
    // Perfectly bad luck every month running is not the honest reading, so a
    // second guessed occurrence widens the band by √2, not by another whole one.
    const line = { ...groceries, cadence: 'monthly' as const };
    const after = (months: number): number => {
      const banded = projectBand(scenario({ horizonMonths: months, lines: [line] }));
      const edge = banded.band.at(-1)!;
      return edge.high - edge.low;
    };
    expect(after(1)).toBe(euros(100)); // 40 up, 60 down
    expect(after(2) / after(1)).toBeCloseTo(Math.SQRT2, 2);
    expect(after(4) / after(1)).toBeCloseTo(2, 2);
  });

  it('has no width at all when nothing is a guess', () => {
    const certain = scenario({
      lines: scenario().lines.map(({ range: _range, estimate: _estimate, ...line }) => line as RecurringLine)
    });
    const banded = projectBand(certain);
    expect(banded.hasRange).toBe(false);
    expect(banded.band.every((edge) => edge.low === edge.high)).toBe(true);
  });

  it('says it has width when a line carries a range', () => {
    expect(projectBand(scenario()).hasRange).toBe(true);
  });

  it('warns from the low edge, not from the likely line', () => {
    const banded = projectBand(scenario());
    expect(banded.likely.firstUnderBuffer).toBeUndefined();
    expect(banded.warnings.firstUnderBuffer?.date).toBe('2026-09-15');
    expect(banded.warnings.low.balance).toBeLessThan(banded.likely.low.balance);
  });

  it('ignores a range on a muted line', () => {
    const muted = scenario({ lines: scenario().lines.map((line) => ({ ...line, muted: true })) });
    const banded = projectBand(muted);
    expect(banded.hasRange).toBe(false);
    expect(banded.likely.low.balance).toBe(euros(700));
  });
});
