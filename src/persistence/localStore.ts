import type { Scenario } from '../domain/types';
import { encodeScenario, safeDecodeScenario, STORAGE_KEY } from './codec';
import type { ScenarioStore } from './ports';

/**
 * Keeps the scenario in this browser. Every access is guarded: a private window
 * or a browser set to block site data throws on the accessor itself, and that
 * must never break the page — it just means nothing was saved.
 */
export function createLocalStore(storage: Storage | undefined, key = STORAGE_KEY): ScenarioStore {
  return {
    load(): Scenario | null {
      if (!storage) return null;
      try {
        return safeDecodeScenario(storage.getItem(key));
      } catch {
        return null;
      }
    },
    save(scenario: Scenario): void {
      if (!storage) return;
      try {
        storage.setItem(key, encodeScenario(scenario));
      } catch {
        /* out of quota, or storage blocked — the session still works */
      }
    },
    clear(): void {
      if (!storage) return;
      try {
        storage.removeItem(key);
      } catch {
        /* nothing to do */
      }
    }
  };
}
