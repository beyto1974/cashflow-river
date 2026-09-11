import { describe, expect, it } from 'vitest';
import { formatSpec } from '../src/persistence/formatSpec';
import { CATEGORIES } from '../src/domain/types';
import { cadenceKeys } from '../src/domain/schedule';
import { DUE_RULES } from '../src/domain/dueDates';
import { readBundle } from '../src/persistence/transfer';
import { BUNDLE_VERSION } from '../src/persistence/transfer';

describe('formatSpec', () => {
  const spec = formatSpec();

  it('names every cadence, category and payment-day rule the code accepts', () => {
    for (const cadence of cadenceKeys()) expect(spec.text).toContain(cadence);
    for (const category of CATEGORIES) expect(spec.text).toContain(category);
    for (const rule of Object.keys(DUE_RULES)) expect(spec.text).toContain(rule);
  });

  it('states the two conventions that are easy to get wrong', () => {
    expect(spec.text).toMatch(/cents/i);
    expect(spec.text).toMatch(/YYYY-MM-DD/);
    expect(spec.text).toMatch(/negative/i);
  });

  it('carries the versions a generated file has to declare', () => {
    expect(spec.text).toContain(`"moraview": ${BUNDLE_VERSION}`);
  });

  it('ships an example that this app can actually import', () => {
    expect(() => readBundle(spec.example)).not.toThrow();
    const bundle = readBundle(spec.example);
    expect(bundle.ledgers[0]?.scenario.lines.length).toBeGreaterThan(2);
  });

  it('shows every kind of line in the example: recurring, one-off, guessed, rising, shifted', () => {
    const lines = readBundle(spec.example).ledgers[0]!.scenario.lines;
    expect(lines.some((line) => line.kind === 'recurring')).toBe(true);
    expect(lines.some((line) => line.kind === 'planned')).toBe(true);
    expect(lines.some((line) => line.range !== undefined)).toBe(true);
    expect(lines.some((line) => line.kind === 'recurring' && line.indexation)).toBe(true);
    expect(lines.some((line) => line.kind === 'recurring' && line.dueRule)).toBe(true);
  });
});
