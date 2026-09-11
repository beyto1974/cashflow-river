import type { PlainDate } from './dates';

/**
 * Wording shared by the sentences the domain writes — the summary and the fix
 * descriptions. Kept here so both say a date the same way.
 */
const LONG_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
});

export function longDate(date: PlainDate): string {
  return LONG_DATE.format(new Date(`${date}T00:00:00Z`));
}

export function days(count: number): string {
  return `${count} ${count === 1 ? 'day' : 'days'}`;
}

export function weeks(count: number): string {
  return `${count} ${count === 1 ? 'week' : 'weeks'}`;
}
