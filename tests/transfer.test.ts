import { beforeEach, describe, expect, it } from 'vitest';
import { createLedgerStore } from '../src/persistence/ledgerStore';
import { BUNDLE_VERSION, exportLedgers, importLedgers, readBundle } from '../src/persistence/transfer';
import { tinyScenario } from './fixtures';
import { euros } from '../src/domain/money';

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value)
  };
}

describe('export and import', () => {
  let storage: Storage;
  const clock = () => '2026-09-11T10:00:00.000Z';
  const store = () => createLedgerStore(storage, clock);

  beforeEach(() => {
    storage = fakeStorage();
  });

  it('writes every ledger, and says which one was open', () => {
    const ledgers = store();
    ledgers.save(tinyScenario({ label: 'household' }));
    ledgers.saveAs('Variant', tinyScenario({ label: 'variant' }));

    const bundle = JSON.parse(exportLedgers(ledgers, clock));
    expect(bundle.moraview).toBe(BUNDLE_VERSION);
    expect(bundle.exportedAt).toBe('2026-09-11T10:00:00.000Z');
    expect(bundle.current).toBe('Variant');
    expect(bundle.ledgers.map((entry: { name: string }) => entry.name)).toEqual(['My ledger', 'Variant']);
  });

  it('skips a ledger that has never been saved', () => {
    const bundle = JSON.parse(exportLedgers(store(), clock));
    expect(bundle.ledgers).toEqual([]);
  });

  it('comes back the way it went out', () => {
    const first = store();
    first.save(tinyScenario({ label: 'household', buffer: euros(1234) }));
    first.saveAs('Variant', tinyScenario({ label: 'variant' }));
    const text = exportLedgers(first, clock);

    storage = fakeStorage();
    const second = store();
    const result = importLedgers(second, text);

    expect(result.imported).toEqual(['My ledger', 'Variant']);
    expect(second.names()).toEqual(['My ledger', 'Variant']);
    second.select('My ledger');
    expect(second.load()).toMatchObject({ label: 'household', buffer: euros(1234) });
    second.select('Variant');
    expect(second.load()?.label).toBe('variant');
  });

  it('opens the ledger the bundle had open', () => {
    const first = store();
    first.save(tinyScenario({ label: 'household' }));
    first.saveAs('Variant', tinyScenario({ label: 'variant' }));
    const text = exportLedgers(first, clock);

    storage = fakeStorage();
    const second = store();
    importLedgers(second, text);
    expect(second.current()).toBe('Variant');
  });

  it('never overwrites a ledger that is already there', () => {
    const ledgers = store();
    ledgers.save(tinyScenario({ label: 'mine' }));
    const text = exportLedgers(ledgers, clock);

    const result = importLedgers(ledgers, text);
    expect(result.imported).toEqual(['My ledger (imported)']);
    expect(ledgers.names()).toEqual(['My ledger', 'My ledger (imported)']);
    ledgers.select('My ledger');
    expect(ledgers.load()?.label).toBe('mine');
  });

  it('numbers a name that has already been imported once', () => {
    const ledgers = store();
    ledgers.save(tinyScenario());
    const text = exportLedgers(ledgers, clock);
    importLedgers(ledgers, text);
    const second = importLedgers(ledgers, text);
    expect(second.imported).toEqual(['My ledger (imported 2)']);
  });

  it('says what is wrong with a file that is not a bundle', () => {
    expect(() => readBundle('nonsense')).toThrow(/not a Moraview/i);
    expect(() => readBundle(JSON.stringify({ ledgers: [] }))).toThrow(/not a Moraview/i);
    expect(() => readBundle(JSON.stringify({ moraview: 99, ledgers: [] }))).toThrow(/newer/i);
    expect(() => readBundle(JSON.stringify({ moraview: 1 }))).toThrow(/ledgers/i);
    expect(() =>
      readBundle(JSON.stringify({ moraview: 1, ledgers: [{ name: 'x', document: { schemaVersion: 1, scenario: {} } }] }))
    ).toThrow(/horizonMonths|label|asOf|accounts/);
  });

  it('refuses a bundle with nothing in it rather than wiping the screen', () => {
    expect(() => readBundle(JSON.stringify({ moraview: 1, ledgers: [] }))).toThrow(/empty/i);
  });

  it('reads a bundle with one ledger and no current named', () => {
    const ledgers = store();
    ledgers.save(tinyScenario({ label: 'solo' }));
    const text = exportLedgers(ledgers, clock);
    const bundle = JSON.parse(text);
    delete bundle.current;

    storage = fakeStorage();
    const fresh = store();
    expect(importLedgers(fresh, JSON.stringify(bundle)).imported).toEqual(['My ledger']);
    expect(fresh.current()).toBe('My ledger');
  });
});
