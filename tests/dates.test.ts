import { describe, expect, it } from 'vitest';
import {
  addDays, addMonths, compareDates, daysBetween, isPlainDate, lastDayOfMonth,
  monthKey, plainDate, today
} from '../src/domain/dates';

describe('dates are UTC-midnight ISO strings', () => {
  it('validates the shape', () => {
    expect(isPlainDate('2026-09-10')).toBe(true);
    expect(isPlainDate('2026-9-10')).toBe(false);
    expect(isPlainDate('2026-02-30')).toBe(false);
    expect(() => plainDate('nope')).toThrow();
  });

  it('adds days across month and year ends', () => {
    expect(addDays(plainDate('2026-09-30'), 1)).toBe('2026-10-01');
    expect(addDays(plainDate('2026-12-31'), 1)).toBe('2027-01-01');
    expect(addDays(plainDate('2027-01-01'), -1)).toBe('2026-12-31');
  });

  it('clamps the day of month when the target month is shorter', () => {
    expect(addMonths(plainDate('2026-01-31'), 1)).toBe('2026-02-28');
    expect(addMonths(plainDate('2028-01-31'), 1)).toBe('2028-02-29');
    expect(addMonths(plainDate('2026-08-31'), 1)).toBe('2026-09-30');
    expect(addMonths(plainDate('2026-12-15'), 3)).toBe('2027-03-15');
    expect(addMonths(plainDate('2026-03-15'), -3)).toBe('2025-12-15');
  });

  it('survives a leap day', () => {
    expect(addDays(plainDate('2028-02-28'), 1)).toBe('2028-02-29');
    expect(lastDayOfMonth(2028, 2)).toBe(29);
    expect(lastDayOfMonth(2026, 2)).toBe(28);
  });

  it('counts and compares', () => {
    expect(daysBetween(plainDate('2026-09-10'), plainDate('2026-09-11'))).toBe(1);
    expect(daysBetween(plainDate('2026-09-10'), plainDate('2027-09-10'))).toBe(365);
    expect(compareDates(plainDate('2026-09-10'), plainDate('2026-09-11'))).toBeLessThan(0);
    expect(monthKey(plainDate('2026-09-10'))).toBe('2026-09');
  });

  it('reports today as a plain date', () => {
    expect(isPlainDate(today())).toBe(true);
  });
});
