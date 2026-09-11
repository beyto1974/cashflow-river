import type { Scenario } from './types';

/**
 * Remembers the last few results by scenario identity.
 *
 * The state container replaces the scenario object on every change, so object
 * identity is exactly the right key: the same object means the same ledger, and
 * a changed ledger is a new object. A handful of entries is enough to cover a
 * component reading the same projection several times in one render, and the
 * baseline being compared against on every keystroke.
 */
export function memoiseByScenario<T>(work: (scenario: Scenario) => T, keep = 4): (scenario: Scenario) => T {
  const keys: Scenario[] = [];
  const values = new WeakMap<Scenario, T>();

  return (scenario: Scenario): T => {
    if (values.has(scenario)) return values.get(scenario) as T;

    const value = work(scenario);
    values.set(scenario, value);
    keys.push(scenario);
    /* The WeakMap would let go on its own, but a bounded list of strong keys is
       what makes the eviction predictable — and testable. */
    if (keys.length > keep) {
      const evicted = keys.shift();
      if (evicted) values.delete(evicted);
    }
    return value;
  };
}
