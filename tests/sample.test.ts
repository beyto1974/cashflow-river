import { describe, expect, it } from 'vitest';
import { sampleScenario } from '../src/data/sample';
import { decodeScenario, encodeScenario } from '../src/persistence/codec';
import { project } from '../src/domain/forecast';
import { byMonth } from '../src/domain/rollups';
import { euros, formatEUR } from '../src/domain/money';
import { plainDate } from '../src/domain/dates';

describe('the sample household', () => {
  const scenario = sampleScenario();
  const forecast = project(scenario);

  it('is a valid scenario by its own codec', () => {
    expect(decodeScenario(JSON.parse(encodeScenario(scenario)))).toEqual(scenario);
  });

  it('opens on the two current accounts, not the savings', () => {
    expect(forecast.opening).toBe(euros(3590.55));
  });

  it('has the tension the interface is built to show', () => {
    expect(forecast.firstUnderBuffer?.date).toBe('2026-10-24');
    expect(forecast.firstNegative?.date).toBe('2026-11-24');
    expect(formatEUR(forecast.low.balance)).toBe('-€912.39');
    expect(forecast.low.date).toBe('2026-11-25');
  });

  it('covers 30 months of calendar months', () => {
    expect(byMonth(forecast)).toHaveLength(31); // 30 whole months plus the closing part-month
  });
});

describe('the sample household pays on working days', () => {
  const forecast = project(sampleScenario());

  it('pays the salary before the weekend when the 27th falls on one', () => {
    // 27 September 2026 is a Sunday
    expect(forecast.dayAt(plainDate('2026-09-27'))?.movements.some((m) => m.lineId === 'salary-1')).toBe(false);
    expect(forecast.dayAt(plainDate('2026-09-25'))?.movements.some((m) => m.lineId === 'salary-1')).toBe(true);
  });

  it('takes the mortgage on the next working day when the 1st is a holiday', () => {
    // 1 January 2027 is in the scenario's closed days, and the 2nd and 3rd are a weekend
    expect(forecast.dayAt(plainDate('2027-01-01'))?.movements.some((m) => m.lineId === 'mortgage')).toBe(false);
    expect(forecast.dayAt(plainDate('2027-01-04'))?.movements.some((m) => m.lineId === 'mortgage')).toBe(true);
  });

  it('still has the tension the interface is built to show', () => {
    expect(forecast.firstNegative).toBeDefined();
    expect(forecast.low.balance).toBeLessThan(0);
  });
});
