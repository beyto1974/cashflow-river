import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';
import { advanceTo, applyPatch, switchKind } from '../src/domain/scenarioOps';
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

describe('applyPatch', () => {
  const line = scenario().lines[0]!;

  it('changes the fields it is given', () => {
    expect(applyPatch(line, { label: 'Wages', amount: euros(2500) })).toMatchObject({
      label: 'Wages',
      amount: euros(2500)
    });
  });

  it('clears an optional field when the patch says undefined', () => {
    const bounded = { ...line, to: plainDate('2028-01-01'), estimate: true as const };
    const cleared = applyPatch(bounded, { to: undefined, estimate: undefined });
    expect(cleared).not.toHaveProperty('to');
    expect(cleared).not.toHaveProperty('estimate');
  });

  it('leaves the fields it is not given alone', () => {
    const patched = applyPatch({ ...line, estimate: true as const }, { label: 'Pay day' });
    expect(patched).toMatchObject({ estimate: true, cadence: 'monthly' });
  });

  it('does not mutate the line it was given', () => {
    const before = { ...line };
    applyPatch(line, { label: 'Changed' });
    expect(line).toEqual(before);
  });
});

describe('applyPatch keeps a range consistent with its amount', () => {
  const guessed = {
    kind: 'recurring' as const, id: 'food', label: 'Groceries', amount: euros(-195),
    category: 'living' as const, cadence: 'monthly' as const, anchor: plainDate('2026-09-12'),
    estimate: true as const, range: { low: euros(-165), high: euros(-235) }
  };

  it('widens the range when a new amount falls outside it', () => {
    // Typing 400 for a line whose guess spans 165–235 must not leave a range
    // that excludes the amount: the stored scenario would no longer load.
    const patched = applyPatch(guessed, { amount: euros(-400) });
    expect(patched.range).toEqual({ low: euros(-165), high: euros(-400) });
  });

  it('turns the range round with the amount when the direction changes', () => {
    const asIncome = applyPatch(guessed, { amount: euros(195) });
    expect(asIncome.range).toEqual({ low: euros(165), high: euros(235) });
  });

  it('leaves a range that already contains the amount alone', () => {
    expect(applyPatch(guessed, { amount: euros(-200) }).range).toEqual(guessed.range);
  });

  it('widens the modest end too, when the amount is smaller than the whole range', () => {
    const patched = applyPatch(guessed, { amount: euros(-100) });
    expect(patched.range).toEqual({ low: euros(-100), high: euros(-235) });
  });

  it('normalises a range that arrives outside the amount', () => {
    const patched = applyPatch(guessed, { range: { low: euros(-100), high: euros(-150) } });
    expect(patched.range).toEqual({ low: euros(-100), high: euros(-195) });
  });

  it('keeps the range and the payment rule through a change of kind', () => {
    const withRule = { ...guessed, dueRule: 'next-working-day' as const, to: plainDate('2028-01-01') };
    const asPlanned = switchKind(withRule, 'planned', plainDate('2026-09-10'));
    expect(asPlanned).toMatchObject({ kind: 'planned', range: guessed.range, dueRule: 'next-working-day' });
    expect(asPlanned).not.toHaveProperty('to');
    expect(asPlanned).not.toHaveProperty('cadence');
  });
});
