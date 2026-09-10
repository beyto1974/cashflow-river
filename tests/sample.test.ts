import { describe, expect, it } from 'vitest';
import { sampleScenario } from '../src/data/sample';
import { decodeScenario, encodeScenario } from '../src/persistence/codec';
import { project } from '../src/domain/forecast';
import { byMonth } from '../src/domain/rollups';
import { euros, formatEUR } from '../src/domain/money';

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
