import { addDays, addMonths, compareDates, daysBetween, plainDate, type PlainDate } from './dates';
import { addCents, type Cents } from './money';
import { occurrenceAmount } from './amounts';
import { adjustDueDate } from './dueDates';
import { occurrences } from './schedule';
import { isRecurring, type Category, type Line, type Scenario } from './types';

/** One line falling due once: what the statement would show that day. */
export interface Movement {
  lineId: string;
  label: string;
  /** The likely amount. */
  amount: Cents;
  /** The ends of the guess: equal to `amount` when the line is not a guess. */
  worst: Cents;
  best: Cents;
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

export interface BandDay {
  date: PlainDate;
  /** The likely balance less the accumulated spread of the guesses. */
  low: Cents;
  high: Cents;
}

export interface BandedForecast {
  likely: Forecast;
  band: BandDay[];
  /** True when at least one line in the forecast carries a range. */
  hasRange: boolean;
  /** Warnings read the low edge: an average case warns nobody. */
  warnings: {
    firstUnderBuffer: { date: PlainDate; balance: Cents } | undefined;
    firstNegative: { date: PlainDate; balance: Cents } | undefined;
    low: { date: PlainDate; balance: Cents };
  };
}

/**
 * The likely projection with a band around it.
 *
 * The band is not "every guess at its worst for thirty months" — that assumes
 * the groceries are dear every single week for two and a half years, and it
 * draws a cone so wide the balance itself is unreadable. Each guessed
 * occurrence is treated as its own independent wobble, so the spreads add in
 * quadrature and the band grows with the square root of the number of guesses.
 */
export function projectBand(scenario: Scenario): BandedForecast {
  const likely = project(scenario);
  let hasRange = false;
  /* Each side keeps its own total, so an off-centre guess — cheap by 40, dear by
     60 — leans the band the way it actually leans. */
  let varianceLow = 0;
  let varianceHigh = 0;

  const band: BandDay[] = likely.days.map((day) => {
    for (const movement of day.movements) {
      const down = Math.abs(movement.worst - movement.amount);
      const up = Math.abs(movement.best - movement.amount);
      if (down > 0 || up > 0) hasRange = true;
      varianceLow += down * down;
      varianceHigh += up * up;
    }
    return {
      date: day.date,
      low: day.balance - Math.round(Math.sqrt(varianceLow)),
      high: day.balance + Math.round(Math.sqrt(varianceHigh))
    };
  });

  const firstUnder = band.find((edge) => edge.low < scenario.buffer);
  const firstNegative = band.find((edge) => edge.low < 0);
  const lowest = band.reduce((worst, edge) => (edge.low < worst.low ? edge : worst), band[0] as BandDay);

  return {
    likely,
    band,
    hasRange,
    warnings: {
      firstUnderBuffer: firstUnder ? { date: firstUnder.date, balance: firstUnder.low } : undefined,
      firstNegative: firstNegative ? { date: firstNegative.date, balance: firstNegative.low } : undefined,
      low: { date: lowest.date, balance: lowest.low }
    }
  };
}

function movementOf(line: Line, date: PlainDate): Movement {
  return {
    lineId: line.id,
    label: line.label,
    amount: occurrenceAmount(line, date, 'likely'),
    worst: occurrenceAmount(line, date, 'pessimistic'),
    best: occurrenceAmount(line, date, 'optimistic'),
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
    const movement = movementOf(line, date);
    const already = booked.get(date);
    if (already) already.push(movement);
    else booked.set(date, [movement]);
  };

  const closed = new Set(scenario.holidays ?? []);
  const isHoliday = (date: PlainDate): boolean => closed.has(date);
  const inside = (date: PlainDate): boolean =>
    compareDates(date, asOf) >= 0 && compareDates(date, horizon) <= 0;

  for (const line of scenario.lines) {
    if (line.muted) continue;
    if (isRecurring(line)) {
      /* The sequence still counts from the anchor; only the day the money moves
         shifts, so a rule can never make the occurrences drift. */
      for (const date of occurrences(line, window)) {
        const due = adjustDueDate(date, line.dueRule, isHoliday);
        if (inside(due)) book(due, line);
      }
    } else if (inside(line.date)) {
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
