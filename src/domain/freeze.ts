import type { Scenario } from './types';

/**
 * Freezes a scenario, deeply.
 *
 * The projection is memoised on the scenario object's identity, which is sound
 * only while the object cannot change under it. Freezing turns a write that
 * would have left a permanently stale forecast — `scenario.lines[0].amount = …`
 * — into a TypeError at the line that did it.
 */
export function freezeScenario(scenario: Scenario): Scenario {
  if (Object.isFrozen(scenario)) return scenario;

  for (const account of scenario.accounts) Object.freeze(account);
  Object.freeze(scenario.accounts);

  for (const line of scenario.lines) {
    if (line.range) Object.freeze(line.range);
    if ('indexation' in line && line.indexation) Object.freeze(line.indexation);
    Object.freeze(line);
  }
  Object.freeze(scenario.lines);
  if (scenario.holidays) Object.freeze(scenario.holidays);

  return Object.freeze(scenario);
}
