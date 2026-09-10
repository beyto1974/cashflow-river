import { plainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';
import type { Scenario } from '../src/domain/types';

export function tinyScenario(over: Partial<Scenario> = {}): Scenario {
  return {
    label: 'Tiny',
    asOf: plainDate('2026-09-10'),
    horizonMonths: 6,
    buffer: euros(1000),
    accounts: [{ id: 'a', name: 'Current', balance: euros(1500), inForecast: true }],
    lines: [
      {
        kind: 'recurring', id: 'pay', label: 'Salary', amount: euros(2500),
        category: 'salary', cadence: 'monthly', anchor: plainDate('2026-09-27')
      },
      {
        kind: 'planned', id: 'fix', label: 'Boiler service', amount: euros(-190),
        category: 'housing', date: plainDate('2026-10-02')
      }
    ],
    ...over
  };
}
