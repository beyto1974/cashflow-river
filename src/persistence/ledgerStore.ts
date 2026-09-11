import { decodeScenario, encodeScenario, safeDecodeScenario, SCHEMA_VERSION } from './codec';
import type { LedgerStore, Revision } from './ports';

const INDEX_KEY = 'moraview.ledgers.v1';
/** What the single-ledger build wrote, before ledgers had names. */
const LEGACY_KEY = 'moraview.scenario.v1';
const DEFAULT_NAME = 'My ledger';
/** Edits inside this window replace the last version instead of adding one. */
const COALESCE_MS = 60_000;
const MAX_REVISIONS = 20;

interface Entry {
  name: string;
  /** Storage id, fixed for the life of the ledger. Names can collide; ids cannot. */
  id: string;
}

interface Index {
  current: string;
  entries: Entry[];
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
        const parsed = JSON.parse(raw) as Partial<Index> & { names?: string[] };
        if (Array.isArray(parsed.entries) && parsed.entries.length > 0 && typeof parsed.current === 'string') {
          return { current: parsed.current, entries: parsed.entries };
        }
        /* The first shape keyed storage by a slug of the name. Keep those keys
           working by adopting the slug as the id. */
        if (Array.isArray(parsed.names) && parsed.names.length > 0 && typeof parsed.current === 'string') {
          return {
            current: parsed.current,
            entries: parsed.names.map((name) => ({ name, id: slug(name) }))
          };
        }
      } catch {
        /* fall through to the default */
      }
    }
    return { current: DEFAULT_NAME, entries: [{ name: DEFAULT_NAME, id: slug(DEFAULT_NAME) }] };
  }
  function writeIndex(next: Index): void {
    write(INDEX_KEY, JSON.stringify(next));
  }

  const slug = (name: string): string =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ledger';

  function freshId(taken: Entry[]): string {
    const used = new Set(taken.map((entry) => entry.id));
    for (let attempt = 1; attempt < 1000; attempt += 1) {
      const candidate = `l${attempt}`;
      if (!used.has(candidate)) return candidate;
    }
    return `l${Date.now().toString(36)}`;
  }

  function idOf(name: string): string | undefined {
    return index().entries.find((entry) => entry.name === name)?.id;
  }
  const ledgerKey = (id: string): string => `moraview.ledger.${id}.v1`;
  const historyKey = (id: string): string => `moraview.history.${id}.v1`;

  function revisions(name: string): StoredRevision[] {
    const id = idOf(name);
    if (!id) return [];
    const raw = read(historyKey(id));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as StoredRevision[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * The single-ledger build wrote one scenario under its own key. Adopt it as
   * the default ledger the first time this store runs, so an existing household
   * does not open the app to find the example and its own figures unreachable.
   */
  function migrateLegacy(): void {
    if (read(INDEX_KEY) !== null) return;
    const legacy = read(LEGACY_KEY);
    if (legacy === null) return;
    const id = slug(DEFAULT_NAME);
    writeIndex({ current: DEFAULT_NAME, entries: [{ name: DEFAULT_NAME, id }] });
    write(ledgerKey(id), legacy);
    write(historyKey(id), JSON.stringify([{ revision: 1, savedAt: clock(), document: legacy }]));
  }
  migrateLegacy();

  return {
    names() {
      return index().entries.map((entry) => entry.name);
    },
    current() {
      return index().current;
    },
    select(name) {
      const state = index();
      if (!state.entries.some((entry) => entry.name === name)) return;
      writeIndex({ ...state, current: name });
    },

    load() {
      const id = idOf(index().current);
      return id ? safeDecodeScenario(read(ledgerKey(id))) : null;
    },

    save(scenario) {
      const name = index().current;
      const id = idOf(name);
      if (!id) return;
      const document = encodeScenario(scenario);
      write(ledgerKey(id), document);

      const history = revisions(name);
      const savedAt = clock();
      const last = history[0];
      const coalesce = last !== undefined && Date.parse(savedAt) - Date.parse(last.savedAt) < COALESCE_MS;

      const next: StoredRevision[] = coalesce
        ? [{ revision: last.revision, savedAt, document }, ...history.slice(1)]
        : [{ revision: (last?.revision ?? 0) + 1, savedAt, document }, ...history];

      write(historyKey(id), JSON.stringify(next.slice(0, MAX_REVISIONS)));
    },

    clear() {
      const id = idOf(index().current);
      if (!id) return;
      drop(ledgerKey(id));
      drop(historyKey(id));
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
      if (state.entries.some((entry) => entry.name === trimmed)) return false;

      const id = freshId(state.entries);
      const document = encodeScenario(scenario);
      writeIndex({
        current: trimmed,
        entries: [...state.entries, { name: trimmed, id }].sort((a, b) => a.name.localeCompare(b.name))
      });
      write(ledgerKey(id), document);
      write(historyKey(id), JSON.stringify([{ revision: 1, savedAt: clock(), document }]));
      return true;
    },

    remove(name) {
      const state = index();
      const entry = state.entries.find((candidate) => candidate.name === name);
      if (state.entries.length <= 1 || !entry) return;

      const entries = state.entries.filter((candidate) => candidate.name !== name);
      drop(ledgerKey(entry.id));
      drop(historyKey(entry.id));
      writeIndex({
        current: state.current === name ? (entries[0] as Entry).name : state.current,
        entries
      });
    }
  };
}

/** The schema version this store writes, for anything that needs to report it. */
export const STORE_SCHEMA_VERSION = SCHEMA_VERSION;
