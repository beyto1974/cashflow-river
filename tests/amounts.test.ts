import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';
import { occurrenceAmount } from '../src/domain/amounts';
import type { PlannedLine, RecurringLine } from '../src/domain/types';

const rent: RecurringLine = {
  kind: 'recurring', id: 'rent', label: 'Rent', amount: euros(-1000),
  category: 'housing', cadence: 'monthly', anchor: plainDate('2026-09-01')
};
const wages: PlannedLine = {
  kind: 'planned', id: 'bonus', label: 'Bonus', amount: euros(500),
  category: 'salary', date: plainDate('2026-10-01')
};

describe('occurrenceAmount', () => {
  it('is the line amount when the line has no rules', () => {
    expect(occurrenceAmount(rent, plainDate('2030-01-01'))).toBe(euros(-1000));
    expect(occurrenceAmount(rent, plainDate('2030-01-01'), 'pessimistic')).toBe(euros(-1000));
    expect(occurrenceAmount(wages, plainDate('2026-10-01'), 'optimistic')).toBe(euros(500));
  });
});
