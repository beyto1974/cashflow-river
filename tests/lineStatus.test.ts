import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';
import { lineStatus, isCounted } from '../src/domain/lineStatus';
import type { PlannedLine, RecurringLine } from '../src/domain/types';

const asOf = plainDate('2026-09-10');

function recurring(over: Partial<RecurringLine> = {}): RecurringLine {
  return {
    kind: 'recurring', id: 'loan', label: 'Loan', amount: euros(-276.4),
    category: 'housing', cadence: 'monthly', anchor: plainDate('2026-09-14'),
    ...over
  };
}
function planned(over: Partial<PlannedLine> = {}): PlannedLine {
  return {
    kind: 'planned', id: 'tyres', label: 'Tyres', amount: euros(-320),
    category: 'transport', date: plainDate('2026-11-01'),
    ...over
  };
}

describe('lineStatus', () => {
  it('is active for a line that is running now', () => {
    expect(lineStatus(recurring(), asOf)).toBe('active');
    expect(lineStatus(planned(), asOf)).toBe('active');
  });

  it('is ended once a recurring line is past its last date', () => {
    expect(lineStatus(recurring({ to: plainDate('2026-09-09') }), asOf)).toBe('ended');
    expect(lineStatus(recurring({ to: plainDate('2026-09-10') }), asOf)).toBe('active');
    expect(lineStatus(recurring({ to: plainDate('2028-04-14') }), asOf)).toBe('active');
  });

  it('is ended for a one-off whose date has gone by', () => {
    expect(lineStatus(planned({ date: plainDate('2026-09-09') }), asOf)).toBe('ended');
    expect(lineStatus(planned({ date: plainDate('2026-09-10') }), asOf)).toBe('active');
  });

  it('says when a line has not started yet', () => {
    expect(lineStatus(recurring({ from: plainDate('2027-01-01') }), asOf)).toBe('starts-later');
  });

  it('reports a muted line as muted, whatever its dates', () => {
    expect(lineStatus(recurring({ muted: true }), asOf)).toBe('muted');
    expect(lineStatus(recurring({ muted: true, to: plainDate('2020-01-01') }), asOf)).toBe('muted');
  });

  it('counts only the lines that still put money through the forecast', () => {
    expect(isCounted(recurring(), asOf)).toBe(true);
    expect(isCounted(recurring({ from: plainDate('2027-01-01') }), asOf)).toBe(true);
    expect(isCounted(recurring({ to: plainDate('2026-01-01') }), asOf)).toBe(false);
    expect(isCounted(recurring({ muted: true }), asOf)).toBe(false);
  });
});
