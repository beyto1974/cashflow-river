import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';
import { advanceTo, switchKind } from '../src/domain/scenarioOps';
import type { Scenario } from '../src/domain/types';

function scenario(): Scenario {
  return {
    label: 'Test',
    asOf: plainDate('2026-09-10'),
    horizonMonths: 12,
    buffer: euros(500),
    accounts: [
      { id: 'current', name: 'Current', balance: euros(1000), inForecast: true },
      { id: 'savings', name: 'Savings', balance: euros(9000), inForecast: false }
    ],
    lines: [
      {
        kind: 'recurring', id: 'pay', label: 'Pay', amount: euros(2000),
        category: 'salary', cadence: 'monthly', anchor: plainDate('2026-09-27')
      },
      {
        kind: 'planned', id: 'car', label: 'Car repair', amount: euros(-900),
        category: 'transport', date: plainDate('2026-09-20')
      }
    ]
  };
}

describe('advanceTo', () => {
  it('folds everything that has already happened into the balance', () => {
    const rolled = advanceTo(scenario(), plainDate('2026-09-21'));
    expect(rolled.asOf).toBe('2026-09-21');
    expect(rolled.accounts[0]?.balance).toBe(euros(100)); // 1000 - 900
    expect(rolled.lines.map((line) => line.id)).toEqual(['pay']); // the one-off is spent
  });

  it('leaves a movement that falls on the new start date in the future', () => {
    const rolled = advanceTo(scenario(), plainDate('2026-09-20'));
    expect(rolled.accounts[0]?.balance).toBe(euros(1000));
    expect(rolled.lines.some((line) => line.id === 'car')).toBe(true);
  });

  it('counts recurring lines that fell due in between', () => {
    const rolled = advanceTo(scenario(), plainDate('2026-10-01'));
    expect(rolled.accounts[0]?.balance).toBe(euros(2100)); // 1000 - 900 + 2000
  });

  it('does nothing when the date is not later than the scenario start', () => {
    const same = scenario();
    expect(advanceTo(same, plainDate('2026-09-10'))).toBe(same);
    expect(advanceTo(same, plainDate('2026-01-01'))).toBe(same);
  });

  it('folds into the first account inside the forecast and leaves the others alone', () => {
    const rolled = advanceTo(scenario(), plainDate('2026-10-01'));
    expect(rolled.accounts[1]?.balance).toBe(euros(9000));
  });

  it('still moves the start date when no account is inside the forecast', () => {
    const outside = scenario();
    const rolled = advanceTo(
      { ...outside, accounts: outside.accounts.map((account) => ({ ...account, inForecast: false })) },
      plainDate('2026-10-01')
    );
    expect(rolled.asOf).toBe('2026-10-01');
    expect(rolled.accounts.map((account) => account.balance)).toEqual([euros(1000), euros(9000)]);
  });

  it('keeps muted lines out of the fold', () => {
    const base = scenario();
    const muted = { ...base, lines: base.lines.map((line) => ({ ...line, muted: true })) };
    expect(advanceTo(muted, plainDate('2026-10-01')).accounts[0]?.balance).toBe(euros(1000));
  });
});

describe('switchKind', () => {
  const recurringLine = scenario().lines[0]!;
  const plannedLine = scenario().lines[1]!;

  it('drops the fields of the kind it is leaving', () => {
    const bounded = { ...recurringLine, to: plainDate('2028-04-14') };
    const asPlanned = switchKind(bounded, 'planned', plainDate('2026-09-10'));
    expect(asPlanned).toMatchObject({ kind: 'planned', date: '2026-09-27' });
    expect(asPlanned).not.toHaveProperty('cadence');
    expect(asPlanned).not.toHaveProperty('anchor');
    expect(asPlanned).not.toHaveProperty('to');
  });

  it('gives a one-off a cadence and an anchor when it starts repeating', () => {
    const asRecurring = switchKind(plannedLine, 'recurring', plainDate('2026-09-10'));
    expect(asRecurring).toMatchObject({ kind: 'recurring', cadence: 'monthly', anchor: '2026-09-20' });
    expect(asRecurring).not.toHaveProperty('date');
  });

  it('round-trips without leaving anything behind', () => {
    const bounded = { ...recurringLine, to: plainDate('2028-04-14') };
    const there = switchKind(bounded, 'planned', plainDate('2026-09-10'));
    const back = switchKind(there, 'recurring', plainDate('2026-09-10'));
    expect(back).not.toHaveProperty('to');
  });

  it('returns the same line when the kind has not changed', () => {
    expect(switchKind(plannedLine, 'planned', plainDate('2026-09-10'))).toBe(plannedLine);
  });

  it('keeps the shared fields', () => {
    const asPlanned = switchKind({ ...recurringLine, estimate: true }, 'planned', plainDate('2026-09-10'));
    expect(asPlanned).toMatchObject({ id: 'pay', label: 'Pay', amount: euros(2000), category: 'salary', estimate: true });
  });
});
