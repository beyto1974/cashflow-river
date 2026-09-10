import { addDays, addMonths, compareDates, daysBetween, plainDate, type PlainDate } from './dates';
import { addCents, type Cents } from './money';
import { occurrences } from './schedule';
import { isRecurring, type Category, type Line, type Scenario } from './types';

/** One line falling due once: what the statement would show that day. */
export interface Movement {
  lineId: string;
  label: string;
  amount: Cents;
  category: Category;
  /** A one-off rather than a recurring line. */
  planned: boolean;
  /** The household is guessing at the amount. */
  estimate: boolean;
}

export interface ForecastDay {
  date: PlainDate;
  /** What the accounts close at that evening. */
  balance: Cents;
  moved: Cents;
  movements: Movement[];
}

export interface Forecast {
  asOf: PlainDate;
  horizon: PlainDate;
  buffer: Cents;
  opening: Cents;
  days: ForecastDay[];
  dayAt(date: PlainDate): ForecastDay | undefined;
  low: ForecastDay;
  firstUnderBuffer: ForecastDay | undefined;
  firstNegative: ForecastDay | undefined;
}

function movementOf(line: Line): Movement {
  return {
    lineId: line.id,
    label: line.label,
    amount: line.amount,
    category: line.category,
    planned: !isRecurring(line),
    estimate: line.estimate === true
  };
}

/** Day-by-day balance from today to the horizon. The one reading everything else derives from. */
export function project(scenario: Scenario): Forecast {
  const asOf = plainDate(scenario.asOf);
  const horizon = addMonths(asOf, Math.max(1, scenario.horizonMonths));
  const window = { from: asOf, to: horizon };

  const booked = new Map<PlainDate, Movement[]>();
  const book = (date: PlainDate, line: Line): void => {
    const already = booked.get(date);
    if (already) already.push(movementOf(line));
    else booked.set(date, [movementOf(line)]);
  };

  for (const line of scenario.lines) {
    if (line.muted) continue;
    if (isRecurring(line)) {
      for (const date of occurrences(line, window)) book(date, line);
    } else if (compareDates(line.date, asOf) >= 0 && compareDates(line.date, horizon) <= 0) {
      book(line.date, line);
    }
  }

  const opening = addCents(
    ...scenario.accounts.filter((account) => account.inForecast).map((account) => account.balance)
  );

  const days: ForecastDay[] = [];
  const index = new Map<PlainDate, ForecastDay>();
  let balance = opening;
  let low: ForecastDay | undefined;
  let firstUnderBuffer: ForecastDay | undefined;
  let firstNegative: ForecastDay | undefined;

  for (let offset = 0; offset <= daysBetween(asOf, horizon); offset += 1) {
    const date = addDays(asOf, offset);
    const movements = booked.get(date) ?? [];
    const moved = addCents(...movements.map((movement) => movement.amount));
    balance += moved;

    const day: ForecastDay = { date, balance, moved, movements };
    days.push(day);
    index.set(date, day);
    if (!low || day.balance < low.balance) low = day;
    if (!firstUnderBuffer && day.balance < scenario.buffer) firstUnderBuffer = day;
    if (!firstNegative && day.balance < 0) firstNegative = day;
  }

  return {
    asOf,
    horizon,
    buffer: scenario.buffer,
    opening,
    days,
    dayAt: (date) => index.get(date),
    low: low as ForecastDay,
    firstUnderBuffer,
    firstNegative
  };
}
