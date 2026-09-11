import type { Scenario } from '../domain/types';
import { decodeScenario, encodeScenario } from './codec';
import type { LedgerStore } from './ports';

/** The bundle format, separate from the scenario schema inside it. */
export const BUNDLE_VERSION = 1;

export class BundleFormatError extends Error {}

export interface Bundle {
  current: string | undefined;
  ledgers: { name: string; scenario: Scenario }[];
}

/**
 * Every ledger in this browser as one file. A ledger that has never been saved
 * is skipped — there is nothing in it to carry.
 */
export function exportLedgers(store: LedgerStore, clock: () => string = () => new Date().toISOString()): string {
  const open = store.current();
  const ledgers: { name: string; document: unknown }[] = [];

  for (const name of store.names()) {
    store.select(name);
    const scenario = store.load();
    if (scenario) ledgers.push({ name, document: JSON.parse(encodeScenario(scenario)) });
  }
  store.select(open);

  return `${JSON.stringify(
    { moraview: BUNDLE_VERSION, exportedAt: clock(), current: open, ledgers },
    null,
    2
  )}\n`;
}

/** Validates a bundle and hands back what is in it. */
export function readBundle(text: string): Bundle {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BundleFormatError('That file is not a Moraview export — it is not even JSON.');
  }

  if (typeof raw !== 'object' || raw === null || !('moraview' in raw)) {
    throw new BundleFormatError('That file is not a Moraview export.');
  }
  const bundle = raw as { moraview: unknown; current?: unknown; ledgers?: unknown };
  if (typeof bundle.moraview !== 'number' || bundle.moraview > BUNDLE_VERSION) {
    throw new BundleFormatError(
      `That export is from a newer version of Moraview (${String(bundle.moraview)}) than this one understands.`
    );
  }
  if (!Array.isArray(bundle.ledgers)) {
    throw new BundleFormatError('That export has no ledgers in it.');
  }
  if (bundle.ledgers.length === 0) {
    throw new BundleFormatError('That export is empty — there is nothing to import.');
  }

  const ledgers = bundle.ledgers.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new BundleFormatError(`ledgers[${index}] is not a ledger.`);
    }
    const { name, document } = entry as { name?: unknown; document?: unknown };
    if (typeof name !== 'string' || name.trim() === '') {
      throw new BundleFormatError(`ledgers[${index}].name is missing.`);
    }
    /* decodeScenario names the field that is wrong, which is the message worth
       showing: "lines[3].cadence is not a known cadence: fortnightly". */
    return { name: name.trim(), scenario: decodeScenario(document) };
  });

  return { current: typeof bundle.current === 'string' ? bundle.current : undefined, ledgers };
}

export interface ImportResult {
  imported: string[];
}

/**
 * Adds the bundle's ledgers alongside what is already here. Nothing is ever
 * overwritten: a name that is taken comes in suffixed, so an import can always
 * be undone by deleting what it added.
 */
export function importLedgers(store: LedgerStore, text: string): ImportResult {
  const bundle = readBundle(text);
  const imported: string[] = [];
  let openAfter: string | undefined;

  for (const ledger of bundle.ledgers) {
    const taken = store.names();
    let name = ledger.name;

    if (taken.includes(name)) {
      /* An existing name is only reused when there is nothing in it — the empty
         ledger a fresh browser starts with. Anything else gets a new name. */
      store.select(name);
      if (store.load() !== null) name = freeName(taken, ledger.name);
    }

    if (store.names().includes(name)) {
      store.select(name);
      store.save(ledger.scenario);
    } else {
      store.saveAs(name, ledger.scenario);
    }

    imported.push(name);
    if (ledger.name === bundle.current) openAfter = name;
  }

  const landOn = openAfter ?? imported[0];
  if (landOn) store.select(landOn);
  return { imported };
}

function freeName(taken: string[], name: string): string {
  if (!taken.includes(name)) return name;
  const suffixed = `${name} (imported)`;
  if (!taken.includes(suffixed)) return suffixed;
  for (let attempt = 2; attempt < 100; attempt += 1) {
    const numbered = `${name} (imported ${attempt})`;
    if (!taken.includes(numbered)) return numbered;
  }
  return `${name} (imported ${Date.now().toString(36)})`;
}
