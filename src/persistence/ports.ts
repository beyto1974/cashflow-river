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

/** One saved version of a ledger. */
export interface Revision {
  revision: number;
  /** ISO timestamp, from whatever clock the store was given. */
  savedAt: string;
}

/**
 * A store that also keeps earlier versions and more than one ledger. The same
 * shape would be implemented by a service or an object store; nothing above it
 * knows which it is talking to.
 */
export interface LedgerStore extends ScenarioStore {
  /** Earlier versions of the ledger now open, newest first. */
  history(): Revision[];
  restore(revision: number): Scenario | null;
  names(): string[];
  current(): string;
  select(name: string): void;
  /** False when the name is taken; the store never overwrites silently. */
  saveAs(name: string, scenario: Scenario): boolean;
  remove(name: string): void;
}
