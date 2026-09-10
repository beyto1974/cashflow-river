import type { Scenario } from '../domain/types';

/**
 * Where a scenario is kept. Only the browser adapter exists today; a remote one
 * (object storage, a service) can be added without the app knowing, which is
 * why the app depends on this and never on localStorage directly.
 */
export interface ScenarioStore {
  load(): Scenario | null;
  save(scenario: Scenario): void;
  clear(): void;
}
