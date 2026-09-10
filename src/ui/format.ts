/** Display formatting for dates. Money formatting lives with money itself. */
const LONG = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
});
const SHORT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const MONTH_LONG = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const MONTH_SHORT = new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });

function at(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function longDate(date: string): string {
  return LONG.format(at(date));
}
export function shortDate(date: string): string {
  return SHORT.format(at(date));
}
export function longMonth(month: string): string {
  return MONTH_LONG.format(at(`${month}-01`));
}
export function shortMonth(month: string): string {
  return MONTH_SHORT.format(at(`${month}-01`));
}

/** "in 5 months, 21 days", the way someone would say it out loud. */
export function distanceFrom(from: string, to: string): string {
  const days = Math.round((at(to).getTime() - at(from).getTime()) / 86_400_000);
  if (days === 0) return 'today';
  const months = Math.floor(Math.abs(days) / 30.44);
  const rest = Math.round(Math.abs(days) - months * 30.44);
  const parts: string[] = [];
  if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  if (rest > 0 || months === 0) parts.push(`${rest} ${rest === 1 ? 'day' : 'days'}`);
  return days < 0 ? `${parts.join(', ')} ago` : `in ${parts.join(', ')}`;
}
