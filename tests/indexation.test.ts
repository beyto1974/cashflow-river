import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros, scale } from '../src/domain/money';
import { occurrenceAmount } from '../src/domain/amounts';
import { project } from '../src/domain/forecast';
import type { RecurringLine, Scenario } from '../src/domain/types';

function energy(over: Partial<RecurringLine> = {}): RecurringLine {
  return {
    kind: 'recurring', id: 'energy', label: 'Energy', amount: euros(-200),
    category: 'housing', cadence: 'monthly', anchor: plainDate('2026-09-15'),
    indexation: { ratePerYear: 400, from: plainDate('2026-09-15') }, // 4.00% a year
    ...over
  };
}

describe('scale', () => {
  it('multiplies cents and rounds half away from zero', () => {
    expect(scale(euros(-200), 1.04)).toBe(euros(-208));
    expect(scale(1, 1.5)).toBe(2);
    expect(scale(-1, 1.5)).toBe(-2);
    expect(scale(euros(100), 1)).toBe(euros(100));
  });
});

describe('indexation', () => {
  it('leaves the amount alone until the first anniversary', () => {
    expect(occurrenceAmount(energy(), plainDate('2026-09-15'))).toBe(euros(-200));
    expect(occurrenceAmount(energy(), plainDate('2027-09-14'))).toBe(euros(-200));
  });

  it('raises it on the anniversary itself', () => {
    expect(occurrenceAmount(energy(), plainDate('2027-09-15'))).toBe(euros(-208));
  });

  it('compounds rather than adding the rate again', () => {
    // 200 × 1.04³ = 224.97, not 224
    expect(occurrenceAmount(energy(), plainDate('2029-09-15'))).toBe(euros(-224.97));
  });

  it('raises income the same way', () => {
    const salary = energy({ id: 'pay', amount: euros(3000), category: 'salary' });
    expect(occurrenceAmount(salary, plainDate('2027-09-15'))).toBe(euros(3120));
  });

  it('counts anniversaries of the rise date, not of the anchor', () => {
    const line = energy({ indexation: { ratePerYear: 400, from: plainDate('2027-01-01') } });
    expect(occurrenceAmount(line, plainDate('2027-12-31'))).toBe(euros(-200));
    expect(occurrenceAmount(line, plainDate('2028-01-01'))).toBe(euros(-208));
  });

  it('ignores dates before the rise even starts', () => {
    const line = energy({ indexation: { ratePerYear: 400, from: plainDate('2030-01-01') } });
    expect(occurrenceAmount(line, plainDate('2027-09-15'))).toBe(euros(-200));
  });

  it('is a no-op at nought per cent', () => {
    const line = energy({ indexation: { ratePerYear: 0, from: plainDate('2026-09-15') } });
    expect(occurrenceAmount(line, plainDate('2031-09-15'))).toBe(euros(-200));
  });

  it('turns over on the anniversary of a month-end rise date', () => {
    const line = energy({ anchor: plainDate('2026-01-31'), indexation: { ratePerYear: 1000, from: plainDate('2026-01-31') } });
    expect(occurrenceAmount(line, plainDate('2027-01-30'))).toBe(euros(-200));
    expect(occurrenceAmount(line, plainDate('2027-01-31'))).toBe(euros(-220));
    // February's occurrence is clamped to the 28th, and is still after the rise
    expect(occurrenceAmount(line, plainDate('2027-02-28'))).toBe(euros(-220));
  });

  it('shows up in the projection over a long horizon', () => {
    const scenario: Scenario = {
      label: 'Indexed', asOf: plainDate('2026-09-10'), horizonMonths: 24, buffer: 0,
      accounts: [{ id: 'a', name: 'Current', balance: euros(10_000), inForecast: true }],
      lines: [energy()]
    };
    const forecast = project(scenario);
    const before = forecast.dayAt(plainDate('2027-09-15'))!.movements[0]!.amount;
    const after = forecast.dayAt(plainDate('2027-10-15'))!.movements[0]!.amount;
    expect(before).toBe(euros(-208));
    expect(after).toBe(euros(-208));
  });
});
