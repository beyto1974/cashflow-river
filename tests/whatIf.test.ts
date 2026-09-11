import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';
import { applyWhatIf, isNeutral, NEUTRAL, type WhatIf } from '../src/domain/whatIf';
import { project } from '../src/domain/forecast';
import type { Scenario } from '../src/domain/types';

function scenario(): Scenario {
  return {
    label: 'Dials', asOf: plainDate('2026-09-10'), horizonMonths: 6, buffer: euros(500),
    accounts: [{ id: 'a', name: 'Current', balance: euros(1000), inForecast: true }],
    lines: [
      {
        kind: 'recurring', id: 'pay', label: 'Pay', amount: euros(2000), category: 'salary',
        cadence: 'monthly', anchor: plainDate('2026-09-27')
      },
      {
        kind: 'recurring', id: 'benefit', label: 'Child benefit', amount: euros(300), category: 'benefit',
        cadence: 'monthly', anchor: plainDate('2026-09-08')
      },
      {
        kind: 'recurring', id: 'food', label: 'Groceries', amount: euros(-200), category: 'living',
        cadence: 'monthly', anchor: plainDate('2026-09-12'), estimate: true,
        range: { low: euros(-160), high: euros(-260) }
      },
      {
        kind: 'recurring', id: 'save', label: 'Savings', amount: euros(-400), category: 'saving',
        cadence: 'monthly', anchor: plainDate('2026-09-28')
      },
      {
        kind: 'recurring', id: 'rent', label: 'Rent', amount: euros(-900), category: 'housing',
        cadence: 'monthly', anchor: plainDate('2026-10-01')
      }
    ]
  };
}

const dials = (over: Partial<WhatIf> = {}): WhatIf => ({ ...NEUTRAL, ...over });

describe('applyWhatIf', () => {
  it('changes nothing at the neutral setting, and says so', () => {
    expect(isNeutral(NEUTRAL)).toBe(true);
    expect(applyWhatIf(scenario(), NEUTRAL)).toEqual(scenario());
  });

  it('scales everything coming in', () => {
    const scaled = applyWhatIf(scenario(), dials({ income: 1.1 }));
    expect(scaled.lines.find((line) => line.id === 'pay')?.amount).toBe(euros(2200));
    expect(scaled.lines.find((line) => line.id === 'benefit')?.amount).toBe(euros(330));
    expect(scaled.lines.find((line) => line.id === 'rent')?.amount).toBe(euros(-900));
  });

  it('scales the day-to-day spending, and its guess with it', () => {
    const scaled = applyWhatIf(scenario(), dials({ daily: 1.25 }));
    const food = scaled.lines.find((line) => line.id === 'food');
    expect(food?.amount).toBe(euros(-250));
    expect(food?.range).toEqual({ low: euros(-200), high: euros(-325) });
  });

  it('sets the transfer to savings to a share of itself', () => {
    // Zeroed to negative zero, which keeps the line pointing outwards: the
    // direction control reads -0 as "goes out", so the line stays a payment.
    const paused = applyWhatIf(scenario(), dials({ saving: 0 })).lines.find((line) => line.id === 'save');
    expect(Object.is(paused?.amount, -0)).toBe(true);
    expect(applyWhatIf(scenario(), dials({ saving: 0.5 })).lines.find((line) => line.id === 'save')?.amount).toBe(
      euros(-200)
    );
  });

  it('leaves the housing, insurance and tax lines where they are', () => {
    const scaled = applyWhatIf(scenario(), dials({ income: 0.5, daily: 2, saving: 0 }));
    expect(scaled.lines.find((line) => line.id === 'rent')?.amount).toBe(euros(-900));
  });

  it('moves the forecast the way the dials point', () => {
    const base = project(scenario()).days.at(-1)!.balance;
    const worse = project(applyWhatIf(scenario(), dials({ income: 0.8 }))).days.at(-1)!.balance;
    const better = project(applyWhatIf(scenario(), dials({ saving: 0 }))).days.at(-1)!.balance;
    expect(worse).toBeLessThan(base);
    expect(better).toBeGreaterThan(base);
  });

  it('is a layer, not an edit: the scenario it was given is untouched', () => {
    const original = scenario();
    const before = JSON.stringify(original);
    applyWhatIf(original, dials({ income: 1.5 }));
    expect(JSON.stringify(original)).toBe(before);
  });
});
