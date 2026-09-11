import { describe, expect, it } from 'vitest';
import { euros } from '../src/domain/money';
import { plainDate } from '../src/domain/dates';
import { CADENCES, cadenceKeys, occurrences, perMonth } from '../src/domain/schedule';
import type { RecurringLine } from '../src/domain/types';

function line(over: Partial<RecurringLine> = {}): RecurringLine {
  return {
    kind: 'recurring',
    id: 'test',
    label: 'Test line',
    amount: euros(-100),
    category: 'living',
    cadence: 'monthly',
    anchor: plainDate('2026-09-15'),
    ...over
  };
}
const window = (from: string, to: string) => ({ from: plainDate(from), to: plainDate(to) });

describe('occurrences', () => {
  it('walks monthly from the anchor', () => {
    expect(occurrences(line(), window('2026-09-01', '2026-12-31'))).toEqual([
      '2026-09-15', '2026-10-15', '2026-11-15', '2026-12-15'
    ]);
  });

  it('keeps the anchor day of month instead of drifting after a short month', () => {
    const monthEnd = line({ anchor: plainDate('2026-01-31') });
    expect(occurrences(monthEnd, window('2026-01-01', '2026-04-30'))).toEqual([
      '2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'
    ]);
  });

  it('starts inside the window when the anchor is in the past', () => {
    const old = line({ anchor: plainDate('2019-03-05') });
    expect(occurrences(old, window('2026-09-10', '2026-11-30'))).toEqual([
      '2026-10-05', '2026-11-05'
    ]);
  });

  it('handles every cadence', () => {
    expect(occurrences(line({ cadence: 'weekly', anchor: plainDate('2026-09-12') }), window('2026-09-10', '2026-10-05')))
      .toEqual(['2026-09-12', '2026-09-19', '2026-09-26', '2026-10-03']);
    expect(occurrences(line({ cadence: 'biweekly', anchor: plainDate('2026-09-12') }), window('2026-09-10', '2026-10-15')))
      .toEqual(['2026-09-12', '2026-09-26', '2026-10-10']);
    expect(occurrences(line({ cadence: 'quarterly', anchor: plainDate('2026-10-05') }), window('2026-09-10', '2027-05-01')))
      .toEqual(['2026-10-05', '2027-01-05', '2027-04-05']);
    expect(occurrences(line({ cadence: 'yearly', anchor: plainDate('2027-03-04') }), window('2026-09-10', '2029-01-01')))
      .toEqual(['2027-03-04', '2028-03-04']);
  });

  it('respects the first and last date of a line', () => {
    const bounded = line({ from: plainDate('2026-10-01'), to: plainDate('2026-11-30') });
    expect(occurrences(bounded, window('2026-09-01', '2027-01-31'))).toEqual(['2026-10-15', '2026-11-15']);
  });

  it('returns nothing when the line has not started or has ended', () => {
    expect(occurrences(line({ from: plainDate('2030-01-01') }), window('2026-09-01', '2027-01-01'))).toEqual([]);
    expect(occurrences(line({ to: plainDate('2020-01-01') }), window('2026-09-01', '2027-01-01'))).toEqual([]);
    expect(occurrences(line({ anchor: plainDate('2030-05-05') }), window('2026-09-01', '2027-01-01'))).toEqual([]);
  });

  it('is empty for a backwards window', () => {
    expect(occurrences(line(), window('2027-01-01', '2026-01-01'))).toEqual([]);
  });
});

describe('cadence registry', () => {
  it('lists every cadence with a label and a monthly rate', () => {
    expect(cadenceKeys()).toEqual(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']);
    for (const key of cadenceKeys()) {
      expect(CADENCES[key].label.length).toBeGreaterThan(0);
      expect(CADENCES[key].perMonth).toBeGreaterThan(0);
    }
  });

  it('averages an amount to a month', () => {
    // 365.25 / 12 / 7 weeks in an average month, not the rounder 52 / 12.
    expect(perMonth(euros(-195), 'weekly')).toBe(euros(-847.9));
    expect(perMonth(euros(-1050), 'yearly')).toBe(euros(-87.5));
    expect(perMonth(euros(-340), 'quarterly')).toBe(euros(-113.33));
  });
});

describe('a line that repeats a fixed number of times', () => {
  it('stops after the count, wherever the window is', () => {
    const sixTimes = line({ times: 6, anchor: plainDate('2026-09-15') });
    expect(occurrences(sixTimes, window('2026-09-01', '2028-01-01'))).toEqual([
      '2026-09-15', '2026-10-15', '2026-11-15', '2026-12-15', '2027-01-15', '2027-02-15'
    ]);
  });

  it('counts from the anchor, not from the window', () => {
    const sixTimes = line({ times: 6, anchor: plainDate('2026-09-15') });
    expect(occurrences(sixTimes, window('2026-12-01', '2028-01-01'))).toEqual([
      '2026-12-15', '2027-01-15', '2027-02-15'
    ]);
  });

  it('is nothing at all for a count of zero', () => {
    expect(occurrences(line({ times: 0 }), window('2026-09-01', '2027-09-01'))).toEqual([]);
  });

  it('works with the day-based cadences too', () => {
    const threeWeeks = line({ cadence: 'weekly', anchor: plainDate('2026-09-12'), times: 3 });
    expect(occurrences(threeWeeks, window('2026-09-01', '2027-01-01'))).toEqual([
      '2026-09-12', '2026-09-19', '2026-09-26'
    ]);
  });

  it('honours an end date that comes first', () => {
    const bounded = line({ times: 10, anchor: plainDate('2026-09-15'), to: plainDate('2026-11-30') });
    expect(occurrences(bounded, window('2026-09-01', '2028-01-01'))).toHaveLength(3);
  });
});

describe('lastOccurrence', () => {
  it('is the last of a counted run', async () => {
    const { lastOccurrence } = await import('../src/domain/schedule');
    expect(lastOccurrence(line({ times: 6, anchor: plainDate('2026-09-15') }))).toBe('2027-02-15');
  });

  it('is the end date when there is one', async () => {
    const { lastOccurrence } = await import('../src/domain/schedule');
    expect(lastOccurrence(line({ to: plainDate('2028-04-14') }))).toBe('2028-04-14');
  });

  it('is the earlier of the two when a line has both', async () => {
    const { lastOccurrence } = await import('../src/domain/schedule');
    expect(lastOccurrence(line({ times: 60, anchor: plainDate('2026-09-15'), to: plainDate('2027-01-01') })))
      .toBe('2027-01-01');
  });

  it('is nothing for a line that never stops', async () => {
    const { lastOccurrence } = await import('../src/domain/schedule');
    expect(lastOccurrence(line())).toBeUndefined();
  });
});
