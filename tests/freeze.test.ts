import { describe, expect, it } from 'vitest';
import { freezeScenario } from '../src/domain/freeze';
import { tinyScenario } from './fixtures';

describe('freezeScenario', () => {
  const frozen = freezeScenario(tinyScenario());

  it('returns the same object, frozen', () => {
    expect(Object.isFrozen(frozen)).toBe(true);
  });

  it('freezes the accounts and the lines, not just the top level', () => {
    expect(Object.isFrozen(frozen.accounts)).toBe(true);
    expect(Object.isFrozen(frozen.accounts[0])).toBe(true);
    expect(Object.isFrozen(frozen.lines)).toBe(true);
    expect(Object.isFrozen(frozen.lines[0])).toBe(true);
  });

  it('freezes the nested range and indexation objects', () => {
    const withRange = freezeScenario({
      ...tinyScenario(),
      lines: tinyScenario().lines.map((line) =>
        line.id === 'pay' ? { ...line, estimate: true as const, range: { low: 1, high: 2 } } : line
      )
    });
    expect(Object.isFrozen(withRange.lines[0]?.range)).toBe(true);
  });

  it('makes a write fail loudly rather than silently going stale', () => {
    // The projection is memoised on this object's identity, so a write that
    // changed it in place would leave a forecast that never updates again.
    expect(() => {
      (frozen.lines[0] as { amount: number }).amount = 1;
    }).toThrow(TypeError);
    expect(() => {
      (frozen as { label: string }).label = 'changed';
    }).toThrow(TypeError);
  });

  it('leaves an already frozen scenario alone', () => {
    expect(freezeScenario(frozen)).toBe(frozen);
  });
});
