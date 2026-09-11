import { addDays, addMonths, lastDayOfMonth, plainDate, today as todayDate, type PlainDate } from '../domain/dates';
import { euros } from '../domain/money';
import type { Cadence, Category, Line, Scenario } from '../domain/types';
import type { DueRule } from '../domain/dueDates';

/**
 * The scenario the app opens on, so the first look shows a working forecast
 * rather than an empty shell. Shown as an example throughout, never as the
 * reader's own figures.
 *
 * A two-income household with a mortgage, one car and two children: about €460
 * a month of headroom, which the property tax and the pension contribution eat
 * straight through.
 *
 * Its dates are generated from the day it is opened rather than written down, so
 * the story it tells — tight within a couple of months, overdrawn a month after
 * that, recovering the following spring — is the same story whenever somebody
 * looks at it. Opened late in a month the tight patch arrives sooner, exactly as
 * it would for a household whose rent is days away and whose pay is a month
 * off.
 */
export function sampleScenario(today: PlainDate = todayDate()): Scenario {
  /** A day of this month, or of a later one, clamped to the month's length. */
  const dayOfMonth = (day: number, monthsAhead = 0): PlainDate => {
    const base = addMonths(today, monthsAhead);
    const year = Number(base.slice(0, 4));
    const month = Number(base.slice(5, 7));
    const clamped = Math.min(day, lastDayOfMonth(year, month));
    return plainDate(`${base.slice(0, 8)}${String(clamped).padStart(2, '0')}`);
  };
  const inDays = (days: number): PlainDate => addDays(today, days);

  const recurring = (
    id: string,
    label: string,
    amount: number,
    category: Category,
    cadence: Cadence,
    anchor: PlainDate,
    extras: Extras = {}
  ): Line => ({
    kind: 'recurring',
    id,
    label,
    amount: euros(amount),
    category,
    cadence,
    anchor,
    ...(extras.estimate ? { estimate: true } : {}),
    ...(extras.range ? { range: { low: euros(extras.range[0]), high: euros(extras.range[1]) } } : {}),
    ...(extras.to ? { to: extras.to } : {}),
    ...(extras.dueRule ? { dueRule: extras.dueRule } : {}),
    ...(extras.indexation
      ? { indexation: { ratePerYear: extras.indexation.ratePerYear, from: extras.indexation.from } }
      : {})
  });

  const planned = (id: string, label: string, amount: number, category: Category, date: PlainDate): Line => ({
    kind: 'planned',
    id,
    label,
    amount: euros(amount),
    category,
    date
  });

  return {
    label: 'Example household — two incomes, one mortgage',
    asOf: today,
    horizonMonths: 30,
    buffer: euros(2500),
    accounts: [
      { id: 'current', name: 'Current account', balance: euros(2410.4), inForecast: true },
      { id: 'joint', name: 'Joint account', balance: euros(1180.15), inForecast: true },
      { id: 'savings', name: 'Savings', balance: euros(9250), inForecast: false }
    ],
    lines: [
      recurring('salary-1', 'Salary — Alex', 2940, 'salary', 'monthly', dayOfMonth(27), {
        dueRule: 'previous-working-day'
      }),
      recurring('salary-2', 'Freelance invoices — Sam', 1120, 'salary', 'monthly', dayOfMonth(15), {
        estimate: true,
        range: [700, 1500]
      }),
      recurring('child', 'Child benefit', 356.8, 'benefit', 'monthly', dayOfMonth(8)),
      recurring('holiday-pay', 'Holiday pay', 1890, 'salary', 'yearly', inDays(254)),
      recurring('bonus', 'Year-end bonus', 2640, 'salary', 'yearly', inDays(99)),

      recurring('mortgage', 'Mortgage', -1142, 'housing', 'monthly', dayOfMonth(1, 1), {
        dueRule: 'next-working-day'
      }),
      recurring('energy', 'Energy — monthly advance', -214, 'housing', 'monthly', dayOfMonth(15), {
        indexation: { ratePerYear: 500, from: inDays(113) }
      }),
      recurring('water', 'Water', -128, 'housing', 'quarterly', inDays(25)),
      recurring('telecom', 'Internet + mobile', -78.5, 'housing', 'monthly', dayOfMonth(20)),
      recurring('kitchen', 'Kitchen renovation loan', -276.4, 'housing', 'monthly', dayOfMonth(14), {
        to: addMonths(today, 19)
      }),
      recurring('groceries', 'Groceries', -195, 'living', 'weekly', inDays(2), {
        estimate: true,
        range: [-165, -235]
      }),
      recurring('clubs', 'Music school + sports clubs', -145, 'living', 'monthly', dayOfMonth(16)),
      recurring('household', 'Household + clothing', -220, 'living', 'monthly', dayOfMonth(22), {
        estimate: true,
        range: [-140, -330]
      }),
      recurring('leisure', 'Eating out + leisure', -260, 'living', 'monthly', dayOfMonth(24), {
        estimate: true,
        range: [-160, -380]
      }),
      recurring('school', 'School + childcare', -340, 'living', 'quarterly', inDays(20), {
        indexation: { ratePerYear: 250, from: inDays(356) }
      }),
      recurring('subscriptions', 'Subscriptions + gym', -66.98, 'living', 'monthly', dayOfMonth(18)),
      recurring('fuel', 'Fuel + car upkeep', -180, 'transport', 'monthly', dayOfMonth(25), {
        estimate: true,
        range: [-120, -290]
      }),
      recurring('car-insurance', 'Car insurance', -612, 'insurance', 'yearly', inDays(175)),
      recurring('home-insurance', 'Home + contents insurance', -486, 'insurance', 'yearly', inDays(59), {
        indexation: { ratePerYear: 300, from: inDays(59) }
      }),
      recurring('health', 'Health cover', -62.3, 'insurance', 'monthly', dayOfMonth(11)),
      recurring('property-tax', 'Property tax', -1284, 'tax', 'yearly', inDays(48)),
      recurring('pension', 'Pension contribution', -1050, 'saving', 'yearly', inDays(75)),
      recurring('to-savings', 'Transfer to savings', -400, 'saving', 'monthly', dayOfMonth(28), {
        dueRule: 'next-working-day'
      }),

      planned('washing-machine', 'Replace the washing machine', -680, 'living', inDays(40)),
      planned('trip-deposit', 'Summer trip — deposit', -750, 'travel', inDays(66)),
      planned('tax-refund', 'Tax refund', 842, 'tax', inDays(86)),
      planned('dental', 'Dental work (own share)', -1450, 'living', inDays(124)),
      planned('sell-car', 'Sell the old car', 3400, 'transport', inDays(149)),
      planned('trip-balance', 'Summer trip — balance', -1950, 'travel', inDays(173)),
      planned('solar', 'Solar panels — own contribution', -4200, 'housing', inDays(278))
    ],
    holidays: bankHolidays(today, 30)
  };
}

interface Extras {
  dueRule?: DueRule;
  estimate?: boolean;
  /** [low, high] in euros, both carrying the sign of the amount. */
  range?: [number, number];
  to?: PlainDate;
  indexation?: { ratePerYear: number; from: PlainDate };
}

/** Christmas and New Year across the years the forecast covers. */
function bankHolidays(today: PlainDate, months: number): PlainDate[] {
  const firstYear = Number(today.slice(0, 4));
  const lastYear = Number(addMonths(today, months).slice(0, 4));
  const days: PlainDate[] = [];
  for (let year = firstYear; year <= lastYear; year += 1) {
    days.push(plainDate(`${year}-01-01`), plainDate(`${year}-12-25`), plainDate(`${year}-12-26`));
  }
  return days.filter((date) => date >= today);
}

/**
 * A ledger with nothing in it: one account at nothing, no lines, the same
 * horizon. For a household that would rather type its own figures than delete
 * somebody else's.
 */
export function emptyScenario(today: PlainDate = todayDate()): Scenario {
  return {
    label: 'My household',
    asOf: today,
    horizonMonths: 30,
    buffer: euros(1000),
    accounts: [{ id: 'current', name: 'Current account', balance: 0, inForecast: true }],
    lines: [],
    holidays: bankHolidays(today, 30)
  };
}
