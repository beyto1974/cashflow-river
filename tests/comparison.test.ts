import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';
import { compare } from '../src/domain/comparison';
import type { Scenario } from '../src/domain/types';

function base(over: Partial<Scenario> = {}): Scenario {
  return {
    label: 'Base', asOf: plainDate('2026-09-10'), horizonMonths: 4, buffer: euros(500),
    accounts: [{ id: 'a', name: 'Current', balance: euros(2000), inForecast: true }],
    lines: [
      {
        kind: 'recurring', id: 'pay', label: 'Pay', amount: euros(2000), category: 'salary',
        cadence: 'monthly', anchor: plainDate('2026-09-27')
      },
      {
        kind: 'recurring', id: 'rent', label: 'Rent', amount: euros(-900), category: 'housing',
        cadence: 'monthly', anchor: plainDate('2026-10-01')
      }
    ],
    ...over
  };
}

describe('compare', () => {
  it('is flat when the two scenarios are the same', () => {
    const comparison = compare(base(), base());
    expect(comparison.months.every((month) => month.delta === 0)).toBe(true);
    expect(comparison.endDelta).toBe(0);
    expect(comparison.verdict).toMatch(/no different/i);
  });

  it('says how much better off the variant leaves you, month by month', () => {
    const variant = base({
      lines: [...base().lines, {
        kind: 'planned', id: 'sell', label: 'Sell the car', amount: euros(3000),
        category: 'transport', date: plainDate('2026-10-15')
      }]
    });
    const comparison = compare(base(), variant);
    expect(comparison.months[0]?.delta).toBe(0); // September, before the sale
    expect(comparison.months[1]?.delta).toBe(euros(3000));
    expect(comparison.endDelta).toBe(euros(3000));
    expect(comparison.verdict).toMatch(/better off/);
  });

  it('says the same the other way round', () => {
    const worse = base({ accounts: [{ id: 'a', name: 'Current', balance: euros(500), inForecast: true }] });
    const comparison = compare(base(), worse);
    expect(comparison.endDelta).toBe(euros(-1500));
    expect(comparison.verdict).toMatch(/worse off/);
  });

  it('compares only the window both forecasts cover', () => {
    const longer = base({ horizonMonths: 8 });
    const comparison = compare(base(), longer);
    expect(comparison.days).toHaveLength(comparison.baseline.days.length);
    expect(comparison.to).toBe(comparison.baseline.days.at(-1)?.date);
    expect(comparison.clipped).toBe(true);
  });

  it('does not credit a longer horizon with months the change never touched', () => {
    const longer = base({ horizonMonths: 30 });
    const comparison = compare(base(), longer);
    expect(comparison.endDelta).toBe(0);
    expect(comparison.verdict).toMatch(/no different/i);
  });

  it('pairs by date when the two sides start on different days', () => {
    const later = base({ asOf: plainDate('2026-10-01') });
    const comparison = compare(base(), later);
    expect(comparison.from).toBe('2026-10-01');
    expect(comparison.days.every((day) => day.date >= '2026-10-01')).toBe(true);
    expect(comparison.clipped).toBe(true);
  });

  it('reports the tightest point of each side', () => {
    const variant = base({
      lines: [...base().lines, {
        kind: 'planned', id: 'boiler', label: 'Boiler', amount: euros(-2500),
        category: 'housing', date: plainDate('2026-09-20')
      }]
    });
    const comparison = compare(base(), variant);
    expect(comparison.variantLow.balance).toBeLessThan(comparison.baselineLow.balance);
    expect(comparison.variantLow.date).toBe('2026-09-20');
  });
});
