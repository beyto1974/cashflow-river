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
