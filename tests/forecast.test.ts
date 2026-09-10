import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';
import { project } from '../src/domain/forecast';
import type { Scenario } from '../src/domain/types';

function scenario(over: Partial<Scenario> = {}): Scenario {
  return {
    label: 'Test',
    asOf: plainDate('2026-09-10'),
    horizonMonths: 3,
    buffer: euros(500),
    accounts: [
      { id: 'a', name: 'Current', balance: euros(1000), inForecast: true },
      { id: 's', name: 'Savings', balance: euros(9000), inForecast: false }
    ],
    lines: [
      {
        kind: 'recurring', id: 'pay', label: 'Pay', amount: euros(2000),
        category: 'salary', cadence: 'monthly', anchor: plainDate('2026-09-27')
      },
      {
        kind: 'recurring', id: 'rent', label: 'Rent', amount: euros(-1200),
        category: 'housing', cadence: 'monthly', anchor: plainDate('2026-10-01')
      },
      {
        kind: 'planned', id: 'car', label: 'Car repair', amount: euros(-900),
        category: 'transport', date: plainDate('2026-09-20')
      }
    ],
    ...over
  };
}

describe('project', () => {
  it('opens with the accounts that are in the forecast', () => {
    const forecast = project(scenario());
    expect(forecast.opening).toBe(euros(1000));
    expect(forecast.days[0]?.balance).toBe(euros(1000));
  });

  it('runs one day per day to the horizon', () => {
    const forecast = project(scenario());
    expect(forecast.days[0]?.date).toBe('2026-09-10');
    expect(forecast.horizon).toBe('2026-12-10');
    expect(forecast.days.at(-1)?.date).toBe('2026-12-10');
    expect(forecast.days).toHaveLength(92);
  });

  it('books movements on the day they fall and carries the balance', () => {
    const forecast = project(scenario());
    expect(forecast.dayAt(plainDate('2026-09-19'))?.balance).toBe(euros(1000));
    expect(forecast.dayAt(plainDate('2026-09-20'))?.balance).toBe(euros(100));
    expect(forecast.dayAt(plainDate('2026-09-27'))?.balance).toBe(euros(2100));
    expect(forecast.dayAt(plainDate('2026-10-01'))?.balance).toBe(euros(900));
    expect(forecast.dayAt(plainDate('2026-10-01'))?.movements).toEqual([
      { lineId: 'rent', label: 'Rent', amount: euros(-1200), category: 'housing', planned: false, estimate: false }
    ]);
  });

  it('leaves out muted lines', () => {
    const base = scenario();
    const muted = scenario({
      lines: base.lines.map((line) => (line.id === 'car' ? { ...line, muted: true } : line))
    });
    expect(project(muted).dayAt(plainDate('2026-09-20'))?.balance).toBe(euros(1000));
  });

  it('finds the lowest point, the first day under the buffer and the first overdraft', () => {
    const forecast = project(scenario());
    expect(forecast.low.date).toBe('2026-09-20');
    expect(forecast.low.balance).toBe(euros(100));
    expect(forecast.firstUnderBuffer?.date).toBe('2026-09-20');
    expect(forecast.firstNegative).toBeUndefined();

    const deeper = project(scenario({
      lines: [{
        kind: 'planned', id: 'boom', label: 'Boiler', amount: euros(-1500),
        category: 'housing', date: plainDate('2026-09-15')
      }]
    }));
    expect(deeper.firstNegative?.date).toBe('2026-09-15');
    expect(deeper.low.balance).toBe(euros(-500));
  });

  it('ignores lines that fall outside the horizon', () => {
    const outside = project(scenario({
      lines: [{
        kind: 'planned', id: 'later', label: 'Next year', amount: euros(-100),
        category: 'living', date: plainDate('2028-01-01')
      }]
    }));
    expect(outside.days.every((day) => day.movements.length === 0)).toBe(true);
    expect(outside.low.balance).toBe(euros(1000));
  });

  it('is not fooled by a planned item dated before today', () => {
    const past = project(scenario({
      lines: [{
        kind: 'planned', id: 'gone', label: 'Already paid', amount: euros(-100),
        category: 'living', date: plainDate('2026-08-01')
      }]
    }));
    expect(past.days[0]?.movements).toEqual([]);
    expect(past.low.balance).toBe(euros(1000));
  });
});
