import { plainDate } from '../domain/dates';
import { euros } from '../domain/money';
import type { Scenario } from '../domain/types';

/**
 * The scenario the app opens on, so the first look shows a working forecast
 * rather than an empty shell. Shown as an example throughout, never as the
 * reader's own figures.
 *
 * A two-income household with a mortgage, one car and two children: about €460
 * a month of headroom, which the October property tax and the November pension
 * contribution eat straight through.
 */
export function sampleScenario(): Scenario {
  return {
    label: 'Example household — two incomes, one mortgage',
    asOf: plainDate('2026-09-10'),
    horizonMonths: 30,
    buffer: euros(2500),
    accounts: [
      { id: 'current', name: 'Current account', balance: euros(2410.4), inForecast: true },
      { id: 'joint', name: 'Joint account', balance: euros(1180.15), inForecast: true },
      { id: 'savings', name: 'Savings', balance: euros(9250), inForecast: false }
    ],
    lines: [
      recurring('salary-1', 'Salary — Alex', 2940, 'salary', 'monthly', '2026-09-27'),
      recurring('salary-2', 'Freelance invoices — Sam', 1120, 'salary', 'monthly', '2026-09-15', {
        estimate: true, range: [700, 1500]
      }),
      recurring('child', 'Child benefit', 356.8, 'benefit', 'monthly', '2026-09-08'),
      recurring('holiday-pay', 'Holiday pay', 1890, 'salary', 'yearly', '2027-05-22'),
      recurring('bonus', 'Year-end bonus', 2640, 'salary', 'yearly', '2026-12-18'),

      recurring('mortgage', 'Mortgage', -1142, 'housing', 'monthly', '2026-10-01'),
      recurring('energy', 'Energy — monthly advance', -214, 'housing', 'monthly', '2026-09-15', {
        indexation: { ratePerYear: 500, from: '2027-01-01' }
      }),
      recurring('water', 'Water', -128, 'housing', 'quarterly', '2026-10-05'),
      recurring('telecom', 'Internet + mobile', -78.5, 'housing', 'monthly', '2026-09-20'),
      recurring('kitchen', 'Kitchen renovation loan', -276.4, 'housing', 'monthly', '2026-09-14', { to: '2028-04-14' }),
      recurring('groceries', 'Groceries', -195, 'living', 'weekly', '2026-09-12', {
        estimate: true, range: [-165, -235]
      }),
      recurring('clubs', 'Music school + sports clubs', -145, 'living', 'monthly', '2026-09-16'),
      recurring('household', 'Household + clothing', -220, 'living', 'monthly', '2026-09-22', {
        estimate: true, range: [-140, -330]
      }),
      recurring('leisure', 'Eating out + leisure', -260, 'living', 'monthly', '2026-09-24', {
        estimate: true, range: [-160, -380]
      }),
      recurring('school', 'School + childcare', -340, 'living', 'quarterly', '2026-09-30', {
        indexation: { ratePerYear: 250, from: '2027-09-01' }
      }),
      recurring('subscriptions', 'Subscriptions + gym', -66.98, 'living', 'monthly', '2026-09-18'),
      recurring('fuel', 'Fuel + car upkeep', -180, 'transport', 'monthly', '2026-09-25', {
        estimate: true, range: [-120, -290]
      }),
      recurring('car-insurance', 'Car insurance', -612, 'insurance', 'yearly', '2027-03-04'),
      recurring('home-insurance', 'Home + contents insurance', -486, 'insurance', 'yearly', '2026-11-08', {
        indexation: { ratePerYear: 300, from: '2026-11-08' }
      }),
      recurring('health', 'Health cover', -62.3, 'insurance', 'monthly', '2026-09-11'),
      recurring('property-tax', 'Property tax', -1284, 'tax', 'yearly', '2026-10-28'),
      recurring('pension', 'Pension contribution', -1050, 'saving', 'yearly', '2026-11-24'),
      recurring('to-savings', 'Transfer to savings', -400, 'saving', 'monthly', '2026-09-28'),

      planned('washing-machine', 'Replace the washing machine', -680, 'living', '2026-10-20'),
      planned('trip-deposit', 'Summer trip — deposit', -750, 'travel', '2026-11-15'),
      planned('tax-refund', 'Tax refund', 842, 'tax', '2026-12-05'),
      planned('dental', 'Dental work (own share)', -1450, 'living', '2027-01-12'),
      planned('sell-car', 'Sell the old car', 3400, 'transport', '2027-02-06'),
      planned('trip-balance', 'Summer trip — balance', -1950, 'travel', '2027-03-02'),
      planned('solar', 'Solar panels — own contribution', -4200, 'housing', '2027-06-15')
    ]
  };
}

type Extras = {
  estimate?: boolean;
  /** [low, high] in euros, both carrying the sign of the amount. */
  range?: [number, number];
  from?: string;
  to?: string;
  indexation?: { ratePerYear: number; from: string };
};

function recurring(
  id: string,
  label: string,
  amount: number,
  category: Scenario['lines'][number]['category'],
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly',
  anchor: string,
  extras: Extras = {}
): Scenario['lines'][number] {
  return {
    kind: 'recurring',
    id,
    label,
    amount: euros(amount),
    category,
    cadence,
    anchor: plainDate(anchor),
    ...(extras.estimate ? { estimate: true } : {}),
    ...(extras.range ? { range: { low: euros(extras.range[0]), high: euros(extras.range[1]) } } : {}),
    ...(extras.from ? { from: plainDate(extras.from) } : {}),
    ...(extras.to ? { to: plainDate(extras.to) } : {}),
    ...(extras.indexation
      ? { indexation: { ratePerYear: extras.indexation.ratePerYear, from: plainDate(extras.indexation.from) } }
      : {})
  };
}

function planned(
  id: string,
  label: string,
  amount: number,
  category: Scenario['lines'][number]['category'],
  date: string
): Scenario['lines'][number] {
  return { kind: 'planned', id, label, amount: euros(amount), category, date: plainDate(date) };
}
