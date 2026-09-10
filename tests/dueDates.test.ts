import { describe, expect, it } from 'vitest';
import { plainDate, weekday } from '../src/domain/dates';
import { adjustDueDate, DUE_RULES, type DueRule } from '../src/domain/dueDates';

const noHolidays = () => false;
const closedFor = (...dates: string[]) => (date: string) => dates.includes(date);

/* 2026: the 26th of September is a Saturday, the 27th a Sunday, the 28th a Monday.
   October ends on Saturday the 31st. */
describe('weekday', () => {
  it('numbers the days from Sunday', () => {
    expect(weekday(plainDate('2026-09-27'))).toBe(0);
    expect(weekday(plainDate('2026-09-28'))).toBe(1);
    expect(weekday(plainDate('2026-09-26'))).toBe(6);
  });
});

describe('adjustDueDate', () => {
  it('leaves the date alone by default', () => {
    expect(adjustDueDate(plainDate('2026-09-27'), 'exact', noHolidays)).toBe('2026-09-27');
    expect(adjustDueDate(plainDate('2026-09-27'), undefined, noHolidays)).toBe('2026-09-27');
  });

  it('moves a weekend forward to the next working day', () => {
    expect(adjustDueDate(plainDate('2026-09-26'), 'next-working-day', noHolidays)).toBe('2026-09-28');
    expect(adjustDueDate(plainDate('2026-09-27'), 'next-working-day', noHolidays)).toBe('2026-09-28');
    expect(adjustDueDate(plainDate('2026-09-25'), 'next-working-day', noHolidays)).toBe('2026-09-25');
  });

  it('moves a weekend back to the previous working day', () => {
    expect(adjustDueDate(plainDate('2026-09-27'), 'previous-working-day', noHolidays)).toBe('2026-09-25');
    expect(adjustDueDate(plainDate('2026-09-28'), 'previous-working-day', noHolidays)).toBe('2026-09-28');
  });

  it('steps over a public holiday as well as a weekend', () => {
    // Friday 1 January 2027 is closed, so the weekend and the holiday go together
    expect(adjustDueDate(plainDate('2027-01-01'), 'next-working-day', closedFor('2027-01-01'))).toBe('2027-01-04');
    expect(adjustDueDate(plainDate('2027-01-01'), 'previous-working-day', closedFor('2027-01-01'))).toBe('2026-12-31');
  });

  it('steps over a run of holidays', () => {
    const closed = closedFor('2026-12-25', '2026-12-28', '2026-12-29');
    expect(adjustDueDate(plainDate('2026-12-25'), 'next-working-day', closed)).toBe('2026-12-30');
  });

  it('finds the last working day of the month', () => {
    expect(adjustDueDate(plainDate('2026-09-27'), 'last-working-day', noHolidays)).toBe('2026-09-30');
    // October ends on a Saturday
    expect(adjustDueDate(plainDate('2026-10-05'), 'last-working-day', noHolidays)).toBe('2026-10-30');
    // and if that Friday is closed too
    expect(adjustDueDate(plainDate('2026-10-05'), 'last-working-day', closedFor('2026-10-30'))).toBe('2026-10-29');
  });

  it('gives up rather than looping when nothing is ever a working day', () => {
    const alwaysClosed = () => true;
    expect(adjustDueDate(plainDate('2026-09-27'), 'next-working-day', alwaysClosed)).toBe('2026-09-27');
    expect(adjustDueDate(plainDate('2026-09-27'), 'last-working-day', alwaysClosed)).toBe('2026-09-30');
  });

  it('lists its rules for a picker, each with a name a person would use', () => {
    expect(Object.keys(DUE_RULES)).toEqual(['exact', 'next-working-day', 'previous-working-day', 'last-working-day']);
    for (const rule of Object.keys(DUE_RULES) as DueRule[]) {
      expect(DUE_RULES[rule].label.length).toBeGreaterThan(0);
    }
  });
});

describe('effectiveDueRule', () => {
  it('keeps the rule for a line that falls due monthly or less often', async () => {
    const { effectiveDueRule } = await import('../src/domain/dueDates');
    expect(effectiveDueRule('last-working-day', 'monthly')).toBe('last-working-day');
    expect(effectiveDueRule('last-working-day', 'quarterly')).toBe('last-working-day');
    expect(effectiveDueRule('last-working-day', 'yearly')).toBe('last-working-day');
  });

  it('ignores the last-working-day rule on a weekly line, which it would collapse', () => {
    // Four grocery runs a month all resolving to the 30th is a dip that is not real.
    return import('../src/domain/dueDates').then(({ effectiveDueRule }) => {
      expect(effectiveDueRule('last-working-day', 'weekly')).toBe('exact');
      expect(effectiveDueRule('last-working-day', 'biweekly')).toBe('exact');
    });
  });

  it('leaves the working-day shifts alone at every cadence', async () => {
    const { effectiveDueRule } = await import('../src/domain/dueDates');
    expect(effectiveDueRule('next-working-day', 'weekly')).toBe('next-working-day');
    expect(effectiveDueRule('previous-working-day', 'biweekly')).toBe('previous-working-day');
    expect(effectiveDueRule(undefined, 'weekly')).toBe('exact');
  });

  it('lists which rules a cadence may use, for the picker', async () => {
    const { rulesFor } = await import('../src/domain/dueDates');
    expect(rulesFor('monthly')).toContain('last-working-day');
    expect(rulesFor('weekly')).not.toContain('last-working-day');
  });
});
