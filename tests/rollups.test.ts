import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';
import { project } from '../src/domain/forecast';
import { byMonth, monthlyRhythm, movementsBetween } from '../src/domain/rollups';
import type { Scenario } from '../src/domain/types';

const base: Scenario = {
  label: 'Test',
  asOf: plainDate('2026-09-10'),
  horizonMonths: 2,
  buffer: euros(500),
  accounts: [{ id: 'a', name: 'Current', balance: euros(1000), inForecast: true }],
  lines: [
    {
      kind: 'recurring', id: 'pay', label: 'Pay', amount: euros(2000),
      category: 'salary', cadence: 'monthly', anchor: plainDate('2026-09-27')
    },
    {
      kind: 'recurring', id: 'food', label: 'Groceries', amount: euros(-100),
      category: 'living', cadence: 'weekly', anchor: plainDate('2026-09-12'), estimate: true
    },
    {
      kind: 'planned', id: 'car', label: 'Car repair', amount: euros(-900),
      category: 'transport', date: plainDate('2026-09-20')
    }
  ]
};

describe('byMonth', () => {
  const months = byMonth(project(base));

  it('summarises each calendar month in the horizon', () => {
    expect(months.map((month) => month.month)).toEqual(['2026-09', '2026-10', '2026-11']);
  });

  it('splits in from out and ends where the days end', () => {
    const september = months[0]!;
    expect(september.inflow).toBe(euros(2000));
    expect(september.outflow).toBe(euros(-1200)); // three grocery runs plus the car
    expect(september.net).toBe(euros(800));
    expect(september.end).toBe(euros(1800));
    expect(september.low).toBe(euros(-200)); // after the fourth grocery run, before pay day
    expect(september.daysUnderBuffer).toBeGreaterThan(0);
  });

  it('counts a movement once and only in its own month', () => {
    const all = months.flatMap((month) => month.movements);
    expect(all.filter((movement) => movement.lineId === 'car')).toHaveLength(1);
    expect(months[1]!.movements.every((movement) => movement.date.startsWith('2026-10'))).toBe(true);
  });
});

describe('movementsBetween', () => {
  const forecast = project(base);

  it('groups by line, biggest absolute first, and excludes the opening day', () => {
    const breakdown = movementsBetween(forecast, plainDate('2026-09-10'), plainDate('2026-09-30'));
    expect(breakdown.lines.map((line) => line.label)).toEqual(['Pay', 'Car repair', 'Groceries']);
    expect(breakdown.lines[2]).toMatchObject({ label: 'Groceries', count: 3, amount: euros(-300) });
    expect(breakdown.inflow).toBe(euros(2000));
    expect(breakdown.outflow).toBe(euros(-1200));
    expect(breakdown.total).toBe(euros(800));
  });

  it('is empty over a window with nothing in it', () => {
    const quiet = movementsBetween(forecast, plainDate('2026-09-10'), plainDate('2026-09-11'));
    expect(quiet.lines).toEqual([]);
    expect(quiet.total).toBe(0);
  });
});

describe('monthlyRhythm', () => {
  it('averages the recurring lines and leaves the one-offs out', () => {
    const rhythm = monthlyRhythm(base);
    expect(rhythm.inflow).toBe(euros(2000));
    expect(rhythm.outflow).toBe(euros(-434.82)); // 100 a week
    expect(rhythm.net).toBe(euros(1565.18));
  });

  it('leaves out muted lines', () => {
    const rhythm = monthlyRhythm({
      ...base,
      lines: base.lines.map((line) => (line.id === 'food' ? { ...line, muted: true } : line))
    });
    expect(rhythm.outflow).toBe(0);
  });
});

describe('part-months', () => {
  it('marks the first month when the forecast starts inside it', () => {
    const months = byMonth(project(base)); // starts 10 September
    expect(months[0]).toMatchObject({ month: '2026-09', partial: true });
  });

  it('marks the closing month when the horizon falls inside it', () => {
    const months = byMonth(project(base)); // two months from 10 September
    expect(months.at(-1)).toMatchObject({ month: '2026-11', partial: true });
  });

  it('leaves the whole months in between alone', () => {
    const months = byMonth(project({ ...base, horizonMonths: 6 }));
    expect(months.slice(1, -1).every((month) => month.partial)).toBe(false);
    expect(months[2]?.partial).toBe(false);
  });

  it('does not mark a closing month that runs to its own last day', () => {
    const toMonthEnd = byMonth(project({ ...base, asOf: plainDate('2026-09-01'), horizonMonths: 1 }));
    expect(toMonthEnd[0]?.partial).toBe(false);
  });
});
