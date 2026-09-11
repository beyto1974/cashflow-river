import { describe, expect, it, vi } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';
import { memoiseByScenario } from '../src/domain/memo';
import type { Scenario } from '../src/domain/types';

const scenario = (): Scenario => ({
  label: 'Memo', asOf: plainDate('2026-09-10'), horizonMonths: 3, buffer: euros(500),
  accounts: [{ id: 'a', name: 'Current', balance: euros(1000), inForecast: true }],
  lines: []
});

describe('memoiseByScenario', () => {
  it('runs once for the same scenario object', () => {
    const work = vi.fn((input: Scenario) => input.label.length);
    const memoised = memoiseByScenario(work);
    const input = scenario();

    expect(memoised(input)).toBe(4);
    expect(memoised(input)).toBe(4);
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('runs again for a new scenario object', () => {
    const work = vi.fn((input: Scenario) => input.horizonMonths);
    const memoised = memoiseByScenario(work);

    memoised(scenario());
    memoised(scenario());
    expect(work).toHaveBeenCalledTimes(2);
  });

  it('keeps a handful of recent results, not one', () => {
    const work = vi.fn((input: Scenario) => input.horizonMonths);
    const memoised = memoiseByScenario(work);
    const first = scenario();
    const second = { ...scenario(), horizonMonths: 6 };

    memoised(first);
    memoised(second);
    memoised(first);
    expect(work).toHaveBeenCalledTimes(2);
  });

  it('does not hold every scenario it has ever seen', () => {
    const work = vi.fn((input: Scenario) => input.horizonMonths);
    const memoised = memoiseByScenario(work, 2);
    const a = scenario();
    const b = { ...scenario(), horizonMonths: 6 };
    const c = { ...scenario(), horizonMonths: 9 };

    memoised(a);
    memoised(b);
    memoised(c);
    memoised(a); // pushed out by c
    expect(work).toHaveBeenCalledTimes(4);
  });
});
