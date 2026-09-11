import { decodeScenario, encodeScenario, safeDecodeScenario, SCHEMA_VERSION } from './codec';
import type { LedgerStore, Revision } from './ports';

const INDEX_KEY = 'moraview.ledgers.v1';
const DEFAULT_NAME = 'My ledger';
/** Edits inside this window replace the last version instead of adding one. */
const COALESCE_MS = 60_000;
const MAX_REVISIONS = 20;

interface Index {
  current: string;
  names: string[];
}

interface StoredRevision extends Revision {
  document: string;
}

/**
 * Named ledgers with a version history, kept in the browser.
 *
 * Every access is guarded: a private window or a browser set to block site data
 * throws on the accessor itself, and that must never break the page — it just
 * means nothing was saved.
 */
export function createLedgerStore(storage: Storage | undefined, clock: () => string = () => new Date().toISOString()): LedgerStore {
  function read(key: string): string | null {
    if (!storage) return null;
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }
  function write(key: string, value: string): void {
    if (!storage) return;
    try {
      storage.setItem(key, value);
    } catch {
      /* out of quota, or storage blocked — the session still works */
    }
  }
  function drop(key: string): void {
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch {
      /* nothing to do */
    }
  }

  function index(): Index {
    const raw = read(INDEX_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Index;
        if (Array.isArray(parsed.names) && parsed.names.length > 0 && typeof parsed.current === 'string') {
          return parsed;
        }
      } catch {
        /* fall through to the default */
      }
    }
    return { current: DEFAULT_NAME, names: [DEFAULT_NAME] };
  }
  function writeIndex(next: Index): void {
    write(INDEX_KEY, JSON.stringify(next));
  }

  const slug = (name: string): string =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ledger';
  const ledgerKey = (name: string): string => `moraview.ledger.${slug(name)}.v1`;
  const historyKey = (name: string): string => `moraview.history.${slug(name)}.v1`;

  function revisions(name: string): StoredRevision[] {
    const raw = read(historyKey(name));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as StoredRevision[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return {
    names() {
      return index().names;
    },
    current() {
      return index().current;
    },
    select(name) {
      const state = index();
      if (!state.names.includes(name)) return;
      writeIndex({ ...state, current: name });
    },

    load() {
      return safeDecodeScenario(read(ledgerKey(index().current)));
    },

    save(scenario) {
      const name = index().current;
      const document = encodeScenario(scenario);
      write(ledgerKey(name), document);

      const history = revisions(name);
      const savedAt = clock();
      const last = history[0];
      const coalesce = last !== undefined && Date.parse(savedAt) - Date.parse(last.savedAt) < COALESCE_MS;

      const next: StoredRevision[] = coalesce
        ? [{ revision: last.revision, savedAt, document }, ...history.slice(1)]
        : [{ revision: (last?.revision ?? 0) + 1, savedAt, document }, ...history];

      write(historyKey(name), JSON.stringify(next.slice(0, MAX_REVISIONS)));
    },

    clear() {
      const name = index().current;
      drop(ledgerKey(name));
      drop(historyKey(name));
    },

    history() {
      return revisions(index().current).map(({ revision, savedAt }) => ({ revision, savedAt }));
    },

    restore(revision) {
      const found = revisions(index().current).find((entry) => entry.revision === revision);
      if (!found) return null;
      try {
        return decodeScenario(JSON.parse(found.document));
      } catch {
        return null;
      }
    },

    saveAs(name, scenario) {
      const trimmed = name.trim();
      if (trimmed === '') return false;
      const state = index();
      if (state.names.includes(trimmed)) return false;

      writeIndex({ current: trimmed, names: [...state.names, trimmed].sort() });
      write(ledgerKey(trimmed), encodeScenario(scenario));
      write(
        historyKey(trimmed),
        JSON.stringify([{ revision: 1, savedAt: clock(), document: encodeScenario(scenario) }])
      );
      return true;
    },

    remove(name) {
      const state = index();
      if (state.names.length <= 1 || !state.names.includes(name)) return;
      const names = state.names.filter((candidate) => candidate !== name);
      drop(ledgerKey(name));
      drop(historyKey(name));
      writeIndex({ current: state.current === name ? (names[0] as string) : state.current, names });
    }
  };
}

/** The schema version this store writes, for anything that needs to report it. */
export const STORE_SCHEMA_VERSION = SCHEMA_VERSION;
